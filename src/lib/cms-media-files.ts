const allowedCmsMediaExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".pdf", ".docx", ".hwp"]);
const maxCmsMediaFileSize = 10 * 1024 * 1024;

const cmsMediaMimeByExtension: Record<string, Set<string>> = {
  ".png": new Set(["image/png"]),
  ".jpg": new Set(["image/jpeg"]),
  ".jpeg": new Set(["image/jpeg"]),
  ".webp": new Set(["image/webp"]),
  ".pdf": new Set(["application/pdf"]),
  ".docx": new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  ".hwp": new Set(["application/x-hwp", "application/haansofthwp", "application/octet-stream", ""]),
};

export function getCmsMediaFileExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  if (!normalized.includes(".")) return "";
  return normalized.slice(normalized.lastIndexOf("."));
}

export function getCmsMediaKind(extension: string) {
  return [".png", ".jpg", ".jpeg", ".webp"].includes(extension) ? "image" : "document";
}

export function getCmsMediaUploadValidationError(fileName: string, mimeType: string, fileSize: number) {
  const extension = getCmsMediaFileExtension(fileName);
  if (!allowedCmsMediaExtensions.has(extension)) {
    return "파일 확장자는 png, jpg, jpeg, webp, pdf, docx, hwp만 허용됩니다";
  }
  if (fileSize > maxCmsMediaFileSize) {
    return "파일 크기는 10MB 이하여야 합니다";
  }

  const allowedMimeTypes = cmsMediaMimeByExtension[extension];
  if (!allowedMimeTypes?.has(mimeType)) {
    return "파일 확장자와 MIME 형식이 일치하지 않습니다";
  }

  return null;
}
