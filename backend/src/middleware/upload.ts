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
