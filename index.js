require('dotenv').config(); // Panggil konfigurasi .env di baris paling atas

const express = require('express');

const mysql = require('mysql');

const cors = require('cors');

const path = require('path');

const multer = require('multer');



const app = express();

const port = process.env.PORT || 5000;



// Gunakan BASE_URL dari .env (http://localhost:5000)

const BASE_URL = process.env.BASE_URL || `http://localhost:${port}`;



app.use(cors());

app.use(express.json());



// --- 1. KONFIGURASI FOLDER UPLOAD ---

// Agar file gambar bisa diakses lewat browser

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// --- 2. KONFIGURASI MULTER (UPLOAD FILE) ---

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

        cb(null, 'uploads/'); // Pastikan folder 'uploads' ada

    },

    filename: (req, file, cb) => {

        cb(null, Date.now() + path.extname(file.originalname));

    }

});

const upload = multer({ storage: storage });



// --- 3. KONEKSI DATABASE (AMAN - MENGGUNAKAN ENV) ---

const db = mysql.createConnection({

  host: process.env.DB_HOST,

  user: process.env.DB_USER,

  password: process.env.DB_PASSWORD, // Password diambil dari file .env (kosong)

  database: process.env.DB_NAME      // Nama database dari file .env (sekolah_db)

});



db.connect((err) => {

  if (err) console.error('Error koneksi database:', err);

  else {

      console.log('BERHASIL Terhubung ke Database MySQL!');

     

      // Inisialisasi Tabel Profil Otomatis (Lengkap dengan kolom baru)

      const createProfilTable = `

      CREATE TABLE IF NOT EXISTS profil (

          id INT PRIMARY KEY DEFAULT 1,

          nama_sekolah VARCHAR(255), status_sekolah VARCHAR(50), npsn VARCHAR(50),

          akreditasi VARCHAR(10), visi TEXT, misi TEXT, sejarah TEXT,

          alamat TEXT, provinsi VARCHAR(100), kota VARCHAR(100),

          kode_pos VARCHAR(20), telepon VARCHAR(50), email VARCHAR(100), website VARCHAR(100)

      )`;

     

      db.query(createProfilTable, (err) => {

          if (!err) {

              // Jika tabel kosong, isi data default agar tidak error di frontend

              db.query("SELECT * FROM profil", (err, result) => {

                  if (result.length === 0) {

                      const defaultMisi = JSON.stringify(['Mencerdaskan bangsa']);

                      const sql = `INSERT INTO profil (id, nama_sekolah, status_sekolah) VALUES (1, 'SMP Aisyiyah Paccinongang', 'Swasta')`;

                      db.query(sql);

                  }

              });

          }

      });

  }

});



// --- RUTE API ---



// A. LOGIN & RESET PASSWORD

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



app.post('/api/reset-password', (req, res) => {

  const { username, newPassword, secretKey } = req.body;

  // Validasi Secret Key dari .env

  if (secretKey !== process.env.SECRET_KEY) {

      return res.status(403).json({ message: 'Kode rahasia salah!' });

  }

 

  db.query("UPDATE admin SET password = ? WHERE username = ?", [newPassword, username], (err, result) => {

    if (err) return res.status(500).json(err);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'User tidak ditemukan' });

    res.json({ status: 'sukses', message: 'Password berhasil diubah' });

  });

});



// B. BERITA

app.get('/api/berita', (req, res) => {

  db.query("SELECT * FROM berita ORDER BY tanggal DESC", (err, result) => {

    if (err) return res.status(500).json(err);

    res.json(result);

  });

});



app.post('/api/berita', upload.single('image'), (req, res) => {

  const { judul, isi } = req.body;

  let gambar = req.body.gambar || '';

  if (req.file) {

      // Link gambar dibuat dinamis menggunakan BASE_URL

      gambar = `${BASE_URL}/uploads/${req.file.filename}`;

  }

  const sql = "INSERT INTO berita (judul, isi, gambar) VALUES (?, ?, ?)";

  db.query(sql, [judul, isi, gambar], (err, result) => {

    if (err) return res.status(500).json(err);

    res.json({ message: 'Berita tersimpan', id: result.insertId });

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



// D. GALERI

app.get('/api/galeri', (req, res) => db.query("SELECT * FROM galeri ORDER BY tanggal DESC", (err, r) => res.json(r)));

app.post('/api/galeri', upload.single('image'), (req, res) => {

    const { title, category } = req.body;

    const filename = req.file ? req.file.filename : null;

    const imageUrl = filename ? `${BASE_URL}/uploads/${filename}` : '';

    const sql = "INSERT INTO galeri (deskripsi, url_gambar, kategori) VALUES (?, ?, ?)";

    db.query(sql, [title, imageUrl, category], (err, result) => res.json({ message: 'Tersimpan', id: result.insertId, imageUrl }));

});

app.delete('/api/galeri/:id', (req, res) => db.query("DELETE FROM galeri WHERE id = ?", [req.params.id], (err) => res.json({message: "Dihapus"})));



// E. PROFIL SEKOLAH (DATA SEKOLAH + VISI MISI)
app.get('/api/profil', (req, res) => {
    db.query("SELECT * FROM profil WHERE id = 1", (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.length > 0) {
            const data = result[0];

            // Cek parsing Misi (karena di database tersimpan sebagai String JSON)
            let parsedMisi = [];
            try { 
                parsedMisi = JSON.parse(data.misi); 
            } catch(e) { 
                parsedMisi = [data.misi]; 
            }

            res.json({
                // Versi Inggris (Untuk jaga-jaga)
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
                
                // Versi Indonesia (Sesuai Database - INI YANG DIPAKAI)
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
    console.log("📥 DATA UPDATE:", data);

    // Ambil data (support nama Indo / Inggris)
    const nama_sekolah   = data.nama_sekolah || data.name || "";
    const status_sekolah = data.status_sekolah || data.status || "";
    const provinsi       = data.provinsi || data.province || "";
    const website        = data.website || "";
    const npsn           = data.npsn || "";
    const akreditasi     = data.akreditasi || data.accreditation || "";
    const kota           = data.kota || data.city || "";
    const kode_pos       = data.kode_pos || data.postalCode || "";
    const visi           = data.visi || data.vision || "";
    
    // Khusus Misi (Array -> JSON String)
    let misi = data.misi || data.mission || [];
    let missionString = Array.isArray(misi) ? JSON.stringify(misi) : misi;

    // Query Update LENGKAP
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
// --- F. DASHBOARD & STATISTIK ---

// 1. Ambil Data Statistik untuk Dashboard Admin
app.get('/api/dashboard-stats', (req, res) => {
    // Kita jalankan 4 query sekaligus (Berita, Akademik, Galeri, Pengunjung)
    const queries = [
        "SELECT COUNT(*) AS total FROM berita",
        "SELECT COUNT(*) AS total FROM akademik",
        "SELECT COUNT(*) AS total FROM galeri",
        "SELECT total_views FROM pengunjung WHERE id = 1"
    ];

    // Helper function untuk menjalankan query (agar tidak callback hell)
    const executeQuery = (sql) => {
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                if (err) reject(err);
                else resolve(result[0]);
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
        .catch(err => {
            res.status(500).json(err);
        });
});

// 2. Tambah Counter Pengunjung (Dipanggil saat Halaman Depan dibuka)
app.post('/api/visit', (req, res) => {
    db.query("UPDATE pengunjung SET total_views = total_views + 1 WHERE id = 1", (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'Visit recorded' });
    });
});


// --- JALANKAN SERVER ---

app.listen(port, () => {

  console.log(`Backend Sekolah berjalan di port ${port}`);

});