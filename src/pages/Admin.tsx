import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { Product, Invoice, Stats, AppSettings } from "../types";
import {
  Plus, Edit2, Trash2, Package, FileText,
  BarChart3, RefreshCcw, Search, ChevronRight,
  ArrowLeft, Trash, Save, X, Lock, Settings, Download, Image as ImageIcon,
  ShoppingCart, TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

export default function Admin() {
  return (
    <div className="flex flex-col md:flex-row gap-8">
      <aside className="w-full md:w-64 flex-shrink-0">
        <nav className="space-y-1">
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-600 hover:bg-white hover:text-red-600 transition-all">
            <BarChart3 size={20} /> Overview
          </Link>
          <Link to="/admin/products" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-600 hover:bg-white hover:text-red-600 transition-all">
            <Package size={20} /> Products
          </Link>
          <Link to="/admin/invoices" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-600 hover:bg-white hover:text-red-600 transition-all">
            <FileText size={20} /> Orders
          </Link>
          <Link to="/admin/trash" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-600 hover:bg-white hover:text-red-600 transition-all">
            <Trash size={20} /> Trash
          </Link>
          <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-600 hover:bg-white hover:text-red-600 transition-all">
            <Settings size={20} /> Settings
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem("isAdmin");
              window.location.href = "/login";
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-stone-600 hover:bg-white hover:text-red-600 transition-all mt-2 border-t border-stone-100 pt-2"
          >
            <Lock size={20} /> Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/products" element={<ProductManagement />} />
          <Route path="/invoices" element={<InvoiceManagement />} />
          <Route path="/trash" element={<TrashManagement />} />
          <Route path="/settings" element={<SettingsManagement />} />
        </Routes>
      </main>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios.get("/api/stats")
      .then(res => setStats(res.data))
      .catch(err => {
        console.error("Stats fetch error:", err);
        setError("Unable to fetch statistics. Please check your database connection.");
      });
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 p-8 rounded-3xl text-center">
        <Lock className="mx-auto text-red-600 mb-4" size={48} />
        <h3 className="text-xl font-bold text-red-900 mb-2">Database Connection Error</h3>
        <p className="text-stone-600">{error}</p>
        <p className="text-stone-500 text-sm mt-4 italic">Follow the TiDB Setup Guide to connect your database.</p>
      </div>
    );
  }

  if (!stats) return (
    <div className="flex items-center justify-center p-12">
      <RefreshCcw className="animate-spin text-stone-300" size={48} />
    </div>
  );

  const cards = [
    { label: "Today's Sales", value: `₹${stats.todayRevenue}`, icon: TrendingUp, color: "bg-red-50 text-red-600" },
    { label: "Today's Orders", value: stats.todayOrders, icon: ShoppingCart, color: "bg-blue-50 text-blue-600" },
    { label: "Total Revenue", value: `₹${stats.totalRevenue}`, icon: BarChart3, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Orders", value: stats.totalOrders, icon: FileText, color: "bg-purple-50 text-purple-600" },
    { label: "Total Products", value: stats.totalProducts, icon: Package, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map(card => (
          <div key={card.label} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl ${card.color} flex items-center justify-center mb-4`}>
              <card.icon size={24} />
            </div>
            <div className="text-stone-500 text-sm font-medium mb-1">{card.label}</div>
            <div className="text-2xl font-bold text-stone-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <h3 className="text-xl font-bold text-stone-900 mb-6">Recent Activity</h3>
        <p className="text-stone-500 italic">No recent activity to display.</p>
      </div>
    </div>
  );
}

function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  }, [products]);
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = filterCategory === "All" || p.category === filterCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || p.product_name.toLowerCase().includes(q) || p.product_serial_no.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, filterCategory, searchQuery]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      if (editingProduct.id) {
        await axios.put(`/api/products/${editingProduct.id}`, editingProduct);
      } else {
        await axios.post("/api/products", editingProduct);
      }
      fetchProducts();
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      console.error("Save error:", err);
      let msg = err.response?.data?.error || "Error saving product";
      if (msg.includes("Duplicate entry") && msg.includes("product_serial_no")) {
        msg = "A product with this Serial No already exists. Please use a unique Serial No.";
      }
      alert(msg);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      await axios.delete(`/api/products/${id}`);
      fetchProducts();
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      try {
        const res = await axios.post("/api/products/bulk-delete", { ids: selectedIds });
        fetchProducts();
        setSelectedIds([]);
        alert(`Successfully deleted ${res.data.deletedCount || selectedIds.length} products`);
      } catch (err: any) {
        const msg = err.response?.data?.error || err.message || "Unknown error";
        alert(`Error deleting products: ${msg}`);
      }
    }
  };

  // Determine if there is a configuration error
  const isConfigError = products.length === 0 && (products as any).error?.includes("ENOTFOUND");

  return (
    <div className="space-y-6">
      {isConfigError && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl flex flex-col gap-3">
          <div className="flex items-center gap-3 text-red-600 font-bold text-lg">
            <Lock size={24} /> Configuration Required
          </div>
          <p className="text-stone-600">
            It looks like your database connection is not set up correctly. The system is still trying to connect to <strong>your_tidb_host</strong>.
          </p>
          <div className="p-4 bg-white rounded-2xl border border-red-100 font-mono text-sm text-stone-700">
            1. Open the file <strong>.env</strong> in your project folder.<br/>
            2. Update <strong>TIDB_HOST</strong>, <strong>TIDB_USER</strong>, etc., with your actual details.<br/>
            3. Restart the server.
          </div>
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-stone-900">Products</h2>
          {selectedIds.length > 0 && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleBulkDelete}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 transition-all"
            >
              <Trash2 size={18} /> Delete Selected ({selectedIds.length})
            </motion.button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer">
            <RefreshCcw size={20} /> Bulk Upload CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (event) => {
                  try {
                    const text = event.target?.result as string;
                    const lines = text.split('\n').filter(l => l.trim() !== '');
                    const productsToUpload = lines.slice(1).map(line => {
                      // Robust CSV parsing handling quoted fields
                      const regex = /(?:^|,)(?:"([^"]*(?:""[^"]*)*)"|([^",]*))/g;
                      const matches = [];
                      let match;
                      while ((match = regex.exec(line)) !== null) {
                        matches.push((match[1] || match[2] || "").trim());
                      }
                      
                      const [product_name, product_serial_no, category, regular_price, sale_price, product_image] = matches;
                      
                      const cleanPrice = (val: string) => {
                        if (!val) return 0;
                        return parseFloat(val.replace(/[^\d.]/g, '')) || 0;
                      };

                      const regPrice = cleanPrice(regular_price);
                      const sPrice = cleanPrice(sale_price);

                      return {
                        product_name: product_name?.replace(/^"|"$/g, '').trim(),
                        product_serial_no: product_serial_no?.trim(),
                        category: category || 'General',
                        regular_price: regPrice,
                        sale_price: sPrice > 0 ? sPrice : regPrice,
                        product_image: product_image || ''
                      };
                    }).filter(p => p.product_name && p.product_serial_no);

                    if (productsToUpload.length === 0) {
                      alert("No valid products found in CSV. Please ensure the CSV is correctly formatted.");
                      return;
                    }

                    await axios.post("/api/products/bulk", productsToUpload);
                    alert(`Successfully imported ${productsToUpload.length} products`);
                    fetchProducts();
                  } catch (err: any) {
                    console.error("Bulk upload error:", err);
                    const errorMsg = err.response?.data?.error || err.message || "Unknown error";
                    alert(`Error during bulk upload: ${errorMsg}`);
                  }
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={() => { setEditingProduct({}); setIsModalOpen(true); }}
            className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
          >
            <Plus size={20} /> Add Product
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name or serial no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-stone-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none text-sm font-medium text-stone-700 bg-white"
        >
          <option value="All">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {(filterCategory !== "All" || searchQuery) && (
          <button
            onClick={() => { setFilterCategory("All"); setSearchQuery(""); }}
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-medium text-stone-500 hover:text-red-600 hover:border-red-300 transition-all flex items-center gap-1"
          >
            <X size={14} /> Clear
          </button>
        )}
        <span className="text-xs text-stone-400 ml-1">{filteredProducts.length} of {products.length} products</span>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 w-10">
                <input 
                  type="checkbox" 
                  checked={filteredProducts.length > 0 && selectedIds.length === filteredProducts.length}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Serial No</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">No products found</td>
              </tr>
            ) : filteredProducts.map(product => (
              <tr key={product.id} className={`hover:bg-stone-50/50 transition-colors ${selectedIds.includes(product.id) ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(product.id)}
                    onChange={() => toggleSelect(product.id)}
                    className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img 
                      src={product.product_image || "https://placehold.co/100x100?text=No+Image"} 
                      className="w-10 h-10 rounded-lg object-cover bg-stone-100" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=No+Image";
                      }}
                    />
                    <span className="font-semibold text-stone-900">{product.product_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-stone-600 font-mono text-sm">{product.product_serial_no}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded-md text-xs font-bold">{product.category}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-stone-900 font-bold">₹{product.sale_price}</div>
                  <div className="text-stone-400 text-xs line-through">₹{product.regular_price}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditingProduct(product); setIsModalOpen(true); }}
                      className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
              <form onSubmit={handleSave}>
                <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-stone-900">{editingProduct?.id ? "Edit Product" : "Add Product"}</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Product Name</label>
                    <input
                      required
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                      value={editingProduct?.product_name || ""}
                      onChange={e => setEditingProduct(prev => ({ ...prev, product_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Serial No</label>
                      <input
                        required
                        className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        value={editingProduct?.product_serial_no || ""}
                        onChange={e => setEditingProduct(prev => ({ ...prev, product_serial_no: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Category</label>
                      <div className="relative group/cat">
                        <input
                          className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none pr-10"
                          value={editingProduct?.category || ""}
                          placeholder="Select or type new category"
                          onChange={e => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                        />
                        <select 
                          className="absolute right-0 top-0 bottom-0 w-10 opacity-0 cursor-pointer"
                          onChange={(e) => setEditingProduct(prev => ({ ...prev, category: e.target.value }))}
                          value=""
                        >
                          <option value="" disabled>Select Category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 group-hover/cat:text-red-500 transition-colors">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Regular Price</label>
                      <input
                        type="number"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        value={editingProduct?.regular_price || ""}
                        onChange={e => setEditingProduct(prev => ({ ...prev, regular_price: parseFloat(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Sale Price</label>
                      <input
                        type="number"
                        required
                        className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                        value={editingProduct?.sale_price || ""}
                        onChange={e => setEditingProduct(prev => ({ ...prev, sale_price: parseFloat(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Product Image</label>
                    <div className="flex gap-4">
                      <label className="flex-1 px-4 py-8 rounded-xl border-2 border-dashed border-stone-200 hover:border-red-500 transition-all flex flex-col items-center justify-center cursor-pointer text-stone-500 bg-stone-50 group">
                        <ImageIcon size={24} className="mb-2 group-hover:text-red-500 transition-colors" />
                        <span className="text-sm font-medium">Click to upload image</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => setEditingProduct(prev => ({ ...prev!, product_image: event.target?.result as string }));
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {editingProduct?.product_image && (
                        <div className="w-24 h-24 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center relative group">
                          <img 
                            src={editingProduct.product_image} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Error";
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => setEditingProduct(prev => ({ ...prev!, product_image: "" }))} 
                            className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white transition-all"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-all">Cancel</button>
                  <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2">
                    <Save size={20} /> Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InvoiceManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Invoice> | null>(null);
  const [indianStates] = useState([
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ]);

  useEffect(() => {
    fetchInvoices();
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await axios.get("/api/settings");
    setSettings(res.data);
  };

  const fetchInvoices = async () => {
    const res = await axios.get("/api/invoices");
    setInvoices(res.data);
  };

  const fetchProducts = async () => {
    const res = await axios.get("/api/products");
    setProducts(res.data);
  };

  const viewDetails = async (id: number) => {
    const res = await axios.get(`/api/invoices/${id}`);
    setSelectedInvoice(res.data);
  };

  const handleEdit = async (id: number) => {
    const res = await axios.get(`/api/invoices/${id}`);
    const inv = res.data;
    setEditingOrder({
      ...inv,
      items: inv.items.map((item: any) => ({
        ...item,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }))
    });
    setIsModalOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      if (editingOrder.id) {
        await axios.put(`/api/invoices/${editingOrder.id}`, editingOrder);
      } else {
        await axios.post("/api/invoices", editingOrder);
      }
      fetchInvoices();
      setIsModalOpen(false);
      setEditingOrder(null);
    } catch (err) {
      alert("Error saving order");
    }
  };

  const moveToTrash = async (id: number) => {
    if (confirm("Move this order to trash?")) {
      await axios.put(`/api/invoices/${id}/trash`, { restore: false });
      fetchInvoices();
    }
  };

  const addItem = () => {
    setEditingOrder(prev => ({
      ...prev!,
      items: [...(prev?.items || []), { product_id: products[0]?.id, quantity: 1, price: products[0]?.sale_price }]
    }));
  };

  const removeItem = (index: number) => {
    setEditingOrder(prev => ({
      ...prev!,
      items: prev?.items?.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setEditingOrder(prev => {
      const newItems = [...(prev?.items || [])];
      if (field === 'product_id') {
        const prod = products.find(p => p.id === parseInt(value));
        newItems[index] = { ...newItems[index], product_id: parseInt(value), price: prod?.sale_price || 0 };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
      return { ...prev!, items: newItems };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-900">Orders</h2>
        <button
          onClick={() => { setEditingOrder({ state: "Tamil Nadu", items: [] }); setIsModalOpen(true); }}
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus size={20} /> Create Order
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {invoices.map(inv => (
              <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-6 py-4 font-mono text-sm text-stone-600">#{settings?.invoice_prefix || 'ORD'}-{inv.id.toString().padStart(parseInt(settings?.invoice_number_digits || "4"), '0')}</td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-stone-900">{inv.first_name} {inv.last_name}</div>
                  <div className="text-stone-400 text-xs">{inv.city}, {inv.state}</div>
                </td>
                <td className="px-6 py-4 text-stone-600 text-sm">{inv.date ? format(new Date(inv.date), "MMM dd, yyyy HH:mm") : "N/A"}</td>
                <td className="px-6 py-4 font-bold text-stone-900">₹{parseFloat((inv.total_amount || 0).toString()).toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => viewDetails(inv.id)} className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View/Print">
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={async () => {
                        const res = await axios.get(`/api/invoices/${inv.id}`);
                        setSelectedInvoice(res.data);
                        // We'll let the modal open and the user click download, 
                        // or we could try to automate it, but opening the modal is safer for rendering.
                      }}
                      className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button onClick={() => handleEdit(inv.id)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Edit">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => moveToTrash(inv.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              <form onSubmit={handleSaveOrder}>
                <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-stone-900">{editingOrder?.id ? "Edit Order" : "Create Order"}</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">First Name</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none" value={editingOrder?.first_name || ""} onChange={e => setEditingOrder(prev => ({ ...prev!, first_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Last Name</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none" value={editingOrder?.last_name || ""} onChange={e => setEditingOrder(prev => ({ ...prev!, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Address</label>
                    <input required className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none" value={editingOrder?.address || ""} onChange={e => setEditingOrder(prev => ({ ...prev!, address: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">City</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none" value={editingOrder?.city || ""} onChange={e => setEditingOrder(prev => ({ ...prev!, city: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">State</label>
                      <select className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none bg-white" value={editingOrder?.state || ""} onChange={e => setEditingOrder(prev => ({ ...prev!, state: e.target.value }))}>
                        {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Phone Number</label>
                      <input required className="w-full px-4 py-2 rounded-xl border border-stone-200 outline-none" value={editingOrder?.phone_number || ""} onChange={e => setEditingOrder(prev => ({ ...prev!, phone_number: e.target.value }))} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-stone-900">Order Items</h3>
                      <button type="button" onClick={addItem} className="text-red-600 text-sm font-bold flex items-center gap-1 hover:underline">
                        <Plus size={16} /> Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editingOrder?.items?.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-end bg-stone-50 p-3 rounded-xl">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Product</label>
                            <select className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-sm bg-white" value={item.product_id} onChange={e => updateItem(idx, 'product_id', e.target.value)}>
                              {products.map(p => <option key={p.id} value={p.id}>{p.product_name} (₹{p.sale_price})</option>)}
                            </select>
                          </div>
                          <div className="w-20">
                            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Qty</label>
                            <input type="number" className="w-full px-3 py-1.5 rounded-lg border border-stone-200 text-sm" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))} />
                          </div>
                          <button type="button" onClick={() => removeItem(idx)} className="p-2 text-stone-400 hover:text-red-600">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-all">Cancel</button>
                  <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2">
                    <Save size={20} /> Save Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedInvoice(null)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-6 right-6 p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-all print:hidden z-10"
                title="Close"
              >
                <X size={24} />
              </button>
              <div className="flex-1 overflow-auto max-h-[85vh] bg-stone-100 p-2 sm:p-4 md:p-8">
                <div 
                  className="bg-stone-100 origin-top transition-transform duration-300 transform scale-[0.45] xs:scale-[0.55] sm:scale-[0.75] md:scale-[0.85] lg:scale-100 mx-auto" 
                  style={{ width: '210mm' }}
                  id="printable-invoice"
                >
                  {(() => {
                    const ITEMS_PER_PAGE = 30;
                    const items = selectedInvoice.items || [];
                    const chunks = items.length > 0 ? Array.from({ length: Math.ceil(items.length / ITEMS_PER_PAGE) }, (_, i) =>
                      items.slice(i * ITEMS_PER_PAGE, i * ITEMS_PER_PAGE + ITEMS_PER_PAGE)
                    ) : [[]];

                    return chunks.map((chunk, pageIdx) => (
                      <div 
                        key={pageIdx} 
                        className="bg-white p-12 text-black font-sans relative invoice-page"
                        style={{ width: '210mm', minHeight: '297mm' }}
                      >
                        {/* Header: Title and From Section - Simplified on subsequent pages */}
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h1 className="text-4xl font-extrabold tracking-tight mb-4">INVOICE</h1>
                            <div className="w-40">
                              {settings?.company_logo ? (
                                <img src={settings.company_logo} alt="Logo" className="w-full object-contain" crossOrigin="anonymous" />
                              ) : (
                                <div className="font-extrabold text-2xl text-red-700 font-serif">
                                  VJ<span className="text-stone-900 ml-1">Crackers</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right max-w-xs">
                            <div className="font-bold text-[10px] mb-1 uppercase tracking-wider text-stone-400">From</div>
                            <div className="font-bold text-base mb-1">{settings?.company_name || "VJ Crackers"}</div>
                            <div className="text-[11px] text-stone-600 leading-tight whitespace-pre-wrap">
                              {settings?.company_address || "No 2/119B, Barma Coloney\nSivakasi, Tamil Nadu 626189"}
                            </div>
                            <div className="text-[11px] font-bold mt-1">{settings?.company_phone || "+91 8637641790"}</div>
                          </div>
                        </div>

                        {/* Customer and Invoice Info Grid - Simplified on subsequent pages if you prefer, but keeping for consistency */}
                        <div className="grid grid-cols-2 gap-8 mb-6 py-4 border-t border-stone-100">
                          <div>
                            <div className="font-bold text-[10px] mb-1 uppercase tracking-wider text-stone-400">Bill to</div>
                            <div className="text-sm font-bold text-stone-900 mb-0.5">{selectedInvoice.first_name} {selectedInvoice.last_name}</div>
                            <div className="text-[11px] text-stone-600 leading-tight">
                              {selectedInvoice.address}<br />
                              {selectedInvoice.city}, {selectedInvoice.state}<br />
                              <span className="text-blue-600">{selectedInvoice.email}</span><br />
                              {selectedInvoice.phone_number}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400">Invoice no:</span>
                               <span className="font-bold text-lg">#{settings?.invoice_prefix || 'ORD'}-{selectedInvoice.id.toString().padStart(parseInt(settings?.invoice_number_digits || "4"), '0')}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400">Order date:</span>
                              <span className="text-stone-900 font-medium text-xs">{format(new Date(selectedInvoice.date), "dd-MM-yyyy")}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-[10px] uppercase tracking-wider text-stone-400">Page:</span>
                              <span className="text-stone-900 font-medium text-xs">{pageIdx + 1} of {chunks.length}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-6">
                          <thead>
                            <tr className="border-b-2 border-stone-900">
                              <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider">S.No</th>
                              <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider">SKU</th>
                              <th className="py-2 text-left text-[10px] font-bold uppercase tracking-wider w-1/3">Product</th>
                              <th className="py-2 text-center text-[10px] font-bold uppercase tracking-wider">Qty</th>
                              <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider">Unit price</th>
                              <th className="py-2 text-right text-[10px] font-bold uppercase tracking-wider">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {chunk.map((item, idx) => (
                              <tr key={idx} className="border-b border-stone-100">
                                <td className="py-1 px-1 text-[11px] font-medium text-stone-400">{pageIdx * ITEMS_PER_PAGE + idx + 1}</td>
                                <td className="py-1 text-[11px] font-bold text-stone-900">{item.product_serial_no || "-"}</td>
                                <td className="py-1 text-[11px] font-bold text-stone-900 line-clamp-1">{item.product_name || "Product"}</td>
                                <td className="py-1 text-[11px] text-center font-medium text-stone-600">{item.quantity}</td>
                                <td className="py-1 text-[11px] text-right font-medium text-stone-600">₹{parseFloat((item.price || 0).toString()).toFixed(2)}</td>
                                <td className="py-1 text-[11px] text-right font-bold text-stone-900">₹{(item.price * item.quantity).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Summary Section - Only on the last page */}
                        {pageIdx === chunks.length - 1 && (
                          <div className="flex justify-end pt-4">
                            <div className="w-48 space-y-2">
                              <div className="flex justify-between text-[11px] text-stone-500">
                                <span>Subtotal</span>
                                <span className="font-bold text-stone-900">₹{parseFloat((selectedInvoice.total_amount || 0).toString()).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-lg font-black border-t-2 border-stone-900 pt-2">
                                <span>Total</span>
                                <span>₹{parseFloat((selectedInvoice.total_amount || 0).toString()).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Footer - Optional */}
                        {settings?.invoice_footer && pageIdx === chunks.length - 1 && (
                          <div className="absolute bottom-12 left-12 right-12 text-center text-[10px] text-stone-400 italic border-t border-stone-100 pt-4">
                            {settings.invoice_footer}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="p-8 bg-stone-50 border-t border-stone-100 flex justify-end gap-4 print:hidden">
                <button onClick={() => setSelectedInvoice(null)} className="px-8 py-3 rounded-xl font-bold text-stone-500 hover:bg-stone-200 transition-all">Close</button>
                <button
                  disabled={isDownloading}
                  onClick={async () => {
                    setIsDownloading(true);
                    try {
                      const element = document.getElementById('printable-invoice');
                      if (!element) throw new Error("Invoice element not found");

                      // Store original style to restore later
                      const originalTransform = element.style.transform;
                      const originalTransition = element.style.transition;
                      
                      // Remove scaling transforms for capture
                      element.style.transform = 'none';
                      element.style.transition = 'none';
                      
                      // Temporarily add a class to hide any elements that shouldn't be in the PDF
                      // (Though currently we don't have any obvious ones in the inner div)

                      // Ensure all images are loaded
                      const images = element.getElementsByTagName('img');
                      await Promise.all(
                        Array.from(images).map(img => {
                          if (img.complete) return Promise.resolve();
                          return new Promise((resolve) => {
                            img.onload = resolve;
                            img.onerror = resolve;
                          });
                        })
                      );

                      // Small delay to ensure rendering after style change
                      await new Promise(resolve => setTimeout(resolve, 500));

                      // Capture as JPEG with good quality (smaller than PNG)
                      const dataUrl = await htmlToImage.toJpeg(element, {
                        backgroundColor: '#ffffff',
                        pixelRatio: 1.5, // Balanced for quality and size
                        quality: 0.8,
                        skipAutoScale: true
                      });

                      // Restore original style
                      element.style.transform = originalTransform;
                      element.style.transition = originalTransition;

                      const pdf = new jsPDF({
                        orientation: 'p',
                        unit: 'mm',
                        format: 'a4',
                        compress: true
                      });
                      const pdfWidth = pdf.internal.pageSize.getWidth();
                      const pdfHeight = pdf.internal.pageSize.getHeight();

                      const img = new Image();
                      img.src = dataUrl;
                      
                      await new Promise((resolve) => {
                        img.onload = () => {
                          const imgWidth = img.width;
                          const imgHeight = img.height;
                          
                          // Calculate the ratio to fit the width of A4
                          const ratio = pdfWidth / imgWidth;
                          const scaledHeight = imgHeight * ratio;
                          
                          let heightLeft = scaledHeight;
                          const items = selectedInvoice.items || [];
                          const ITEMS_PER_PAGE = 30;
                          const numPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

                          for (let i = 0; i < numPages; i++) {
                            if (i > 0) pdf.addPage();
                            // Shift the image up by i * pdfHeight to show the next chunked page
                            pdf.addImage(dataUrl, 'JPEG', 0, -(i * pdfHeight), pdfWidth, scaledHeight, undefined, 'FAST');
                          }

                          pdf.save(`${settings?.invoice_prefix || 'ORD'}-${selectedInvoice.id.toString().padStart(parseInt(settings?.invoice_number_digits || "4"), '0')}.pdf`);
                          resolve(null);
                        };
                      });

                    } catch (error) {
                      console.error("PDF Download error:", error);
                      alert("Download failed. Please try Print instead.");
                      
                      // Attempt to restore style if it crashed mid-way
                      const element = document.getElementById('printable-invoice');
                      if (element) {
                        element.style.transform = '';
                        element.style.transition = '';
                      }
                    } finally {
                      setIsDownloading(false);
                    }
                  }}
                  className="bg-stone-900 text-white px-8 py-3 rounded-xl font-black shadow-xl shadow-stone-200 hover:bg-stone-800 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isDownloading ? <RefreshCcw className="animate-spin" size={20} /> : <Download size={20} />}
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    const printContent = document.getElementById('printable-invoice');
                    if (printContent) {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>Print Invoice</title>
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>
                                  @media print {
                                    body { padding: 0; margin: 0; }
                                    .print-hidden { display: none; }
                                    .invoice-page { 
                                      page-break-after: always; 
                                      break-after: page;
                                      border: none !important;
                                      box-shadow: none !important;
                                      margin: 0 !important;
                                    }
                                    .invoice-page:last-child {
                                      page-break-after: auto;
                                      break-after: auto;
                                    }
                                  }
                              </style>
                            </head>
                            <body class="p-8">
                              ${printContent.innerHTML}
                              <script>
                                window.onload = () => {
                                  window.print();
                                  setTimeout(() => { window.close(); }, 500);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }
                  }}
                  className="bg-red-600 text-white px-10 py-3 rounded-xl font-black shadow-xl shadow-red-200 hover:bg-red-500 transition-all flex items-center gap-2"
                >
                  <FileText size={20} /> Print Invoice
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsManagement() {
  const [settings, setSettings] = useState<AppSettings>({
    company_name: "",
    company_logo: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    invoice_prefix: "",
    invoice_number_digits: "4",
    invoice_footer: "",
    min_order_value: "3000",
    banner_url: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings");
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post("/api/settings", settings);
      alert("Settings saved successfully!");
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Error saving settings: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><RefreshCcw className="animate-spin text-stone-400" /></div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-900">Settings</h2>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <form onSubmit={handleSave} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Company Name</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
                value={settings.company_name}
                onChange={e => setSettings(prev => ({ ...prev, company_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Invoice Prefix</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
                value={settings.invoice_prefix}
                onChange={e => setSettings(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                placeholder="e.g. ORD"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Invoice Digits (eg: 2, 3, 4)</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
                value={settings.invoice_number_digits}
                type="number"
                min="1"
                max="10"
                onChange={e => setSettings(prev => ({ ...prev, invoice_number_digits: e.target.value }))}
                placeholder="Default: 4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Company Logo</label>
            <div className="flex gap-4">
              <label className="flex-1 px-4 py-8 rounded-xl border-2 border-dashed border-stone-200 outline-none hover:border-red-600 transition-all flex flex-col items-center justify-center cursor-pointer text-stone-500 bg-stone-50">
                <ImageIcon size={24} className="mb-2" />
                <span className="font-medium">Click to upload logo picture</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setSettings(prev => ({ ...prev, company_logo: event.target?.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {settings.company_logo && (
                <div className="w-24 h-24 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center relative group">
                  <img src={settings.company_logo} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                  <button type="button" onClick={() => setSettings(prev => ({ ...prev, company_logo: '' }))} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white"><X /></button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Shop Banner</label>
            <div className="flex gap-4">
              <label className="flex-1 px-4 py-8 rounded-xl border-2 border-dashed border-stone-200 outline-none hover:border-red-600 transition-all flex flex-col items-center justify-center cursor-pointer text-stone-500 bg-stone-50">
                <ImageIcon size={24} className="mb-2" />
                <span className="font-medium">Click to upload banner picture</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setSettings(prev => ({ ...prev, banner_url: event.target?.result as string }));
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {settings.banner_url && (
                <div className="w-48 h-24 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center relative group">
                  <img src={settings.banner_url} alt="Banner Preview" className="max-w-full max-h-full object-cover" />
                  <button type="button" onClick={() => setSettings(prev => ({ ...prev, banner_url: '' }))} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white"><X /></button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Company Address</label>
            <textarea
              required
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all resize-none"
              value={settings.company_address}
              onChange={e => setSettings(prev => ({ ...prev, company_address: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Phone Number</label>
              <input
                required
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
                value={settings.company_phone}
                onChange={e => setSettings(prev => ({ ...prev, company_phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Email Address</label>
              <input
                required
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
                value={settings.company_email}
                onChange={e => setSettings(prev => ({ ...prev, company_email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Minimum Order Value (₹)</label>
              <input
                required
                type="number"
                className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
                value={settings.min_order_value}
                onChange={e => setSettings(prev => ({ ...prev, min_order_value: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider">Invoice Footer Text</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-stone-200 outline-none focus:border-red-600 transition-all"
              value={settings.invoice_footer}
              onChange={e => setSettings(prev => ({ ...prev, invoice_footer: e.target.value }))}
              placeholder="e.g. Thank you for your business!"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white px-10 py-3 rounded-xl font-bold shadow-xl shadow-red-200 transition-all flex items-center gap-2"
            >
              {saving ? <RefreshCcw className="animate-spin" size={20} /> : <Save size={20} />}
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TrashManagement() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    fetchTrash();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings");
      setSettings(res.data);
    } catch (err) {
      console.error("Error fetching settings in trash", err);
    }
  };

  const fetchTrash = async () => {
    const res = await axios.get("/api/invoices?trash=true");
    setInvoices(res.data);
  };

  const restoreInvoice = async (id: number) => {
    await axios.put(`/api/invoices/${id}/trash`, { restore: true });
    fetchTrash();
  };

  const handleEmptyTrash = async () => {
    alert("Empty Trash clicked!");
    if (confirm("Are you sure you want to permanently delete all items in the trash? This action cannot be undone.")) {
      try {
        console.log("Calling empty trash API via POST...");
        const res = await axios.post("/api/trash/invoices/empty");
        console.log("Empty trash response:", res.data);
        fetchTrash();
        alert("Trash emptied successfully: " + (res.data.deletedCount || 0) + " items deleted");
      } catch (err: any) {
        console.error("Empty trash error:", err);
        alert("Failed to empty trash: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const permanentDelete = async (id: number) => {
    if (confirm("Permanently delete this invoice? This cannot be undone.")) {
      await axios.delete(`/api/invoices/${id}`);
      fetchTrash();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-stone-900">Trash</h2>
        {invoices.length > 0 && (
          <button
            onClick={handleEmptyTrash}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 transition-all"
          >
            <Trash2 size={18} /> Empty Trash
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-100">
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Invoice ID</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-stone-400 italic">Trash is empty</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm text-stone-600">#{settings?.invoice_prefix || 'INV'}-{inv.id.toString().padStart(parseInt(settings?.invoice_number_digits || "4"), '0')}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-stone-900">{inv.first_name} {inv.last_name}</div>
                    <div className="text-stone-400 text-xs">{inv.city}, {inv.state}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-stone-900">₹{inv.total_amount}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => restoreInvoice(inv.id)} className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Restore">
                        <RefreshCcw size={18} />
                      </button>
                      <button onClick={() => permanentDelete(inv.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Permanently">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


