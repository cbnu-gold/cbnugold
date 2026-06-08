import type { HealthCheck } from "@/lib/health";

export function getHealthRemediation(check: Pick<HealthCheck, "name" | "message">) {
  if (check.name === "env:supabase_url") {
    return "Vercel 환경변수에 NEXT_PUBLIC_SUPABASE_URL을 추가하세요.";
  }
  if (check.name === "env:supabase_url_format") {
    return "Supabase Project Settings의 API URL을 https://...supabase.co 형식으로 입력하세요.";
  }
  if (check.name === "env:supabase_anon_key") {
    return "Vercel 환경변수에 NEXT_PUBLIC_SUPABASE_ANON_KEY를 추가하세요.";
  }
  if (check.name === "env:supabase_anon_key_format") {
    return "Supabase Project API의 anon public key를 다시 복사해 입력하세요.";
  }
  if (check.name === "env:supabase_service_role_key") {
    return "심층 점검 전 Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY를 추가하세요.";
  }
  if (check.name === "env:supabase_service_role_key_format") {
    return "Supabase Project API의 service_role key를 다시 복사해 입력하세요.";
  }
  if (check.name === "supabase:public_read") {
    if (check.message?.includes("호스트를 찾을 수 없습니다")) {
      return "Vercel의 Supabase URL이 현재 살아 있는 프로젝트를 가리키는지 확인하고 URL/key 세트를 교체하세요.";
    }
    return "site_settings published 데이터, public read RLS, anon key, Supabase 프로젝트 상태를 확인하세요.";
  }
  if (check.name.startsWith("table:")) {
    return "supabase-schema.sql 적용 여부와 service role key 권한을 확인하세요.";
  }
  if (check.name.startsWith("storage:")) {
    return "applications private 버킷과 cms-media public 버킷이 생성되어 있는지 확인하세요.";
  }
  if (check.name === "deep_check_authorized") {
    return "HEALTHCHECK_TOKEN을 Vercel에 설정하고 같은 값을 x-healthcheck-token 헤더로 전달하세요.";
  }
  if (check.name === "rate_limit") {
    return "잠시 후 다시 실행하세요. health endpoint는 1분 단위 요청 수를 제한합니다.";
  }

  return "배포 로그와 운영 체크리스트를 함께 확인하세요.";
}
