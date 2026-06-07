import { Resend } from "resend";

let resendClient: Resend | null = null;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getAdminEmailRecipients(raw = process.env.ADMIN_EMAILS) {
  const recipients = (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => emailPattern.test(email));

  return Array.from(new Set(recipients));
}

export function getResendFromEmail(raw = process.env.RESEND_FROM_EMAIL) {
  const value = raw?.trim();
  return value || null;
}

function getAdminDashboardUrl() {
  return `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://cbnugold.vercel.app").replace(/\/$/, "")}/admin`;
}

export function buildAdminEmail(data: { generation?: number | null } = {}) {
  const generationLabel = data.generation ? `${data.generation}기` : null;

  return {
    subject: "[금은동] 새로운 지원서 접수",
    text: `새로운 지원서가 접수되었습니다.

모집 기수: ${generationLabel ?? "관리자 대시보드에서 확인"}
접수 시간: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}

관리자 대시보드에서 확인하세요:
${getAdminDashboardUrl()}`,
  };
}
