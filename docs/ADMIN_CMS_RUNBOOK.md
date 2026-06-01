# 금은동 CMS 운영 Runbook

## 1. 배포 전 적용

1. Supabase SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다.
2. Supabase Auth에서 관리자 계정을 생성합니다.
3. 최초 관리자 1명을 `admin_profiles`에 `owner`로 추가합니다.
4. SQL이 Storage 버킷을 생성/갱신했는지 확인합니다.
   - `applications`: private, 지원서 저장
   - `cms-media`: public, 이미지/PDF CMS 자료 저장
5. Vercel 환경변수를 확인합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `ADMIN_EMAILS`
   - `HEALTHCHECK_TOKEN` (선택, 심층 운영 점검용)

## 2. 관리자 권한

- `/admin/login`에서 Supabase Auth 계정으로 로그인합니다.
- 로그인만으로는 관리자가 되지 않습니다. `admin_profiles.is_active = true`이고 `role`이 `owner`, `admin`, `editor`여야 수정할 수 있습니다.
- `editor`는 콘텐츠, 모집, 미디어 운영을 담당합니다. 지원자 개인정보, 감사 로그, 관리자 계정 목록은 볼 수 없습니다.
- `viewer`는 민감정보를 제외한 CMS 조회만 가능하도록 설계했습니다.
- 관리자 계정 탭에서는 Supabase Auth 사용자 UUID와 이메일을 연결합니다. 계정 생성 자체는 Supabase Auth에서 먼저 처리합니다.
- `owner`만 관리자 계정을 추가, 비활성화, 삭제할 수 있습니다.
- `owner`와 `admin`만 지원자 개인정보와 지원서 signed URL을 조회하거나 지원자 상태를 수정할 수 있습니다.
- `owner`와 `admin`만 감사 로그를 조회할 수 있습니다.
- 활성 `owner` 계정은 최소 1개 이상 유지됩니다. 현재 로그인한 `owner`는 본인 권한 비활성화, 강등, 삭제가 차단됩니다.
- API 권한과 Supabase RLS가 같은 역할 경계를 사용합니다. SQL 재적용 시 기존 정책을 먼저 `DROP POLICY IF EXISTS`로 정리한 뒤 다시 생성합니다.

## 3. 콘텐츠 운영

- 공개 페이지에는 `published` 상태의 콘텐츠만 노출됩니다.
- Supabase 데이터가 비어 있거나 환경변수가 빠진 경우 기존 정적 데이터가 fallback으로 표시됩니다.
- 페이지, 콘텐츠 블록, 활동, 성과, 연혁, FAQ는 저장 시 제목, 본문, 순서, 연도, 태그 형식을 서버에서 검증합니다.
- DB를 직접 수정해 배열 필드가 깨진 경우에도 공개 조회 단계에서 태그, 마일스톤, FAQ 등 반복 콘텐츠를 정규화합니다.
- 관리자 CMS, 지원자 상태 변경, 미디어 수정 API는 잘못된 JSON 요청을 400으로 처리합니다.
- 미디어 생성은 전용 업로드 API만 사용합니다. 일반 CMS API는 미디어 레코드를 직접 생성·수정·삭제하지 않습니다.
- 페이지 메타 탭에서는 홈, 소개, 활동, 지원 페이지의 검색/공유용 제목과 설명을 관리합니다.
- 사이트 기본 설정은 헤더, 푸터, 홈 CTA, 지원 문의 채널에 공통 적용됩니다. 내부 링크는 `/join`처럼 `/`로 시작하고, 외부 링크는 `https://`만 저장됩니다.
- 문의 이메일, 전화번호, 외부 채널 URL은 서버에서 한 번 더 검증합니다. 저장 오류가 표시되면 해당 입력값을 먼저 수정합니다.
- 콘텐츠 블록 탭에서는 공개 화면에 노출되는 섹션 문구와 CTA를 관리합니다.
- 콘텐츠 블록 CTA, 미디어 URL, 지원서 양식 URL도 내부 경로 또는 `https://`만 저장됩니다. 잘못된 URL은 저장 단계에서 차단되고, DB를 직접 수정한 값은 공개 조회 단계에서 숨겨집니다.
- `home/hero`의 미디어 URL은 홈 첫 화면 키비주얼에 연결됩니다. 기본값은 `/images/gold-recruiting-board.png`이며, 공식 사진이 준비되면 미디어 탭에 업로드한 URL로 교체합니다.
- `home/philosophy` 본문은 `제목: 설명` 형식으로 줄바꿈해 최대 3개의 운영 철학 항목으로 노출됩니다.
- 공유 카드 이미지는 기본 키비주얼을 사용합니다. 공식 홍보 이미지로 바꿀 때는 화면용 이미지와 함께 SEO 메타 이미지도 같은 톤으로 교체합니다.
- 공개 문구는 활동, 일정, 지원 절차, 확인된 성과만 적습니다. 대표성, 우수성, 유일성처럼 동아리가 스스로 평가하는 문장은 사용하지 않습니다.
- 사전형 콘텐츠는 공개 정보 구조에서 제외합니다. FAQ는 지원자가 실제로 확인해야 하는 질문만 유지합니다.
- 성과 영역은 설명 문단 없이 2025년 확인 기록을 목록으로만 노출합니다.
- `about/intro`, `about/partners`, `activity/intro` 블록은 소개·활동 페이지 상단 문구와 협력 정보에 연결됩니다.
- 미디어 탭에서는 PNG, JPG, WebP, PDF, DOCX, HWP를 업로드합니다.
- 모집 양식 파일은 미디어 탭의 `URL 복사`로 주소를 복사한 뒤 모집 탭의 DOCX/HWP URL에 입력합니다.
- SVG와 스크립트 실행 가능 파일은 공개 버킷 보안상 허용하지 않습니다.
- 미디어 삭제는 `media_assets` 기록과 `cms-media` 스토리지 파일을 함께 삭제합니다.
- 모집 일정은 `/admin`의 모집 탭에서 수정합니다.
- 모집 탭에서는 공개 홈과 지원 페이지에 표시되는 접수 기간, 서류 발표, 면접, 최종 발표, 정규 활동, 회비 안내, 개인정보 보유 기간을 함께 관리합니다.
- 모집 일정은 시작, 마감, 서류 발표, 면접, 최종 발표 순서가 어긋나면 저장되지 않습니다.
- 지원서 제출은 `is_open = true`이고 마감 시간이 지나지 않았을 때만 열립니다.

## 4. 지원자 관리

- 지원서 파일은 public URL로 저장하지 않습니다.
- `/admin` 지원자 탭에서 10분짜리 signed URL로만 확인합니다.
- Storage 경로에는 학번·전화번호 같은 지원자 식별자를 넣지 않고 무작위 파일 ID를 사용합니다.
- 같은 모집 기수에서 같은 학번으로 이미 접수된 지원서는 중복 저장하지 않습니다. 기존 데이터에 중복 학번이 있으면 SQL의 고유 인덱스 적용 전에 운영진이 먼저 정리합니다.
- 지원 알림 메일은 `ADMIN_EMAILS`에 명시된 주소로만 발송합니다. 값이 비어 있거나 `RESEND_FROM_EMAIL`이 없으면 발송을 건너뜁니다.
- 지원 알림 메일 본문에는 지원자 이름, 학번, 연락처, 지원서 파일 링크를 넣지 않습니다. 세부 정보는 `/admin`에서만 확인합니다.
- 지원자 탭에서 이름, 학번, 이메일, 연락처, 메모 검색과 상태 필터를 사용할 수 있습니다.
- CSV 다운로드에는 개인정보가 포함되며, 확인창 승인 후 현재 필터 결과만 내려받습니다.
- 지원자 상태, 점수, 관리자 메모 수정 시 감사 로그에는 변경 필드와 상태값만 남기고 메모·점수 원문은 저장하지 않습니다.
- 상태값은 `pending`, `reviewed`, `interview`, `accepted`, `rejected`입니다.
- 점수는 0~100 사이 정수만 저장됩니다.

## 5. 검증 체크리스트

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- `npm run check:ops -- https://배포주소`
- 로컬 보안 헤더까지 확인할 때는 `npm run build` 후 `npm run start`로 실행한 주소에서 `check:ops`를 돌립니다.
- `/`, `/about`, `/activity`, `/join`, `/admin/login` 화면 확인
- `/api/health`가 `200`과 `status: ok`를 반환하는지 확인
- 심층 DB/Storage 점검이 필요하면 `HEALTHCHECK_TOKEN` 설정 후 `npm run check:ops -- https://배포주소 --deep --token=토큰`을 실행합니다.
- `check:ops`는 비로그인 상태의 `/api/admin/cms/settings`, `/api/admin/applicants`, `/api/admin/cms/admins`, `/api/admin/cms/audit`가 401을 반환하는지 함께 확인합니다.
- `check:ops`는 비로그인 malformed 관리자 쓰기 요청과 전용 미디어 API 요청이 JSON 파싱보다 먼저 401로 차단되는지도 확인합니다.
- 일반 Supabase 인증 사용자가 `admin_profiles`에 없을 때 관리자 API 접근이 차단되는지 확인
- `/api/apply/check` 반복 조회가 단기 제한으로 차단되는지 확인
- 지원서 파일 URL이 공개 Supabase public URL로 노출되지 않는지 확인

## 6. 장애 판단 기준

- `/api/health`가 `503`이면 Vercel 환경변수, Supabase 프로젝트 DNS, 테이블 스키마, Storage 버킷 중 하나를 먼저 확인합니다.
- `applications` 버킷은 private, `cms-media` 버킷은 public이어야 합니다.
- 기본 헬스체크는 공개 경로이므로 Supabase 공개 읽기 연결만 확인합니다. 테이블·스토리지 항목별 심층 점검은 `HEALTHCHECK_TOKEN`이 있을 때만 실행합니다.
- 헬스체크는 비밀값을 반환하지 않고 항목별 통과 여부만 반환합니다.
- 운영 점검은 기본 보안 헤더와 관리자 화면/API의 `no-store` 캐시 정책도 함께 확인합니다.
- Supabase 연결 장애를 알고 있는 상태에서 공개 라우트만 먼저 점검할 때는 `npm run check:ops -- https://배포주소 --allow-degraded`를 사용합니다.
- Vercel Preview가 보호되어 모든 경로가 `401`이면 `vercel curl`로 Preview를 검증하거나 공개 Production URL에서 `check:ops`를 실행합니다.
