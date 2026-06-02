export const validationRules = {
  name: {
    pattern: /^[가-힣]{2,10}$|^[a-zA-Z\s]{2,30}$/,
    message: "한글 2~10자 또는 영문 2~30자를 입력해주세요",
  },
  studentId: {
    pattern: /^\d{8,10}$/,
    message: "숫자 8~10자리를 입력해주세요",
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "올바른 이메일 형식을 입력해주세요",
  },
  phone: {
    pattern: /^01[016789]\d{7,8}$/,
    message: "올바른 전화번호를 입력해주세요. 하이픈 없이 숫자만 입력할 수 있습니다.",
  },
};

export const fileRules = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: [".hwp", ".docx", ".pdf"],
  message: ".hwp, .docx, .pdf 파일만 업로드 가능합니다 (최대 10MB)",
};

export function validateField(
  field: keyof typeof validationRules,
  value: string
): string | null {
  const rule = validationRules[field];
  if (!value.trim()) return "필수 입력 항목입니다";
  const testValue = field === "phone" ? value.replace(/-/g, "") : value;
  if (!rule.pattern.test(testValue)) return rule.message;
  return null;
}

export function validateFile(file: File): string | null {
  if (!file) return "파일을 선택해주세요";

  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (!fileRules.allowedExtensions.includes(ext)) {
    return fileRules.message;
  }

  if (file.size > fileRules.maxSize) {
    return "파일 크기는 10MB 이하여야 합니다";
  }

  return null;
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
