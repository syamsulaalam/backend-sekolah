const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// 1. Konfigurasi Cloudinary dengan akun Anda
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Atur Penyimpanan Multer langsung ke Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'sekolah-app-uploads', // Nama folder di Cloudinary nanti
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif'], // Format file yang diizinkan
    // public_id: (req, file) => file.originalname, // (Opsional) Jika ingin nama file asli
  },
});

// 3. Buat middleware upload
const uploadCloud = multer({ storage: storage });

module.exports = uploadCloud;