import crypto from "node:crypto";
import { put } from "@vercel/blob";

/** 可上傳的圖片格式（前端會先壓縮成 JPEG，其他格式保留給未來使用） */
export const UPLOADABLE_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type UploadableImageType = keyof typeof UPLOADABLE_IMAGE_TYPES;

/** Vercel 伺服器上傳上限為 4.5MB，保留一些空間給其他欄位 */
export const MAX_UPLOAD_IMAGE_BYTES = 3 * 1024 * 1024;

export class BlobUploadError extends Error {
  constructor(
    public readonly code: "NOT_CONFIGURED" | "TOO_LARGE",
    message: string
  ) {
    super(message);
    this.name = "BlobUploadError";
  }
}

export function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** 上傳公開圖片到 Vercel Blob，路徑為 <folder>/<時間戳>-<亂數>.<副檔名>，不會覆蓋既有檔案 */
export async function putPublicImage(folder: string, data: Buffer, contentType: UploadableImageType) {
  if (!isBlobConfigured()) {
    throw new BlobUploadError("NOT_CONFIGURED", "此環境未設定圖片上傳，請改用圖片網址");
  }
  if (data.byteLength > MAX_UPLOAD_IMAGE_BYTES) {
    throw new BlobUploadError("TOO_LARGE", "圖片太大，請小於 3MB");
  }
  const pathname = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${UPLOADABLE_IMAGE_TYPES[contentType]}`;
  const blob = await put(pathname, data, { access: "public", contentType, addRandomSuffix: false });
  return { url: blob.url, pathname: blob.pathname };
}
