require("dotenv").config();
const express = require("express");
const mysql = require("mysql2"); // Wajib mysql2
const cors = require("cors");
const uploadCloud = require("./config/cloudinary");

const app = express();
const port = process.env.PORT || 5000;

// Increase payload size limit untuk handle upload gambar
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- 1. KONFIGURASI DATABASE PINTAR ---
// Kita buat konfigurasi dasar dulu
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

// LOGIKA OTOMATIS:
// Jika Host-nya BUKAN localhost (artinya Aiven/Cloud), baru kita paksa pakai SSL.
// Jika localhost, SSL dimatikan agar tidak error di laptop.
if (process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1") {
  dbConfig.ssl = {
    rejectUnauthorized: false,
  };
}

// Buat Pool dengan konfigurasi yang sudah disesuaikan
const db = mysql.createPool(dbConfig);

// Cek koneksi (Log di terminal)
db.getConnection((err, conn) => {
  if (err) {
    console.error("Gagal Konek Database:", err.message);
  } else {
    console.log("BERHASIL Terhubung ke Database!");
    if (process.env.DB_HOST !== "localhost") {
      console.log("Menggunakan Koneksi Aman (SSL)");
    } else {
      console.log("Menggunakan Koneksi Lokal (Non-SSL)");
    }
    conn.release();
  }
});

// --- RUTE API ---

app.get("/", (req, res) => res.send("Backend Sekolah Vercel is Running!"));

// A. LOGIN
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM admin WHERE username = ? AND password = ?", [username, password], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length > 0) {
      res.json({ status: "sukses", token: "token-" + result[0].id, user: result[0] });
    } else {
      res.status(401).json({ message: "Username atau password salah" });
    }
  });
});

// B. BERITA
app.get("/api/berita", (req, res) => {
  db.query("SELECT * FROM berita ORDER BY tanggal DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/api/berita", (req, res) => {
  try {
    const { judul, isi, gambar } = req.body;
    console.log("  POST /api/berita - Data diterima:");
    console.log("  judul:", judul);
    console.log("  isi:", isi?.substring(0, 50) + "...");
    console.log("  gambar length:", gambar?.length || 0, "chars");

    // Validasi input
    if (!judul || !isi) {
      console.warn("Judul atau isi kosong!");
      return res.status(400).json({ message: "Judul dan isi tidak boleh kosong" });
    }

    const gambarUrl = gambar || "";
    console.log("Data valid, menyimpan ke database...");

    const sql = "INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)";
    console.log("Executing SQL:", sql);
    console.log("Parameters:", [judul, isi?.substring(0, 30) + "...", gambar?.substring(0, 30) + "..."]);

    db.query(sql, [judul, isi, gambarUrl], (err, result) => {
      if (err) {
        console.error("❌ Database Error Code:", err.code);
        console.error("❌ Database Error Message:", err.message);
        console.error("❌ Database Error SQL:", err.sql);
        console.error("❌ Full Error:", err);
        return res.status(500).json({
          message: "Gagal menyimpan ke database",
          error: err.message,
          code: err.code,
          sql: err.sql,
        });
      }
      console.log("✅ Berita berhasil disimpan, ID:", result.insertId);
      res.json({ message: "Berita tersimpan", id: result.insertId, gambarUrl: "Tersimpan" });
    });
  } catch (error) {
    console.error("❌ Exception di POST /api/berita:", error);
    res.status(500).json({ message: "Error internal server", error: error.message, stack: error.stack });
  }
});

app.delete("/api/berita/:id", (req, res) => {
  db.query("DELETE FROM berita WHERE id = ?", [req.params.id], (err) => res.json({ message: "Berita dihapus" }));
});

// C. AKADEMIK
app.get("/api/akademik", (req, res) => db.query("SELECT * FROM akademik ORDER BY tanggal DESC", (err, r) => res.json(r)));
app.post("/api/akademik", (req, res) => {
  const { title, description, date, type } = req.body;
  const sql = "INSERT INTO akademik (judul, deskripsi, tanggal, jenis) VALUES (?, ?, ?, ?)";
  db.query(sql, [title, description, date, type], (err, result) => res.json({ message: "Tersimpan", id: result.insertId }));
});
app.delete("/api/akademik/:id", (req, res) => db.query("DELETE FROM akademik WHERE id = ?", [req.params.id], (err) => res.json({ message: "Dihapus" })));

// D. GALERI
app.get("/api/galeri", (req, res) => db.query("SELECT * FROM galeri ORDER BY tanggal DESC", (err, r) => res.json(r)));
app.post("/api/galeri", uploadCloud.single("image"), (req, res) => {
  const { title, category } = req.body;
  const imageUrl = req.file ? req.file.path : "";
  const sql = "INSERT INTO galeri (deskripsi, url_gambar, kategori) VALUES (?, ?, ?)";
  db.query(sql, [title, imageUrl, category], (err, result) => res.json({ message: "Tersimpan", id: result.insertId, imageUrl }));
});
app.delete("/api/galeri/:id", (req, res) => db.query("DELETE FROM galeri WHERE id = ?", [req.params.id], (err) => res.json({ message: "Dihapus" })));

// E. PROFIL SEKOLAH
app.get("/api/profil", (req, res) => {
  db.query("SELECT * FROM profil WHERE id = 1", (err, result) => {
    if (err) {
      console.error("Error Profil:", err);
      return res.status(500).json(err);
    }
    if (result.length > 0) {
      const data = result[0];
      let parsedMisi = [];
      let parsedTujuan = [];
      try {
        parsedMisi = JSON.parse(data.misi);
      } catch (e) {
        parsedMisi = [data.misi];
      }
      try {
        parsedTujuan = JSON.parse(data.tujuan);
      } catch (e) {
        parsedTujuan = [data.tujuan];
      }

      res.json({
        name: data.nama_sekolah,
        status: data.status_sekolah,
        province: data.provinsi,
        website: data.website,
        npsn: data.npsn,
        accreditation: data.akreditasi,
        city: data.kota,
        postalCode: data.kode_pos,
        vision: data.visi,
        mission: parsedMisi,
        nama_sekolah: data.nama_sekolah,
        nss: data.nss,
        status_sekolah: data.status_sekolah,
        provinsi: data.provinsi,
        website: data.website,
        npsn: data.npsn,
        akreditasi: data.akreditasi,
        kota: data.kota,
        kode_pos: data.kode_pos,
        alamat: data.alamat,
        no_telp: data.no_telp,
        yayasan: data.yayasan,
        kepala_sekolah: data.kepala_sekolah,
        jumlah_siswa: data.jumlah_siswa,
        jumlah_guru: data.jumlah_guru,
        rombel: data.rombel,
        visi: data.visi,
        misi: parsedMisi,
        tujuan: parsedTujuan,
      });
    } else {
      res.status(404).json({ message: "Profil kosong" });
    }
  });
});

app.post("/api/profil", (req, res) => {
  try {
    const data = req.body;
    console.log("📥 Data diterima dari frontend:", data); // DEBUG

    // Extract values from request
    const nama_sekolah = data.nama_sekolah || data.name || "";
    const nss = data.nss || "";
    const status_sekolah = data.status_sekolah || data.status || "";
    const provinsi = data.provinsi || data.province || "";
    const website = data.website || "";
    const npsn = data.npsn || "";
    const akreditasi = data.akreditasi || data.accreditation || "";
    const kota = data.kota || data.city || "";
    const kode_pos = data.kode_pos || data.postalCode || "";
    const alamat = data.alamat || data.address || "";
    const no_telp = data.no_telp || data.phone || "";
    const yayasan = data.yayasan || "";
    const kepala_sekolah = data.kepala_sekolah || "";
    const jumlah_siswa = parseInt(data.jumlah_siswa) || 0;
    const jumlah_guru = parseInt(data.jumlah_guru) || 0;
    const rombel = parseInt(data.rombel) || 0;
    const visi = data.visi || data.vision || "";

    let misi = data.misi || data.mission || [];
    let tujuan = data.tujuan || [];
    let misionString = Array.isArray(misi) ? JSON.stringify(misi) : JSON.stringify([misi]);
    let tujuanString = Array.isArray(tujuan) ? JSON.stringify(tujuan) : JSON.stringify([tujuan]);

    console.log("✅ Data yang akan disimpan:"); // DEBUG
    console.log({ nama_sekolah, nss, status_sekolah, npsn, alamat, no_telp, yayasan, kepala_sekolah, akreditasi, jumlah_siswa, jumlah_guru, rombel, visi, misionString, tujuanString });

    const sql = `UPDATE profil SET 
        nama_sekolah=?, nss=?, status_sekolah=?, provinsi=?, website=?, 
        npsn=?, akreditasi=?, kota=?, kode_pos=?, alamat=?, 
        no_telp=?, yayasan=?, kepala_sekolah=?, jumlah_siswa=?, 
        jumlah_guru=?, rombel=?, visi=?, misi=?, tujuan=?
        WHERE id=1`;

    const params = [nama_sekolah, nss, status_sekolah, provinsi, website, npsn, akreditasi, kota, kode_pos, alamat, no_telp, yayasan, kepala_sekolah, jumlah_siswa, jumlah_guru, rombel, visi, misionString, tujuanString];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("❌ Error updating profil:", err);
        return res.status(500).json({
          success: false,
          message: "Gagal menyimpan profil",
          error: err.message,
        });
      }
      console.log("✅ Profil berhasil diupdate! Rows affected:", result.affectedRows);
      res.json({
        success: true,
        message: "Data Sekolah berhasil diupdate",
        affectedRows: result.affectedRows,
      });
    });
  } catch (error) {
    console.error("❌ Exception di POST /api/profil:", error);
    res.status(500).json({
      success: false,
      message: "Error internal server",
      error: error.message,
    });
  }
});

// F. DASHBOARD & STATISTIK
app.get("/api/dashboard-stats", (req, res) => {
  // Ambil semua data secara terpisah dengan error handling yang lebih baik
  let stats = { berita: 0, akademik: 0, galeri: 0, pengunjung: 0 };
  let completed = 0;
  const errors = [];

  // 1. Hitung Berita
  db.query("SELECT COUNT(*) AS total FROM berita", (err, result) => {
    if (err) {
      console.error("Error COUNT berita:", err);
      errors.push("berita");
    } else {
      stats.berita = result[0]?.total || 0;
    }
    completed++;
    checkComplete();
  });

  // 2. Hitung Akademik
  db.query("SELECT COUNT(*) AS total FROM akademik", (err, result) => {
    if (err) {
      console.error("Error COUNT akademik:", err);
      errors.push("akademik");
    } else {
      stats.akademik = result[0]?.total || 0;
    }
    completed++;
    checkComplete();
  });

  // 3. Hitung Galeri
  db.query("SELECT COUNT(*) AS total FROM galeri", (err, result) => {
    if (err) {
      console.error("Error COUNT galeri:", err);
      errors.push("galeri");
    } else {
      stats.galeri = result[0]?.total || 0;
    }
    completed++;
    checkComplete();
  });

  // 4. Ambil Total Views (dengan fallback jika tabel/record tidak ada)
  db.query("SELECT total_views FROM pengunjung WHERE id = 1", (err, result) => {
    if (err || !result || result.length === 0) {
      console.log("Info: pengunjung table/record not found, using 0");
      stats.pengunjung = 0;
    } else {
      stats.pengunjung = result[0]?.total_views || 0;
    }
    completed++;
    checkComplete();
  });

  function checkComplete() {
    if (completed === 4) {
      if (errors.length > 0) {
        console.warn("⚠️ Some queries had errors:", errors);
      }
      res.json(stats);
    }
  }
});

app.post("/api/visit", (req, res) => {
  console.log("📍 POST /api/visit - Visitor tracking started");

  // Cek apakah record dengan id=1 sudah ada
  db.query("SELECT COUNT(*) AS count FROM pengunjung WHERE id = 1", (err, result) => {
    if (err) {
      console.error("❌ Error checking pengunjung:", err);
      return res.status(500).json({ error: "Database error", details: err.message });
    }

    const recordExists = result[0]?.count > 0;
    console.log("🔍 Record exists check:", { recordExists, count: result[0]?.count });

    if (!recordExists) {
      // Jika belum ada, insert record baru dengan id=1
      console.log("➕ Creating new pengunjung record...");
      db.query("INSERT INTO pengunjung (id, total_views) VALUES (1, 1)", (err) => {
        if (err) {
          console.error("❌ Error inserting pengunjung:", err);
          return res.status(500).json({ error: "Insert failed", details: err.message });
        }
        console.log("✅ Pengunjung record created and incremented to 1");
        res.json({ message: "Visit recorded", total_views: 1, status: "created" });
      });
    } else {
      // Jika sudah ada, update total_views
      console.log("⬆️ Updating pengunjung count...");
      db.query("UPDATE pengunjung SET total_views = total_views + 1 WHERE id = 1", (err) => {
        if (err) {
          console.error("❌ Error updating pengunjung:", err);
          return res.status(500).json({ error: "Update failed", details: err.message });
        }

        // Get the updated count
        db.query("SELECT total_views FROM pengunjung WHERE id = 1", (err, result) => {
          const newCount = result[0]?.total_views || 0;
          console.log("✅ Pengunjung incremented to:", newCount);
          res.json({ message: "Visit recorded", total_views: newCount, status: "updated" });
        });
      });
    }
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});


module.exports = app;
