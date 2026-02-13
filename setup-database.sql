-- ============================================
-- SETUP DATABASE SEKOLAH
-- ============================================

-- 1. BUAT DATABASE
CREATE DATABASE IF NOT EXISTS sekolah_db;
USE sekolah_db;

-- 2. TABEL ADMIN (LOGIN)
CREATE TABLE IF NOT EXISTS admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin default
INSERT INTO admin (username, password, email) 
VALUES ('admin', 'admin123', 'admin@sekolah.com');

-- 3. TABEL BERITA (NEWS)
CREATE TABLE IF NOT EXISTS berita (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  isi LONGTEXT NOT NULL,
  gambar LONGTEXT,
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'published'
);

-- 4. TABEL AKADEMIK (ACADEMIC INFO)
CREATE TABLE IF NOT EXISTS akademik (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  deskripsi LONGTEXT NOT NULL,
  jenis VARCHAR(100),
  tanggal TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABEL GALERI (GALLERY)
CREATE TABLE IF NOT EXISTS galeri (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_foto VARCHAR(255) NOT NULL,
  url_foto LONGTEXT NOT NULL,
  keterangan TEXT,
  tanggal_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABEL PENGUNJUNG (VISITOR COUNTER)
CREATE TABLE IF NOT EXISTS pengunjung (
  id INT AUTO_INCREMENT PRIMARY KEY,
  total_views INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initial visitor record
INSERT IGNORE INTO pengunjung (id, total_views) 
VALUES (1, 0);

-- 7. TABEL PROFIL SEKOLAH (SCHOOL PROFILE)
CREATE TABLE IF NOT EXISTS profil_sekolah (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_sekolah VARCHAR(255),
  alamat TEXT,
  nomor_telepon VARCHAR(20),
  email_sekolah VARCHAR(100),
  tentang_sekolah LONGTEXT,
  visi TEXT,
  misi LONGTEXT,
  logo_url LONGTEXT,
  banner_url LONGTEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default school profile
INSERT INTO profil_sekolah (
  nama_sekolah, 
  alamat, 
  nomor_telepon, 
  email_sekolah, 
  tentang_sekolah,
  visi,
  misi
) VALUES (
  'SMP Aisyiyah Paccinongang',
  'Jl. Sekolah No. 1, Paccinongang',
  '089123456789',
  'info@smpaisyiyahpaccinongang.sch.id',
  'Sekolah menengah pertama yang berkomitmen untuk memberikan pendidikan berkualitas',
  'Menjadi sekolah unggul yang menghasilkan lulusan berkarakter dan berprestasi',
  'Memberikan pendidikan yang berkualitas, mengembangkan potensi siswa, dan membentuk karakter yang baik'
);

-- 8. TABEL KONTAK/MESSAGE (untuk form kontak)
CREATE TABLE IF NOT EXISTS pesan_kontak (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subjek VARCHAR(255),
  pesan LONGTEXT NOT NULL,
  tanggal_terima TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'unread'
);

-- ============================================
-- SELESAI
-- ============================================
