import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  port: parseInt(process.env.TIDB_PORT || "4000"),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE,
  ssl: (process.env.TIDB_SSL_CA || process.env.TIDB_HOST?.includes("shared.aws.tidbcloud.com")) ? {
    rejectUnauthorized: false
  } : undefined,
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0
});

const dummyProducts = [
  { name: "2 3/4' Kuruvi", serial: "101", category: "ONE SOUND CRACKERS", reg: 35, sale: 7, img: "https://picsum.photos/seed/kuruvi/200/200" },
  { name: "3 1/2' Lakshmi", serial: "102", category: "ONE SOUND CRACKERS", reg: 60, sale: 12, img: "https://picsum.photos/seed/lakshmi1/200/200" },
  { name: "4' Lakshmi", serial: "103", category: "ONE SOUND CRACKERS", reg: 85, sale: 17, img: "https://picsum.photos/seed/lakshmi2/200/200" },
  { name: "4' Lion Deluxe", serial: "104", category: "ONE SOUND CRACKERS", reg: 100, sale: 20, img: "https://picsum.photos/seed/lion/200/200" },
  { name: "Ground Chakkar Big", serial: "201", category: "CHAKKARS", reg: 150, sale: 30, img: "https://picsum.photos/seed/chakkar-big/200/200" },
  { name: "Ground Chakkar Special", serial: "202", category: "CHAKKARS", reg: 200, sale: 40, img: "https://picsum.photos/seed/chakkar-spec/200/200" },
  { name: "Flower Pots Special", serial: "301", category: "FLOWER POTS", reg: 250, sale: 50, img: "https://picsum.photos/seed/pots-special/200/200" },
  { name: "Flower Pots Ash", serial: "302", category: "FLOWER POTS", reg: 300, sale: 60, img: "https://picsum.photos/seed/pots-ash/200/200" },
  { name: "Rainbow Fountains", serial: "401", category: "FOUNTAINS", reg: 500, sale: 100, img: "https://picsum.photos/seed/rainbow/200/200" },
  { name: "Sparklers 10cm", serial: "501", category: "SPARKLERS", reg: 40, sale: 8, img: "https://picsum.photos/seed/sparklers/200/200" },
  { name: "Sparklers 15cm", serial: "502", category: "SPARKLERS", reg: 60, sale: 12, img: "https://picsum.photos/seed/sparklers15/200/200" },
  { name: "Sky Shots 12 Color", serial: "601", category: "SKY SHOTS", reg: 1200, sale: 240, img: "https://picsum.photos/seed/skyshots/200/200" },
  { name: "Musical Crackers", serial: "701", category: "FANCI ITEMS", reg: 300, sale: 60, img: "https://picsum.photos/seed/musical/200/200" },
];

async function seed() {
  try {
    console.log("Seeding dummy products...");
    for (const p of dummyProducts) {
      await pool.query(
        `INSERT INTO products (product_name, product_serial_no, category, regular_price, sale_price, product_image) 
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         product_name = VALUES(product_name),
         category = VALUES(category),
         regular_price = VALUES(regular_price),
         sale_price = VALUES(sale_price),
         product_image = VALUES(product_image)`,
        [p.name, p.serial, p.category, p.reg, p.sale, p.img]
      );
    }
    console.log("Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
}

seed();
