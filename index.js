require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

// --- PENTING: Import Config Cloudinary ---
const uploadCloud = require('./config/cloudinary');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- 1. KONEKSI DATABASE ---
// Kita bungkus koneksi agar aman (Reconnection strategy sederhana)
// --- 1. KONEKSI DATABASE ---
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  // TAMBAHAN WAJIB UNTUK AIVEN:
  ssl: {
      rejectUnauthorized: false
  }
};

let db;
function handleDisconnect() {
  db = mysql.createConnection(dbConfig);
  db.connect((err) => {
    if (err) {
      console.error('Error connecting to db:', err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('BERHASIL Terhubung ke Database MySQL (Aiven)!');
    }
  });
  db.on('error', (err) => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') handleDisconnect();
    else throw err;
  });
}
handleDisconnect();


// --- RUTE API ---

// Cek Server
app.get('/', (req, res) => res.send('Backend Sekolah Vercel is Running!'));

// A. LOGIN
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

// B. BERITA (Upload Cloudinary)
app.get('/api/berita', (req, res) => {
  db.query("SELECT * FROM berita ORDER BY tanggal DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// Perhatikan: uploadCloud.single('image')
app.post('/api/berita', uploadCloud.single('image'), (req, res) => {
  const { judul, isi } = req.body;
  let gambar = req.body.gambar || ''; 

  // Jika ada file upload, ambil URL dari Cloudinary
  if (req.file) {
      gambar = req.file.path; 
  }

  const sql = "INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)";
  db.query(sql, [judul, isi, gambar], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: 'Berita tersimpan', id: result.insertId, gambarUrl: gambar });
  });
});

app.delete('/api/berita/:id', (req, res) => {
    db.query("DELETE FROM berita WHERE id = ?", [req.params.id], (err) => res.json({message: "Berita dihapus"}));
});


// C. AKADEMIK
app.get('/api/akademik', (req, res) => db.query("SELECT * FROM akademik ORDER BY tanggal DESC", (err, r) => res.json(r)));
app.post('/api/akademik', (req, res) => {
    const { title, description, date, type } = req.body;
    const sql = "INSERT INTO akademik (judul, deskripsi, tanggal, jenis) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, description, date, type], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId }));
});
app.delete('/api/akademik/:id', (req, res) => db.query("DELETE FROM akademik WHERE id = ?", [req.params.id], (err) => res.json({message: "Dihapus"})));


// D. GALERI (Upload Cloudinary)
app.get('/api/galeri', (req, res) => db.query("SELECT * FROM galeri ORDER BY tanggal DESC", (err, r) => res.json(r)));

app.post('/api/galeri', uploadCloud.single('image'), (req, res) => {
    const { title, category } = req.body;
    // Ambil URL langsung dari Cloudinary
    const imageUrl = req.file ? req.file.path : '';
    
    const sql = "INSERT INTO galeri (deskripsi, url_gambar, kategori) VALUES (?, ?, ?)";
    db.query(sql, [title, imageUrl, category], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId, imageUrl }));
});
app.delete('/api/galeri/:id', (req, res) => db.query("DELETE FROM galeri WHERE id = ?", [req.params.id], (err) => res.json({message: "Dihapus"})));


// E. PROFIL SEKOLAH (Kode Asli Anda, Aman)
app.get('/api/profil', (req, res) => {
    db.query("SELECT * FROM profil WHERE id = 1", (err, result) => {
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
                // Versi Indo
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

// F. DASHBOARD & STATISTIK (Kode Asli Anda)
app.get('/api/dashboard-stats', (req, res) => {
    const queries = [
        "SELECT COUNT(*) AS total FROM berita",
        "SELECT COUNT(*) AS total FROM akademik",
        "SELECT COUNT(*) AS total FROM galeri",
        "SELECT total_views FROM pengunjung WHERE id = 1"
    ];
    const executeQuery = (sql) => {
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                if (err) reject(err); else resolve(result[0]);
            });
        });
    };
    Promise.all(queries.map(executeQuery))
        .then(results => {
            res.json({
                berita: results[0].total,
                akademik: results[1].total,
                galeri: results[2].total,
                pengunjung: results[3] ? results[3].total_views : 0
            });
        })
        .catch(err => res.status(500).json(err));
});

app.post('/api/visit', (req, res) => {
    db.query("UPDATE pengunjung SET total_views = total_views + 1 WHERE id = 1", (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Visit recorded' });
    });
});

// --- PENTING UNTUK VERCEL ---
// Jangan gunakan app.listen secara langsung
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Backend Sekolah berjalan di port ${port}`);
    });
}

// Export app agar Vercel bisa menjalankannya
module.exports = app;