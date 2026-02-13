require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const uploadCloud = require("./config/cloudinary");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

// ================= DATABASE CONFIG =================
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
};

if (process.env.DB_HOST !== "localhost") {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const db = mysql.createPool(dbConfig);

db.getConnection((err, conn) => {
  if (err) console.error("Gagal Konek:", err.message);
  else {
    console.log("✅ Database Connected");
    conn.release();
  }
});

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("Backend Running 🚀");
});

// ================= BERITA =================

// GET ALL
app.get("/api/berita", (req, res) => {
  db.query("SELECT * FROM berita ORDER BY tanggal DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// CREATE
app.post("/api/berita", (req, res) => {
  const { judul, isi, gambar } = req.body;

  const sql = "INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)";
  db.query(sql, [judul, isi, gambar || ""], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Berita ditambahkan", id: result.insertId });
  });
});

// UPDATE
app.put("/api/berita/:id", (req, res) => {
  const { judul, isi, gambar } = req.body;
  const { id } = req.params;

  const sql = "UPDATE berita SET judul=?, isi=?, gambar=? WHERE id=?";
  db.query(sql, [judul, isi, gambar || "", id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    res.json({ message: "Berita berhasil diupdate" });
  });
});

// DELETE
app.delete("/api/berita/:id", (req, res) => {
  db.query("DELETE FROM berita WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Berita dihapus" });
  });
});

// ================= AKADEMIK =================

// GET
app.get("/api/akademik", (req, res) => {
  db.query("SELECT * FROM akademik ORDER BY tanggal DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// CREATE
app.post("/api/akademik", (req, res) => {
  const { title, description, date, type } = req.body;

  const sql =
    "INSERT INTO akademik (judul, deskripsi, tanggal, jenis) VALUES (?, ?, ?, ?)";

  db.query(sql, [title, description, date, type], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Akademik ditambahkan", id: result.insertId });
  });
});

// UPDATE
app.put("/api/akademik/:id", (req, res) => {
  const { title, description, date, type } = req.body;
  const { id } = req.params;

  const sql =
    "UPDATE akademik SET judul=?, deskripsi=?, tanggal=?, jenis=? WHERE id=?";

  db.query(sql, [title, description, date, type, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    res.json({ message: "Akademik berhasil diupdate" });
  });
});

// DELETE
app.delete("/api/akademik/:id", (req, res) => {
  db.query("DELETE FROM akademik WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Akademik dihapus" });
  });
});

// ================= GALERI =================

// GET
app.get("/api/galeri", (req, res) => {
  db.query("SELECT * FROM galeri ORDER BY tanggal DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// CREATE
app.post("/api/galeri", uploadCloud.single("image"), (req, res) => {
  const { title, category } = req.body;
  const imageUrl = req.file ? req.file.path : "";

  const sql =
    "INSERT INTO galeri (deskripsi, url_gambar, kategori) VALUES (?, ?, ?)";

  db.query(sql, [title, imageUrl, category], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Galeri ditambahkan", id: result.insertId });
  });
});

// UPDATE
app.put("/api/galeri/:id", uploadCloud.single("image"), (req, res) => {
  const { title, category } = req.body;
  const imageUrl = req.file ? req.file.path : "";
  const { id } = req.params;

  const sql =
    "UPDATE galeri SET deskripsi=?, url_gambar=?, kategori=? WHERE id=?";

  db.query(sql, [title, imageUrl, category, id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Data tidak ditemukan" });

    res.json({ message: "Galeri berhasil diupdate" });
  });
});

// DELETE
app.delete("/api/galeri/:id", (req, res) => {
  db.query("DELETE FROM galeri WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Galeri dihapus" });
  });
});

// ================= START SERVER =================
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
