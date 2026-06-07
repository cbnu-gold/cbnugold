# 배포 전환 및 운영 검증 체크리스트

이 문서는 금은동 또는 같은 구조를 재사용한 단체형 CMS 홈페이지를 실제 도메인에 연결하기 전 확인할 항목입니다.

## 1. 배포 URL 구분

| 구분 | 확인 방법 | 기준 |
| --- | --- | --- |
| 최신 Preview | `vercel ls cbnugold --status READY` | 가장 최근 Preview URL |
| Production alias | Vercel Project Domains | 운영 도메인이 Vercel 프로젝트를 가리켜야 함 |
| 기존 외부 사이트 | `curl -I https://도메인` | `Server: Vercel`이 아니면 아직 전환 전 |

현재 확인 기준:

- `cbnugold.com`이 Wix 응답을 반환하면 Vercel 전환 전 상태입니다.
- `cbnugold.vercel.app`이 오래된 404를 반환하면 최신 PR Preview가 아닙니다.
- 보호된 Preview는 일반 `curl`에서 401이 정상일 수 있습니다.

## 2. Preview 검증

보호된 Preview는 일반 curl 대신 Vercel CLI를 사용합니다.

```bash
vercel ls cbnugold --status READY
vercel curl / --deployment https://최신-preview-url.vercel.app
vercel curl /api/health --deployment https://최신-preview-url.vercel.app
```

일반 운영 점검은 보호가 없는 Production URL에서 실행합니다.

```bash
npm run check:deploy
npm run check:ops -- https://운영도메인
```

`check:deploy`는 canonical 도메인과 Vercel fallback 도메인을 함께 확인합니다. canonical 도메인이 아직 Wix/Pepyaka 응답이면 전환 전 상태로 실패합니다.

Supabase 연결 이슈가 이미 확인된 상태에서 공개 화면과 보안 헤더만 먼저 확인할 때는 아래처럼 실행합니다.

```bash
npm run check:deploy -- --allow-pending
npm run check:ops -- https://운영도메인 --allow-degraded
```

## 3. 환경변수 확인

Vercel 환경별로 최소 아래 키가 있어야 합니다.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

깊은 DB/Storage 진단까지 운영 화면에서 확인하려면 아래 키도 설정합니다.

- `HEALTHCHECK_TOKEN`

로컬에서 Production과 같은 환경으로 검증할 때는 임시로 Vercel env를 pull합니다.

```bash
vercel env pull .env.local --environment preview
npm run build
npm run start
npm run check:ops -- http://127.0.0.1:3000 --allow-degraded
```

`.env.local`은 절대 커밋하지 않습니다.

## 4. Supabase 검증

`/api/health`의 기본 체크가 `degraded`이면 먼저 실패 항목 이름을 봅니다.

- `env:supabase_url`: Vercel 또는 로컬 env에 URL이 없음
- `env:supabase_anon_key`: Vercel 또는 로컬 env에 anon key가 없음
- `supabase:public_read`: Supabase URL/key/RLS/public policy 중 하나가 맞지 않음

`HEALTHCHECK_TOKEN`을 설정한 뒤에는 deep check로 테이블과 버킷을 확인합니다.

```bash
npm run check:ops -- https://운영도메인 --deep --token=<HEALTHCHECK_TOKEN>
```

확인 기준:

- `applications` bucket: private
- `cms-media` bucket: public
- public page용 테이블은 `published` 데이터만 공개 읽기 가능
- 지원자, 관리자, 감사 로그는 승인된 관리자 역할만 접근 가능

## 5. 도메인 전환 기준

1. Vercel Production 배포가 `READY` 상태입니다.
2. Vercel Project Domains에 운영 도메인이 연결되어 있습니다.
3. DNS가 Vercel 안내값을 가리킵니다.
4. `curl -I https://운영도메인`에서 `Server: Vercel` 또는 Vercel 관련 헤더가 확인됩니다.
5. `npm run check:deploy`가 canonical 도메인 기준으로 통과합니다.
6. `npm run check:ops -- https://운영도메인`이 통과합니다.
7. `/api/health`가 `200`과 `status: ok`를 반환합니다.

## 6. 전환 후 확인

- `/`, `/about`, `/activity`, `/join`, `/admin/login` 200
- `/wiki` 404
- 관리자 API 비로그인 401
- `/api/apply` invalid file request 400
- 로고, 공유 이미지, 지원 안내 이미지 200
- Open Graph 이미지가 최신 리크루팅 키비주얼
- 관리자 로그인 후 운영 상태 패널 확인
