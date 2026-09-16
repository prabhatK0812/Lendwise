/* ──────────────────────────────────────────────────────────────
 *  cloudinary.ts — Cloudinary SDK configuration + upload helper
 *
 *  Primary storage for salary slip documents. Uses raw upload
 *  type so PDFs are accepted alongside images. If the upload
 *  fails, callers fall back to storing the binary in MongoDB.
 * ────────────────────────────────────────────────────────────── */

import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

// Cloudinary stores binary documents outside MongoDB; MongoDB keeps only document metadata.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

// The upload stream accepts Multer's memory buffer without creating temporary files on disk.
export function uploadSalarySlip(
  buffer: Buffer,
  filename: string,
): Promise<UploadApiResponse> {
  if (!isCloudinaryConfigured())
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_* values to backend/.env.",
    );
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lendwise/salary-slips",
        resource_type: "raw",
        public_id: `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) =>
        error || !result
          ? reject(error || new Error("Cloudinary upload failed"))
          : resolve(result),
    );
    stream.end(buffer);
  });
}
