# 금은동 CMS 운영 Runbook

## 1. 배포 전 적용

1. Supabase SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다.
2. Supabase Auth에서 관리자 계정을 생성합니다.
3. 최초 관리자 1명을 `admin_profiles`에 `owner`로 추가합니다.
4. Storage 버킷을 확인합니다.
   - `applications`: private, 지원서 저장
   - `cms-media`: public, 이미지/PDF CMS 자료 저장
5. Vercel 환경변수를 확인합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `ADMIN_EMAILS`

## 2. 관리자 권한

- `/admin/login`에서 Supabase Auth 계정으로 로그인합니다.
- 로그인만으로는 관리자가 되지 않습니다. `admin_profiles.is_active = true`이고 `role`이 `owner`, `admin`, `editor`여야 수정할 수 있습니다.
- `viewer`는 조회만 가능하도록 설계했습니다.
- 관리자 계정 탭에서는 Supabase Auth 사용자 UUID와 이메일을 연결합니다. 계정 생성 자체는 Supabase Auth에서 먼저 처리합니다.
- `owner`만 관리자 계정을 추가, 비활성화, 삭제할 수 있습니다.

## 3. 콘텐츠 운영

- 공개 페이지에는 `published` 상태의 콘텐츠만 노출됩니다.
- Supabase 데이터가 비어 있거나 환경변수가 빠진 경우 기존 정적 데이터가 fallback으로 표시됩니다.
- 페이지 메타 탭에서는 홈, 소개, 활동, 지원 페이지의 검색/공유용 제목과 설명을 관리합니다.
- 콘텐츠 블록 탭에서는 공개 화면에 노출되는 섹션 문구와 CTA를 관리합니다.
- 모집 일정은 `/admin`의 모집 탭에서 수정합니다.
- 지원서 제출은 `is_open = true`이고 마감 시간이 지나지 않았을 때만 열립니다.

## 4. 지원자 관리

- 지원서 파일은 public URL로 저장하지 않습니다.
- `/admin` 지원자 탭에서 10분짜리 signed URL로만 확인합니다.
- 지원자 탭에서 이름, 학번, 이메일, 연락처, 메모 검색과 상태 필터를 사용할 수 있습니다.
- CSV 다운로드에는 개인정보가 포함되며, 현재 필터 결과만 내려받습니다.
- 상태값은 `pending`, `reviewed`, `interview`, `accepted`, `rejected`입니다.
- 점수는 0~100 사이 정수만 저장됩니다.

## 5. 검증 체크리스트

- `npm run lint`
- `npm run test`
- `npm run build`
- `/`, `/about`, `/activity`, `/join`, `/admin/login` 화면 확인
- 비로그인 상태에서 `/api/admin/*`가 401/403을 반환하는지 확인
- 일반 Supabase 인증 사용자가 `admin_profiles`에 없을 때 관리자 API 접근이 차단되는지 확인
- 지원서 파일 URL이 공개 Supabase public URL로 노출되지 않는지 확인
