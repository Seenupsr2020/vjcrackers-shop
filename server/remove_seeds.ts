import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || "4000"),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

const seedSerials = ["101", "102", "103", "104", "201", "202", "301", "302", "401", "501", "502", "601", "701"];

async function removeSeeds() {
  try {
    console.log("Removing seed products from database...");
    const [result] = await pool.query(
      "DELETE FROM products WHERE product_serial_no IN (?)",
      [seedSerials]
    );
    console.log(`Deleted ${(result as any).affectedRows} seed products.`);
    process.exit(0);
  } catch (err) {
    console.error("Removal failed:", err);
    process.exit(1);
  }
}

removeSeeds();
