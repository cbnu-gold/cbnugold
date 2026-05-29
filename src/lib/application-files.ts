import { randomUUID } from "node:crypto";
import { fileRules } from "@/lib/validations";

const genericMimeTypes = new Set(["", "application/octet-stream"]);

const allowedMimeTypesByExtension: Record<string, Set<string>> = {
  ".pdf": new Set(["application/pdf"]),
  ".docx": new Set([
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  ".hwp": new Set([
    "application/haansofthwp",
    "application/hwp",
    "application/vnd.hancom.hwp",
    "application/x-hwp",
    "application/x-hwp-v5",
  ]),
};

export function normalizeApplicationFileName(fileName: string) {
  const basename = fileName.split(/[\\/]/).pop()?.trim() ?? "";
  return basename.replace(/[\u0000-\u001f\u007f]+/g, "").slice(0, 160) || "application-file";
}

export function getApplicationFileExtension(fileName: string) {
  const normalizedName = normalizeApplicationFileName(fileName).toLowerCase();
  const dotIndex = normalizedName.lastIndexOf(".");
  if (dotIndex < 0) return null;

  const extension = normalizedName.slice(dotIndex);
  return fileRules.allowedExtensions.includes(extension) ? extension : null;
}

export function getApplicationFileValidationError(fileName: string, mimeType: string, fileSize: number) {
  const extension = getApplicationFileExtension(fileName);
  if (!extension) return fileRules.message;

  if (fileSize > fileRules.maxSize) {
    return "파일 크기는 10MB 이하여야 합니다";
  }

  const normalizedMimeType = mimeType.trim().toLowerCase();
  if (genericMimeTypes.has(normalizedMimeType)) return null;

  if (!allowedMimeTypesByExtension[extension]?.has(normalizedMimeType)) {
    return "파일 형식이 확장자와 일치하지 않습니다. .hwp, .docx, .pdf 파일만 제출해주세요.";
  }

  return null;
}

export function buildApplicationStoragePath(generation: number, extension: string, fileId = randomUUID()) {
  const safeGeneration = Number.isInteger(generation) && generation > 0 ? generation : "unknown";
  const safeExtension = extension.startsWith(".") ? extension : `.${extension}`;
  return `${safeGeneration}/${fileId}${safeExtension.toLowerCase()}`;
}
