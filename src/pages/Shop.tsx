import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { Product, CartItem, AppSettings } from "../types";
import { Search, Filter, ShoppingCart, Plus, Minus, Trash2, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedInvoice, setPlacedInvoice] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [customerInfo, setCustomerInfo] = useState({ 
    firstName: "", 
    lastName: "", 
    address: "", 
    state: "Tamil Nadu", 
    city: "", 
    phone: ""
  });

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/settings");
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const categories = useMemo(() => {
    return ["All", ...new Set(products.map(p => p.category))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.product_name.toLowerCase().includes(search.toLowerCase()) || 
                           p.product_serial_no.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || p.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  // Group products by category for the list view
  const groupedProducts = useMemo<Record<string, Product[]>>(() => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const updateCart = (productId: number, qty: number) => {
    setCart(prev => {
      if (qty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: qty };
    });
  };

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const product = products.find(p => p.id === parseInt(id));
    return product ? { ...product, quantity: qty } : null;
  }).filter(Boolean) as CartItem[];

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const price = (item.sale_price && item.sale_price > 0) ? item.sale_price : item.regular_price;
    return sum + (price * item.quantity);
  }, 0);

  const handleCheckout = async () => {
    const minOrder = parseInt(settings?.min_order_value || "3000");
    if (totalPrice < minOrder) {
      alert(`Minimum order value is ₹${minOrder}. Your current total is ₹${totalPrice}. Please add more items.`);
      return;
    }
    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.address || !customerInfo.city || !customerInfo.phone) {
      alert("Please fill in all required fields");
      return;
    }
    try {
      const res = await axios.post("/api/invoices", {
        first_name: customerInfo.firstName,
        last_name: customerInfo.lastName,
        address: customerInfo.address,
        state: customerInfo.state,
        city: customerInfo.city,
        phone_number: customerInfo.phone,
        items: cartItems.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: (item.sale_price && item.sale_price > 0) ? item.sale_price : item.regular_price
        }))
      });
      setCart({});
      setIsCheckoutOpen(false);
      // Fetch full invoice data for download
      try {
        const invoiceRes = await axios.get(`/api/invoices/${res.data.id}`);
        setPlacedInvoice(invoiceRes.data);
      } catch (err) {
        console.error("Failed to fetch invoice details, using local data", err);
        setPlacedInvoice({ 
          id: res.data.id, 
          first_name: customerInfo.firstName,
          last_name: customerInfo.lastName,
          address: customerInfo.address,
          state: customerInfo.state,
          city: customerInfo.city,
          phone_number: customerInfo.phone,
          total_amount: totalPrice,
          items: cartItems.map(item => ({
            ...item,
            product_id: item.id,
          }))
        });
      }
      setShowSuccess(true);
      // Removed automatic timeout as per user request
      setCustomerInfo({ 
        firstName: "", 
        lastName: "", 
        address: "", 
        state: "Tamil Nadu", 
        city: "", 
        phone: ""
      });
    } catch (err) {
      console.error(err);
      alert("Failed to place order");
    }
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceRef.current || !placedInvoice) return;
    setIsDownloading(true);
    try {
      // Ensure images are loaded (if any in the hidden ref)
      const images = invoiceRef.current.getElementsByTagName('img');
      await Promise.all(
        Array.from(images).map(img => {
          const image = img as HTMLImageElement;
          if (image.complete) return Promise.resolve();
          return new Promise((resolve) => {
            image.onload = resolve;
            image.onerror = resolve;
          });
        })
      );

      await new Promise(r => setTimeout(r, 500));
      const dataUrl = await htmlToImage.toJpeg(invoiceRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 1.5,
        quality: 0.8,
      });
      
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
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          // Calculate the ratio to fit the width of A4
          const ratio = pdfWidth / imgWidth;
          const scaledHeight = imgHeight * ratio;
          
          let heightLeft = scaledHeight;
          let position = 0;

          const items = placedInvoice.items || [];
          const ITEMS_PER_PAGE = 30;
          const numPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;

          for (let i = 0; i < numPages; i++) {
            if (i > 0) pdf.addPage();
            pdf.addImage(dataUrl, 'JPEG', 0, -(i * pdfHeight), pdfWidth, scaledHeight, undefined, 'FAST');
          }

          const invoiceNo = String(placedInvoice.id).padStart(parseInt(settings?.invoice_number_digits || "4"), '0');
          pdf.save(`Invoice-${settings?.invoice_prefix || 'ORD'}-${invoiceNo}.pdf`);
          resolve();
        };
      });
    } catch (e) {
      console.error(e);
      alert('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="pb-32 -mx-4 sm:mx-0">
      {/* Banner */}
      <div className="w-full bg-blue-600 mb-4 overflow-hidden">
        <img 
          src={settings?.banner_url || "https://picsum.photos/seed/crackers-banner/1200/300"} 
          alt="Crackers Banner" 
          className="w-full h-auto object-cover max-h-48"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "https://placehold.co/1200x300?text=Banner+Unavailable";
          }}
        />
      </div>

      {/* Search & Filter */}
      <div className="flex bg-white border-b border-stone-200 mb-4">
        <div className="relative flex-1 border-r border-stone-200">
          <input
            type="text"
            placeholder="Search an item"
            className="w-full pl-4 pr-10 py-4 text-stone-600 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 w-5 h-5" />
        </div>
        <div className="relative px-4 py-4 flex items-center gap-2 text-stone-700 font-medium cursor-pointer">
          <span>Filters</span>
          <Filter size={18} />
          <select 
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Product List Grouped by Category */}
      <div className="space-y-6">
        {(Object.entries(groupedProducts) as [string, Product[]][]).map(([catName, catProducts]) => (
          <div key={catName}>
            <div className="bg-[#CB2E0D] text-white text-center py-3 font-bold text-lg uppercase tracking-wide mb-3">
              {catName} (SPECIAL DISCOUNT)
            </div>
            <div className="space-y-3 px-2">
              {catProducts.map(product => (
                <div 
                  key={product.id}
                  className="bg-white border border-stone-100 rounded-2xl overflow-hidden relative shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
                >
                  {/* Serial Number */}
                  <div className="absolute top-0 left-0 border-r border-b border-[#FF671F] bg-[#FF671F] px-3 py-1 font-bold text-white text-xs z-10 rounded-br-xl">
                    #{product.product_serial_no.replace(/\D/g, '') || product.id}
                  </div>

                  <div className="p-4 pt-10">
                    <h3 className="text-center text-xl font-black text-[#CB2E0D] mb-6 group-hover:scale-105 transition-all duration-300">{product.product_name}</h3>
                    
                    <div className="flex gap-6 items-center">
                      {/* Product Image */}
                      <div className="w-32 h-32 bg-white border border-stone-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner">
                        <img 
                          src={product.product_image || "https://placehold.co/200x200?text=No+Image"} 
                          alt={product.product_name}
                          className="w-full h-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=No+Image";
                          }}
                        />
                      </div>

                      {/* Prices & Qty */}
                      <div className="flex-1 flex justify-between items-center">
                        <div className="space-y-1">
                          {product.sale_price > 0 && product.sale_price < product.regular_price && (
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-medium text-stone-400 line-through">₹{product.regular_price}</span>
                              <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">-{Math.round((1 - product.sale_price / product.regular_price) * 100)}%</span>
                            </div>
                          )}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-[#046A38]">₹{product.sale_price || product.regular_price}</span>
                            <span className="text-stone-400 text-xs font-bold">/ 1Pkt</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              className="w-20 h-12 border-2 border-stone-100 rounded-xl text-center font-bold text-lg focus:outline-none focus:border-[#CB2E0D] bg-stone-50 transition-colors"
                              value={cart[product.id] || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                updateCart(product.id, val);
                              }}
                            />
                            {(!cart[product.id]) && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-400 font-bold">Qty</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="absolute bottom-0 right-0 bg-[#046A38] text-white rounded-tl-2xl px-6 py-2 font-black text-xl shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                    ₹{((cart[product.id] || 0) * (product.sale_price > 0 ? product.sale_price : product.regular_price)).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-[#CB2E0D] text-white p-4 flex items-center justify-center gap-4 z-50 border-t-2 border-stone-900"
        >
          <div className="text-lg font-bold">
            {totalItems} items . ₹ {totalPrice.toFixed(2)} |
          </div>
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="flex items-center gap-2 text-lg font-bold hover:underline"
          >
            <div className="relative">
              <ShoppingCart className="w-8 h-8" />
              <div className="absolute -top-2 -right-2 bg-white text-[#CB2E0D] min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#78350f]">
                {cartItems.length}
              </div>
            </div>
            View Cart
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Minimum Order Notice */}
      {settings && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs">
          <div className="bg-stone-900 text-white px-4 py-2 rounded-full text-center text-xs font-bold shadow-lg border border-stone-700">
            Min. Order: ₹{settings.min_order_value}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-stone-900">Your Cart</h2>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <Plus className="rotate-45" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4 mb-8">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center gap-4">
                      <img src={item.product_image} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <h4 className="font-bold text-stone-900">{item.product_name}</h4>
                        <div className="text-sm text-stone-500">₹{item.sale_price} × {item.quantity}</div>
                      </div>
                      <div className="font-bold text-stone-900">₹{item.sale_price * item.quantity}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 bg-stone-50 p-4 rounded-2xl">
                  <h3 className="font-bold text-stone-900">Customer Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First Name"
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      value={customerInfo.firstName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      value={customerInfo.lastName}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Address"
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, address: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                      value={customerInfo.city}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, city: e.target.value }))}
                    />
                    <select
                      className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white"
                      value={customerInfo.state}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, state: e.target.value }))}
                    >
                      {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div className="p-6 bg-stone-50 border-t border-stone-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-stone-500 font-medium">Total Amount</span>
                  <span className="text-3xl font-bold text-stone-900">₹{totalPrice}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-red-200 transition-all"
                >
                  Confirm Order
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="bg-white rounded-3xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 text-center max-w-sm w-full mx-4 relative"
            >
              <button 
                onClick={() => { setShowSuccess(false); setPlacedInvoice(null); }}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
              {/* Animated tick circle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 18 }}
                className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
              >
                <motion.svg
                  viewBox="0 0 52 52"
                  className="w-12 h-12"
                >
                  <motion.circle
                    cx="26" cy="26" r="25"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                  />
                  <motion.path
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14 27 l9 9 l16 -16"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
                  />
                </motion.svg>
              </motion.div>

              <div>
                <h3 className="text-2xl font-black text-stone-900">Order Placed!</h3>
                <p className="text-stone-500 mt-1 text-sm">We'll contact you shortly to confirm your order.</p>
              </div>

              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleDownloadInvoice}
                  disabled={isDownloading || !placedInvoice}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:bg-red-300 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100"
                >
                  {isDownloading ? (
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : <Download size={18} />}
                  {isDownloading ? "Generating PDF..." : "Download Invoice"}
                </button>
                <button
                  onClick={() => { setShowSuccess(false); setPlacedInvoice(null); }}
                  className="w-full py-2.5 rounded-2xl font-semibold text-stone-500 hover:text-stone-700 hover:bg-stone-100 transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden printable invoice for PDF generation */}
      {placedInvoice && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={invoiceRef} style={{ width: 794, background: '#fff' }}>
            {(() => {
              const ITEMS_PER_PAGE = 30;
              const items = placedInvoice.items || [];
              const chunks = items.length > 0 ? Array.from({ length: Math.ceil(items.length / ITEMS_PER_PAGE) }, (_, i) =>
                items.slice(i * ITEMS_PER_PAGE, i * ITEMS_PER_PAGE + ITEMS_PER_PAGE)
              ) : [[]];

              return chunks.map((chunk, pageIdx) => (
                <div 
                  key={pageIdx} 
                  style={{ 
                    width: 794, 
                    height: 1123, // A4 height at 96 DPI
                    background: '#fff', 
                    padding: 48, 
                    fontFamily: 'sans-serif', 
                    color: '#1c1917',
                    position: 'relative',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {settings?.company_logo && (
                        <img src={settings.company_logo} alt="Logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8 }} />
                      )}
                      <div>
                        <div style={{ fontSize: 20, fontWeight: 900 }}>{settings?.company_name || 'VJ Crackers'}</div>
                        <div style={{ fontSize: 10, color: '#78716c', marginTop: 2 }}>{settings?.company_address}</div>
                        <div style={{ fontSize: 10, color: '#78716c' }}>{settings?.company_phone}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#CB2E0D' }}>INVOICE</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                        #{settings?.invoice_prefix || 'ORD'}-{String(placedInvoice.id).padStart(parseInt(settings?.invoice_number_digits || "4"), '0')}
                      </div>
                      <div style={{ fontSize: 10, color: '#78716c', marginTop: 2 }}>
                        Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: 10, color: '#78716c' }}>
                        Page {pageIdx + 1} of {chunks.length}
                      </div>
                    </div>
                  </div>

                  {/* Bill To */}
                  <div style={{ background: '#fafaf9', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Bill To</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{placedInvoice.first_name} {placedInvoice.last_name}</div>
                    <div style={{ fontSize: 11, color: '#57534e', marginTop: 2 }}>{placedInvoice.address}, {placedInvoice.city}, {placedInvoice.state}</div>
                    <div style={{ fontSize: 11, color: '#57534e' }}>{placedInvoice.phone_number}</div>
                  </div>

                  {/* Items table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #1c1917' }}>
                        <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>S.No</th>
                        <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>SKU</th>
                        <th style={{ textAlign: 'left', padding: '6px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', width: '40%' }}>Product</th>
                        <th style={{ textAlign: 'center', padding: '6px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '6px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chunk.map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e7e5e4' }}>
                          <td style={{ padding: '6px 4px', fontSize: 11, color: '#a8a29e' }}>{pageIdx * ITEMS_PER_PAGE + idx + 1}</td>
                          <td style={{ padding: '6px 4px', fontSize: 11, fontWeight: 700 }}>{item.product_serial_no || '-'}</td>
                          <td style={{ padding: '6px 4px', fontSize: 11, fontWeight: 600 }}>{item.product_name}</td>
                          <td style={{ padding: '6px 4px', fontSize: 11, textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ padding: '6px 4px', fontSize: 11, textAlign: 'right' }}>₹{parseFloat(item.price).toFixed(2)}</td>
                          <td style={{ padding: '6px 4px', fontSize: 11, fontWeight: 700, textAlign: 'right' }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Total - Only on last page */}
                  {pageIdx === chunks.length - 1 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                      <div style={{ width: 220 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#78716c' }}>
                          <span>Subtotal</span>
                          <span>₹{parseFloat(placedInvoice.total_amount || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #1c1917', paddingTop: 8, fontSize: 16, fontWeight: 900 }}>
                          <span>Total</span>
                          <span>₹{parseFloat(placedInvoice.total_amount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer - Only on last page */}
                  {settings?.invoice_footer && pageIdx === chunks.length - 1 && (
                    <div style={{ position: 'absolute', bottom: 48, left: 48, right: 48, borderTop: '1px solid #e7e5e4', paddingTop: 12, fontSize: 10, color: '#a8a29e', textAlign: 'center' }}>
                      {settings.invoice_footer}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

