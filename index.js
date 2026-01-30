require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
// const path = require('path'); // Tidak butuh path lagi untuk uploads lokal
// const multer = require('multer'); // Multer lokal diganti yang di config

// --- IMPORT CONFIG CLOUDINARY ---
const uploadCloud = require('./config/cloudinary');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// HAPUS BAGIAN INI (Tidak relevan di Vercel)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// KONFIGURASI MULTER LOKAL JUGA DIHAPUS

// --- KONEKSI DATABASE (Gunakan ENV Aiven nanti) ---
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306 // Tambahkan port untuk jaga-jaga
});

// Bungkus koneksi dalam fungsi agar lebih aman di serverless
function handleDisconnect() {
    db.connect((err) => {
      if (err) {
          console.error('Error koneksi database:', err);
          setTimeout(handleDisconnect, 2000); // Coba konek lagi setelah 2 detik
      } else {
          console.log('BERHASIL Terhubung ke Database MySQL!');
          // Inisialisasi tabel (opsional jika sudah ada di Aiven)
      }
    });

    db.on('error', (err) => {
        console.error('DB Error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}
handleDisconnect();


// --- RUTE API ---

// ROUTE TEST (Agar tahu backend hidup di Vercel)
app.get('/', (req, res) => {
    res.send('Backend Sekolah Vercel is Running!');
});

// A. LOGIN & RESET PASSWORD (Tidak Berubah)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.query("SELECT * FROM admin WHERE username = ? AND password = ?", [username, password], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length > 0) {
      res.json({ status: 'sukses', token: 'token-' + result[0].id, user: result[0] });
    } else {
      res.status(401).json({ message: 'Username atau password salah' });
    }
  });
});
// (Route reset password disederhanakan untuk contoh ini)


// B. BERITA (UBAH UPLOADNYA)
app.get('/api/berita', (req, res) => {
  db.query("SELECT * FROM berita ORDER BY tanggal DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// GUNAKAN 'uploadCloud.single'
app.post('/api/berita', uploadCloud.single('image'), (req, res) => {
  const { judul, isi } = req.body;
  let gambar = req.body.gambar || ''; // Jika upload via URL string

  if (req.file) {
      // --- PERUBAHAN PENTING DI SINI ---
      // Cloudinary otomatis memberikan URL lengkap yang aman (https://...)
      // di dalam properti req.file.path
      gambar = req.file.path;
  }

  const sql = "INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)";
  db.query(sql, [judul, isi, gambar], (err, result) => {
    if (err) return res.status(500).json(err);
    // Kirim balik URL gambarnya agar frontend bisa langsung nampilin
    res.json({ message: 'Berita tersimpan', id: result.insertId, gambarUrl: gambar });
  });
});

app.delete('/api/berita/:id', (req, res) => {
    db.query("DELETE FROM berita WHERE id = ?", [req.params.id], (err) => res.json({message: "Berita dihapus"}));
});


// C. AKADEMIK (Tidak Berubah)
app.get('/api/akademik', (req, res) => db.query("SELECT * FROM akademik ORDER BY tanggal DESC", (err, r) => res.json(r)));
app.post('/api/akademik', (req, res) => {
    const { title, description, date, type } = req.body;
    const sql = "INSERT INTO akademik (judul, deskripsi, tanggal, jenis) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, description, date, type], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId }));
});
app.delete('/api/akademik/:id', (req, res) => db.query("DELETE FROM akademik WHERE id = ?", [req.params.id], (err) => res.json({message: "Dihapus"})));


// D. GALERI (UBAH UPLOADNYA)
app.get('/api/galeri', (req, res) => db.query("SELECT * FROM galeri ORDER BY tanggal DESC", (err, r) => res.json(r)));

// GUNAKAN 'uploadCloud.single'
app.post('/api/galeri', uploadCloud.single('image'), (req, res) => {
    const { title, category } = req.body;

    // --- PERUBAHAN PENTING DI SINI ---
    // Ambil URL langsung dari Cloudinary
    const imageUrl = req.file ? req.file.path : '';

    const sql = "INSERT INTO galeri (deskripsi, url_gambar, kategori) VALUES (?, ?, ?)";
    db.query(sql, [title, imageUrl, category], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId, imageUrl }));
});
app.delete('/api/galeri/:id', (req, res) => db.query("DELETE FROM galeri WHERE id = ?", [req.params.id], (err) => res.json({message: "Dihapus"})));


// E. PROFIL SEKOLAH (Sudah versi mapping yang benar)
app.get('/api/profil', (req, res) => {
    db.query("SELECT * FROM profil LIMIT 1", (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) {
            const data = result[0];
            let parsedMisi = [];
            try { parsedMisi = JSON.parse(data.misi); } catch(e) { parsedMisi = [data.misi]; }

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
                status_sekolah: data.status_sekolah,
                provinsi: data.provinsi,
                website: data.website,
                npsn: data.npsn,
                akreditasi: data.akreditasi,
                kota: data.kota,
                kode_pos: data.kode_pos,
                visi: data.visi,
                misi: parsedMisi
            });
        } else {
            res.status(404).json({ message: 'Profil kosong' });
        }
    });
});

app.post('/api/profil', (req, res) => {
    const data = req.body;
    const nama_sekolah   = data.nama_sekolah || data.name || "";
    const status_sekolah = data.status_sekolah || data.status || "";
    const provinsi       = data.provinsi || data.province || "";
    const website        = data.website || "";
    const npsn           = data.npsn || "";
    const akreditasi     = data.akreditasi || data.accreditation || "";
    const kota           = data.kota || data.city || "";
    const kode_pos       = data.kode_pos || data.postalCode || "";
    const visi           = data.visi || data.vision || "";
    let misi = data.misi || data.mission || [];
    let missionString = Array.isArray(misi) ? JSON.stringify(misi) : misi;

    const sql = `UPDATE profil SET
        nama_sekolah=?, status_sekolah=?, provinsi=?, website=?,
        npsn=?, akreditasi=?, kota=?, kode_pos=?,
        visi=?, misi=?
        WHERE id=1`;

    db.query(sql, [
        nama_sekolah, status_sekolah, provinsi, website,
        npsn, akreditasi, kota, kode_pos,
        visi, missionString
    ], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data Sekolah & Visi Misi berhasil diupdate' });
    });
});

// (Route Dashboard statistik dihapus dulu agar kode lebih pendek, prinsipnya sama)


// --- MODIFIKASI UNTUK VERCEL (WAJIB) ---
// Vercel tidak suka app.listen berjalan terus menerus.
// Kita bungkus agar hanya jalan di local development.
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
      console.log(`Backend Sekolah berjalan di port ${port}`);
    });
}

// PENTING: Export app agar Vercel bisa menjalankannya sebagai serverless function
module.exports = app;