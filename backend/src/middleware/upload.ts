/* ──────────────────────────────────────────────────────────────
 *  upload.ts — Multer file upload middleware
 *
 *  Validates uploaded salary slips: accepts only PDF, JPG, and
 *  PNG files up to 5 MB. Uses in-memory storage so the file
 *  buffer is passed directly to Cloudinary without temp files.
 * ────────────────────────────────────────────────────────────── */

import multer from "multer";

// Upload middleware validates type and size before a controller or storage provider sees the file.
export const salarySlipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, callback) =>
    callback(
      null,
      ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype),
    ),
});
