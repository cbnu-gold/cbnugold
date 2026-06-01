export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://cbnugold.vercel.app").replace(/\/$/, "");

export const defaultSeoDescription =
  "충북대학교 금융권 취업 동아리 금은동입니다. 신문 스크랩, 리포트 분석, 세일즈 페어, 현직자 멘토링을 중심으로 금융권 직무를 준비합니다.";

export const recruitingShareImage = {
  url: "/images/gold-recruiting-board.png",
  width: 1600,
  height: 900,
  alt: "금은동 금융권 리크루팅 키비주얼",
};

export const absoluteRecruitingShareImage = `${siteUrl}${recruitingShareImage.url}`;
