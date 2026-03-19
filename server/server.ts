import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize TiDB Connection Pool
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || "4000"),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: (process.env.TIDB_SSL_CA || process.env.TIDB_HOST?.includes(".tidbcloud.com")) ? {
    rejectUnauthorized: false
  } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDB() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_serial_no VARCHAR(255) UNIQUE,
        product_name VARCHAR(255),
        category VARCHAR(255),
        regular_price DECIMAL(10,2),
        sale_price DECIMAL(10,2),
        product_image LONGTEXT
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        address TEXT,
        state VARCHAR(255),
        city VARCHAR(255),
        phone_number VARCHAR(255),
        email VARCHAR(255),
        total_amount DECIMAL(10,2),
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted TINYINT(1) DEFAULT 0,
        INDEX idx_is_deleted (is_deleted),
        INDEX idx_date (date)
      )
    `);
    await connection.query("CREATE INDEX IF NOT EXISTS idx_category ON products(category)");
    await connection.query("CREATE INDEX IF NOT EXISTS idx_product_name ON products(product_name)");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT,
        product_id INT,
        quantity INT,
        price DECIMAL(10,2),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        skey VARCHAR(255) PRIMARY KEY,
        svalue LONGTEXT
      )
    `);
    connection.release();
  } catch (err: any) {
    console.error("TiDB connection failed:", err.message);
  }
}

export const app = express();
app.use(express.json({ limit: '50mb' }));

// Initialize DB (runs on hot start/import)
initDB();

// API Routes
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products ORDER BY id DESC");
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  const { product_serial_no, product_name, category, regular_price, sale_price, product_image } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO products (product_serial_no, product_name, category, regular_price, sale_price, product_image) VALUES (?, ?, ?, ?, ?, ?)",
      [product_serial_no, product_name, category || 'General', regular_price || 0, sale_price || 0, product_image || '']
    );
    res.json({ id: (result as any).insertId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/products/bulk", async (req, res) => {
  const products = req.body;
  if (!Array.isArray(products)) return res.status(400).json({ error: "Expected an array" });
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      for (const p of products) {
        await connection.query(
          `INSERT INTO products (product_serial_no, product_name, category, regular_price, sale_price, product_image) 
           VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE 
           product_name = VALUES(product_name), category = VALUES(category), 
           regular_price = VALUES(regular_price), sale_price = VALUES(sale_price),
           product_image = IF(VALUES(product_image) != '', VALUES(product_image), product_image)`,
          [p.product_serial_no, p.product_name, p.category || 'General', Number(p.regular_price) || 0, Number(p.sale_price) || 0, p.product_image || '']
        );
      }
      await connection.commit();
      res.json({ success: true, count: products.length });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const fields = Object.keys(req.body).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(req.body), req.params.id];
    await pool.query(`UPDATE products SET ${fields} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/products/bulk-delete", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "No IDs" });
  try {
    const placeholders = ids.map(() => "?").join(",");
    const [result] = await pool.query(`DELETE FROM products WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deletedCount: (result as any).affectedRows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/invoices", async (req, res) => {
  const isDeleted = req.query.trash === 'true' ? 1 : 0;
  try {
    const [rows] = await pool.query("SELECT * FROM invoices WHERE is_deleted = ? ORDER BY date DESC", [isDeleted]);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/invoices/:id", async (req, res) => {
  try {
    const [invoices] = await pool.query("SELECT * FROM invoices WHERE id = ?", [req.params.id]);
    const invoice = (invoices as any[])[0];
    if (!invoice) return res.status(404).json({ error: "Not found" });
    const [items] = await pool.query(
      "SELECT ii.*, p.product_name, p.product_serial_no FROM invoice_items ii JOIN products p ON ii.product_id = p.id WHERE ii.invoice_id = ?",
      [req.params.id]
    );
    res.json({ ...invoice, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/invoices", async (req, res) => {
  const { first_name, last_name, address, state, city, phone_number, email, items } = req.body;
  const total_amount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [invResult] = await connection.query(
        "INSERT INTO invoices (first_name, last_name, address, state, city, phone_number, email, total_amount, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [first_name, last_name, address, state, city, phone_number, email, total_amount]
      );
      const invoiceId = (invResult as any).insertId;
      for (const item of items) {
        await connection.query(
          "INSERT INTO invoice_items (invoice_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [invoiceId, item.product_id, item.quantity, item.price]
        );
      }
      await connection.commit();
      res.json({ id: invoiceId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/invoices/:id", async (req, res) => {
  const { first_name, last_name, address, state, city, phone_number, email, items } = req.body;
  const total_amount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      await connection.query(
        "UPDATE invoices SET first_name=?, last_name=?, address=?, state=?, city=?, phone_number=?, email=?, total_amount=? WHERE id=?",
        [first_name, last_name, address, state, city, phone_number, email, total_amount, req.params.id]
      );
      await connection.query("DELETE FROM invoice_items WHERE invoice_id = ?", [req.params.id]);
      for (const item of items) {
        await connection.query(
          "INSERT INTO invoice_items (invoice_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [req.params.id, item.product_id, item.quantity, item.price]
        );
      }
      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/invoices/:id/trash", async (req, res) => {
  try {
    await pool.query("UPDATE invoices SET is_deleted = ? WHERE id = ?", [req.body.restore ? 0 : 1, req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/trash/invoices/empty", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM invoices WHERE is_deleted = 1");
    res.json({ success: true, deletedCount: (result as any).affectedRows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/invoices/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM invoices WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/settings", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM settings");
    const settingsObj = (rows as any[]).reduce((acc, row) => {
      acc[row.skey] = row.svalue;
      return acc;
    }, {} as any);
    res.json(settingsObj);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  const settings = req.body;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [key, value] of Object.entries(settings)) {
        await connection.query("INSERT INTO settings (skey, svalue) VALUES (?, ?) ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)", [key, value]);
      }
      await connection.commit();
      res.json({ success: true });
    } catch (err: any) {
      await connection.rollback();
      res.status(400).json({ error: err.message });
    } finally {
      connection.release();
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const [[{ totalSales }]] = await pool.query("SELECT COUNT(*) as totalSales FROM invoices WHERE is_deleted = 0") as any;
    const [[{ totalProducts }]] = await pool.query("SELECT COUNT(*) as totalProducts FROM products") as any;
    const [[{ totalRevenue }]] = await pool.query("SELECT SUM(total_amount) as totalRevenue FROM invoices WHERE is_deleted = 0") as any;
    const [[{ todayOrders }]] = await pool.query("SELECT COUNT(*) as todayOrders FROM invoices WHERE is_deleted = 0 AND DATE(date) = CURDATE()") as any;
    const [[{ todayRevenue }]] = await pool.query("SELECT SUM(total_amount) as todayRevenue FROM invoices WHERE is_deleted = 0 AND DATE(date) = CURDATE()") as any;
    res.json({
      totalSales, totalOrders: totalSales, totalProducts, totalRevenue: totalRevenue || 0,
      todayOrders: todayOrders || 0, todayRevenue: todayRevenue || 0
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware and static delivery
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  let distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) distPath = path.join(process.cwd(), '..', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

// Standalone server start
if (process.argv[1]?.endsWith("server.ts") || process.argv[1]?.endsWith("server.js")) {
  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;

