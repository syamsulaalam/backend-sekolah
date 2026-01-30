require('dotenv').config();
const express = require('express');
const mysql = require('mysql2'); // Wajib mysql2
const cors = require('cors');
const uploadCloud = require('./config/cloudinary');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

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
    keepAliveInitialDelay: 0
};

// LOGIKA OTOMATIS:
// Jika Host-nya BUKAN localhost (artinya Aiven/Cloud), baru kita paksa pakai SSL.
// Jika localhost, SSL dimatikan agar tidak error di laptop.
if (process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') {
    dbConfig.ssl = {
        rejectUnauthorized: false
    };
}

// Buat Pool dengan konfigurasi yang sudah disesuaikan
const db = mysql.createPool(dbConfig);

// Cek koneksi (Log di terminal)
db.getConnection((err, conn) => {
    if (err) {
        console.error('❌ Gagal Konek Database:', err.message);
    } else {
        console.log('✅ BERHASIL Terhubung ke Database!');
        if (process.env.DB_HOST !== 'localhost') {
            console.log('🔒 Menggunakan Koneksi Aman (SSL)');
        } else {
            console.log('🏠 Menggunakan Koneksi Lokal (Non-SSL)');
        }
        conn.release();
    }
});


// --- RUTE API ---

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

// B. BERITA
app.get('/api/berita', (req, res) => {
    db.query("SELECT * FROM berita ORDER BY tanggal DESC", (err, result) => {
        if (err) return res.status(500).json(err);
        res.json(result);
    });
});

app.post('/api/berita', uploadCloud.single('image'), (req, res) => {
    const { judul, isi } = req.body;
    let gambar = req.body.gambar || '';
    if (req.file) gambar = req.file.path;

    const sql = "INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)";
    db.query(sql, [judul, isi, gambar], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Berita tersimpan', id: result.insertId, gambarUrl: gambar });
    });
});

app.delete('/api/berita/:id', (req, res) => {
    db.query("DELETE FROM berita WHERE id = ?", [req.params.id], (err) => res.json({ message: "Berita dihapus" }));
});

// C. AKADEMIK
app.get('/api/akademik', (req, res) => db.query("SELECT * FROM akademik ORDER BY tanggal DESC", (err, r) => res.json(r)));
app.post('/api/akademik', (req, res) => {
    const { title, description, date, type } = req.body;
    const sql = "INSERT INTO akademik (judul, deskripsi, tanggal, jenis) VALUES (?, ?, ?, ?)";
    db.query(sql, [title, description, date, type], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId }));
});
app.delete('/api/akademik/:id', (req, res) => db.query("DELETE FROM akademik WHERE id = ?", [req.params.id], (err) => res.json({ message: "Dihapus" })));

// D. GALERI
app.get('/api/galeri', (req, res) => db.query("SELECT * FROM galeri ORDER BY tanggal DESC", (err, r) => res.json(r)));
app.post('/api/galeri', uploadCloud.single('image'), (req, res) => {
    const { title, category } = req.body;
    const imageUrl = req.file ? req.file.path : '';
    const sql = "INSERT INTO galeri (deskripsi, url_gambar, kategori) VALUES (?, ?, ?)";
    db.query(sql, [title, imageUrl, category], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId, imageUrl }));
});
app.delete('/api/galeri/:id', (req, res) => db.query("DELETE FROM galeri WHERE id = ?", [req.params.id], (err) => res.json({ message: "Dihapus" })));

// E. PROFIL SEKOLAH
app.get('/api/profil', (req, res) => {
    db.query("SELECT * FROM profil WHERE id = 1", (err, result) => {
        if (err) {
            console.error("Error Profil:", err);
            return res.status(500).json(err);
        }
        if (result.length > 0) {
            const data = result[0];
            let parsedMisi = [];
            try { parsedMisi = JSON.parse(data.misi); } catch (e) { parsedMisi = [data.misi]; }

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
    const nama_sekolah = data.nama_sekolah || data.name || "";
    const status_sekolah = data.status_sekolah || data.status || "";
    const provinsi = data.provinsi || data.province || "";
    const website = data.website || "";
    const npsn = data.npsn || "";
    const akreditasi = data.akreditasi || data.accreditation || "";
    const kota = data.kota || data.city || "";
    const kode_pos = data.kode_pos || data.postalCode || "";
    const visi = data.visi || data.vision || "";
    let misi = data.misi || data.mission || [];
    let missionString = Array.isArray(misi) ? JSON.stringify(misi) : misi;

    const sql = `UPDATE profil SET 
        nama_sekolah=?, status_sekolah=?, provinsi=?, website=?, 
        npsn=?, akreditasi=?, kota=?, kode_pos=?,
        visi=?, misi=?
        WHERE id=1`;

    db.query(sql, [nama_sekolah, status_sekolah, provinsi, website, npsn, akreditasi, kota, kode_pos, visi, missionString], (err, result) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Data Sekolah berhasil diupdate' });
    });
});

// F. DASHBOARD & STATISTIK
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

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Backend Sekolah berjalan di port ${port}`);
    });
}

module.exports = app;