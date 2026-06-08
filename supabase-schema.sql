-- CBNU GOLD website CMS, recruitment, and admin schema
-- Apply in Supabase SQL Editor. Designed to be idempotent for existing installs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES
      ('applications', 'applications', false, 10485760),
      ('cms-media', 'cms-media', true, 10485760)
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'editor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_profiles_role_check CHECK (role IN ('owner', 'admin', 'editor', 'viewer'))
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_admin_profiles()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_applicants()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_audit_logs()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin')
  );
$$;

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT site_settings_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT content_pages_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT NOT NULL,
  block_key TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  body TEXT,
  cta_label TEXT,
  cta_href TEXT,
  media_url TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_slug, block_key),
  CONSTRAINT content_blocks_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS recruitment_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation INTEGER NOT NULL,
  title TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  document_result_at TIMESTAMPTZ,
  interview_at TIMESTAMPTZ,
  final_result_at TIMESTAMPTZ,
  meeting_time TEXT,
  requirements TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  fee_note TEXT,
  docx_url TEXT,
  hwp_url TEXT,
  privacy_retention TEXT NOT NULL DEFAULT '지원 결과 발표일로부터 6개월 후 파기',
  application_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recruitment_cycles_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS activity_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'regular',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activity_items_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS achievement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  organization TEXT,
  result TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'placement',
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT achievement_items_kind_check CHECK (kind IN ('placement', 'award', 'metric')),
  CONSTRAINT achievement_items_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS history_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  generation INTEGER,
  president TEXT,
  milestones TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_current BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT history_entries_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT faq_items_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

DROP TABLE IF EXISTS wiki_articles CASCADE;

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket TEXT NOT NULL DEFAULT 'cms-media',
  path TEXT NOT NULL,
  public_url TEXT,
  alt TEXT,
  kind TEXT NOT NULL DEFAULT 'image',
  status TEXT NOT NULL DEFAULT 'published',
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bucket, path),
  CONSTRAINT media_assets_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applicants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  application_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  generation INTEGER NOT NULL DEFAULT 9,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  CONSTRAINT valid_name CHECK (name ~ '^[가-힣]{2,10}$' OR name ~ '^[a-zA-Z ]{2,30}$'),
  CONSTRAINT valid_student_id CHECK (student_id ~ '^\d{8,10}$'),
  CONSTRAINT valid_email CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT valid_phone CHECK (phone ~ '^01[016789]\d{7,8}$'),
  CONSTRAINT valid_applicant_status CHECK (status IN ('pending', 'reviewed', 'interview', 'accepted', 'rejected'))
);

ALTER TABLE applicants
  ADD COLUMN IF NOT EXISTS recruitment_cycle_id UUID REFERENCES recruitment_cycles(id),
  ADD COLUMN IF NOT EXISTS admin_note TEXT,
  ADD COLUMN IF NOT EXISTS review_score INTEGER,
  ADD COLUMN IF NOT EXISTS application_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE recruitment_cycles
  ADD COLUMN IF NOT EXISTS application_questions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE recruitment_cycles DROP CONSTRAINT IF EXISTS recruitment_cycles_application_questions_array;
ALTER TABLE recruitment_cycles
  ADD CONSTRAINT recruitment_cycles_application_questions_array
  CHECK (jsonb_typeof(application_questions) = 'array');

ALTER TABLE applicants DROP CONSTRAINT IF EXISTS applicants_application_answers_object;
ALTER TABLE applicants
  ADD CONSTRAINT applicants_application_answers_object
  CHECK (jsonb_typeof(application_answers) = 'object');

ALTER TABLE applicants DROP CONSTRAINT IF EXISTS applicants_review_score_check;
ALTER TABLE applicants
  ADD CONSTRAINT applicants_review_score_check
  CHECK (review_score IS NULL OR (review_score >= 0 AND review_score <= 100));

CREATE INDEX IF NOT EXISTS idx_applicants_generation ON applicants(generation);
CREATE INDEX IF NOT EXISTS idx_applicants_status ON applicants(status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_applicants_cycle_student_id
  ON applicants(recruitment_cycle_id, student_id)
  WHERE recruitment_cycle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_applicants_generation_student_id_without_cycle
  ON applicants(generation, student_id)
  WHERE recruitment_cycle_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_blocks_page ON content_blocks(page_slug, status, sort_order);
CREATE INDEX IF NOT EXISTS idx_recruitment_open ON recruitment_cycles(status, is_open, generation DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_activity_items_category_title ON activity_items(category, title);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_achievement_items_kind_title_result ON achievement_items(kind, title, result);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_history_entries_year ON history_entries(year);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_faq_items_question ON faq_items(question);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'admin_profiles',
    'site_settings',
    'content_pages',
    'content_blocks',
    'recruitment_cycles',
    'activity_items',
    'achievement_items',
    'history_entries',
    'faq_items',
    'media_assets',
    'applicants'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS touch_%I_updated_at ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER touch_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END $$;

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruitment_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can apply" ON applicants;
DROP POLICY IF EXISTS "Admins can view applicants" ON applicants;
DROP POLICY IF EXISTS "Admins can update applicants" ON applicants;
DROP POLICY IF EXISTS "Anyone can read settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can read admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Owners can manage admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Public can read published settings" ON site_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON site_settings;
DROP POLICY IF EXISTS "Public can read published pages" ON content_pages;
DROP POLICY IF EXISTS "Admins can manage pages" ON content_pages;
DROP POLICY IF EXISTS "Public can read published blocks" ON content_blocks;
DROP POLICY IF EXISTS "Admins can manage blocks" ON content_blocks;
DROP POLICY IF EXISTS "Public can read published recruitment" ON recruitment_cycles;
DROP POLICY IF EXISTS "Admins can manage recruitment" ON recruitment_cycles;
DROP POLICY IF EXISTS "Public can read published activities" ON activity_items;
DROP POLICY IF EXISTS "Admins can manage activities" ON activity_items;
DROP POLICY IF EXISTS "Public can read published achievements" ON achievement_items;
DROP POLICY IF EXISTS "Admins can manage achievements" ON achievement_items;
DROP POLICY IF EXISTS "Public can read published history" ON history_entries;
DROP POLICY IF EXISTS "Admins can manage history" ON history_entries;
DROP POLICY IF EXISTS "Public can read published faqs" ON faq_items;
DROP POLICY IF EXISTS "Admins can manage faqs" ON faq_items;
DROP POLICY IF EXISTS "Public can read published media" ON media_assets;
DROP POLICY IF EXISTS "Admins can manage media" ON media_assets;
DROP POLICY IF EXISTS "Admins can read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON audit_logs;
DROP FUNCTION IF EXISTS public.is_admin_viewer();

CREATE POLICY "Admins can read admin profiles"
  ON admin_profiles FOR SELECT
  USING (public.can_read_admin_profiles());

CREATE POLICY "Owners can manage admin profiles"
  ON admin_profiles FOR ALL
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "Public can read published settings"
  ON site_settings FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage settings"
  ON site_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published pages"
  ON content_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage pages"
  ON content_pages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published blocks"
  ON content_blocks FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage blocks"
  ON content_blocks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published recruitment"
  ON recruitment_cycles FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage recruitment"
  ON recruitment_cycles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published activities"
  ON activity_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage activities"
  ON activity_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published achievements"
  ON achievement_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage achievements"
  ON achievement_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published history"
  ON history_entries FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage history"
  ON history_entries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published faqs"
  ON faq_items FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage faqs"
  ON faq_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public can read published media"
  ON media_assets FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage media"
  ON media_assets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (public.can_view_audit_logs());

CREATE POLICY "Admins can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view applicants"
  ON applicants FOR SELECT
  USING (public.can_manage_applicants());

CREATE POLICY "Admins can update applicants"
  ON applicants FOR UPDATE
  USING (public.can_manage_applicants())
  WITH CHECK (public.can_manage_applicants());

INSERT INTO site_settings (key, value, status) VALUES
('site', '{
  "site_title": "금은동",
  "club_name": "충북대학교 금융권 취업 동아리 금은동",
  "organization_type": "금융권 취업 동아리",
  "founded_label": "Est. 2021",
  "brand_statement": "읽고, 말하고, 연결합니다",
  "brand_preset": "gold",
  "logo_url": "/images/logo.svg",
  "share_image_url": "/images/gold-recruiting-board.png",
  "hero_title": "충북대 금융권 취업 동아리, 금은동",
  "hero_subtitle": "신문 스크랩, 리포트 분석, 세일즈 페어, 현직자 멘토링을 진행합니다.",
  "primary_cta_label": "지원 안내 보기",
  "primary_cta_href": "/join",
  "secondary_cta_label": "활동 살펴보기",
  "secondary_cta_href": "/activity",
  "contact_name": "6대 회장 이승현",
  "contact_phone": "010-2623-2004",
  "contact_email": "cni351237@naver.com",
  "instagram_url": "https://www.instagram.com/cbnu_gold/",
  "naver_cafe_url": "https://cafe.naver.com/cufaclub"
}'::jsonb, 'published')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, status = EXCLUDED.status;

INSERT INTO recruitment_cycles (
  generation, title, is_open, start_at, end_at, document_result_at,
  interview_at, final_result_at, meeting_time, requirements, fee_note,
  docx_url, hwp_url, status
) VALUES (
  9,
  '금은동 9기 신입부원 모집',
  true,
  '2026-02-19 00:00:00+09',
  '2026-03-01 18:00:00+09',
  '2026-03-03 18:00:00+09',
  '2026-03-06 19:00:00+09',
  '2026-03-07 18:00:00+09',
  '매주 화요일 19:00 정기모임',
  ARRAY[
    '충북대학교 재학생',
    '매주 화요일 19:00 정기모임 참석 가능',
    '연속 2학기 이상 활동 가능',
    'OT 참석 가능'
  ],
  '학기 10,000원, 조건 충족 시 환급',
  '/9기_금은동_지원서.docx',
  '/9기_금은동_지원서.hwp',
  'published'
)
ON CONFLICT DO NOTHING;
INSERT INTO content_pages (slug, title, description, status, sort_order) VALUES
('home', '홈', '금은동 공식 홈페이지 메인', 'published', 1),
('join', '지원', '신입부원 모집 안내와 지원 폼', 'published', 2),
('about', '소개', '금은동 소개와 운영 구조', 'published', 3),
('activity', '활동', '정규 및 특별 활동', 'published', 4)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, status = EXCLUDED.status;

DELETE FROM content_pages WHERE slug = 'wiki';

INSERT INTO content_blocks (page_slug, block_key, title, subtitle, body, cta_label, cta_href, media_url, status, sort_order) VALUES
('home', 'hero', '충북대 금융권 취업 동아리, 금은동', '금융권 취업을 실전으로 준비합니다', '신문 스크랩, 리포트 분석, 세일즈 페어, 현직자 멘토링을 진행합니다.', '지원 안내 보기', '/join', '/images/gold-recruiting-board.png', 'published', 1),
('home', 'philosophy', '읽고, 말하고, 연결합니다', '금융권 직무 준비를 활동 단위로 쌓습니다', '읽고 정리합니다: 금융 뉴스와 리포트를 같은 기준으로 읽고 핵심을 남깁니다.
말하고 검증합니다: 발표와 세일즈 페어에서 논리, 전달력, 질문 대응을 점검합니다.
연결하고 준비합니다: 멘토링과 직무별 활동을 다음 지원 행동으로 연결합니다.', NULL, NULL, NULL, 'published', 2),
('home', 'proof', '2025년 성과', '취업·인턴·수상', '2025년 취업, 인턴, 수상 기록입니다.', '소개 보기', '/about', NULL, 'published', 3),
('about', 'intro', '충북대학교 금융권 취업 동아리', '금은동 소개', '금은동은 2021년 신문 스크랩 동아리로 출발하여, 현재 금융권 취업을 준비하는 충북대학교 동아리입니다. 직무잡아드림 소속으로 신문 스크랩, 리포트 분석, 멘토링, 직무별 활동을 진행합니다.', NULL, NULL, NULL, 'published', 4),
('about', 'partners', '소속 및 협력', '직무잡아드림 · 충남대 3F MOU', '공식 소속과 협력 정보는 운영진 확인 후 공개합니다.', NULL, NULL, NULL, 'published', 5),
('activity', 'intro', '금은동의 활동', '정기 활동과 특별 활동', '정기 활동과 특별 활동을 구분해 안내합니다.', NULL, NULL, NULL, 'published', 6),
('join', 'first-semester', '합류 후 첫 학기 흐름', '지원 전 확인할 활동 순서', '첫 모임: 오리엔테이션에서 활동 방식과 제출 기준을 안내합니다.
정기 활동: 신문 스크랩과 리포트 분석으로 금융권 이슈를 정리합니다.
심화 활동: 세일즈 페어와 멘토링에서 발표와 직무 준비를 점검합니다.', NULL, NULL, NULL, 'published', 7)
ON CONFLICT (page_slug, block_key) DO UPDATE
SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, body = EXCLUDED.body, cta_label = EXCLUDED.cta_label, cta_href = EXCLUDED.cta_href, media_url = COALESCE(content_blocks.media_url, EXCLUDED.media_url), status = EXCLUDED.status;

UPDATE content_blocks
SET media_url = COALESCE(media_url, '/images/semester-flow-board.webp')
WHERE page_slug = 'join' AND block_key = 'first-semester';

INSERT INTO activity_items (title, subtitle, description, category, tags, status, sort_order) VALUES
('신문 스크랩', '금융 시사 분석', '매주 금융 신문을 스크랩하고 조별 토의를 통해 시장 흐름을 읽는 훈련을 진행합니다.', 'regular', ARRAY['시사', '발표', '토의'], 'published', 1),
('리포트 분석', '리서치 보고서 심층분석', '증권사와 전문기관 리포트를 읽고 산업·기업·직무 관점에서 핵심 논리를 정리합니다.', 'regular', ARRAY['리서치', '직무', '분석'], 'published', 2),
('금융상품 세일즈 페어', '실전 영업 체험', '실제 금융상품을 이해하고 고객 관점에서 설명하는 세일즈 실습과 상호평가를 진행합니다.', 'regular', ARRAY['PB', 'WM', '세일즈'], 'published', 3)
ON CONFLICT DO NOTHING;

INSERT INTO achievement_items (title, organization, result, kind, year, status, sort_order) VALUES
('IBK 기업은행', '은행', '상반기 신입사원', 'placement', 2025, 'published', 1),
('IBK 기업은행', '은행', '하반기 신입사원', 'placement', 2025, 'published', 2),
('NH 농협은행', '은행', '하반기 6급 신입사원', 'placement', 2025, 'published', 3),
('한국투자증권', '증권', '신입사원', 'placement', 2025, 'published', 4),
('국민건강보험공단', '공기업', '신입사원', 'placement', 2025, 'published', 5),
('흥국생명', '보험', '채용연계 인턴', 'placement', 2025, 'published', 6),
('IBK 기업은행', '은행', '동계 청년 인턴', 'placement', 2025, 'published', 7),
('예금보험공사', '공기업', '청년 인턴', 'placement', 2025, 'published', 8),
('국민연금공단', '공기업', '청년 인턴', 'placement', 2025, 'published', 9),
('기획재정부', '정부', '청년 인턴', 'placement', 2025, 'published', 10),
('KB 국민은행', '은행', '디지털 서포터즈', 'placement', 2025, 'published', 11),
('직무분석경진대회', NULL, '최우수상', 'award', 2025, 'published', 12),
('성과보고회', NULL, '최우수상', 'award', 2025, 'published', 13),
('미래내일 일경험사업', NULL, '고용노동부 장관상', 'award', 2025, 'published', 14),
('KB 폴라리스 25기', NULL, '우수단원', 'award', 2025, 'published', 15),
('N돌핀', NULL, '우수단원', 'award', 2025, 'published', 16)
ON CONFLICT (kind, title, result) DO UPDATE
SET organization = EXCLUDED.organization, year = EXCLUDED.year, status = EXCLUDED.status, sort_order = EXCLUDED.sort_order;

INSERT INTO history_entries (year, generation, president, milestones, is_current, status, sort_order) VALUES
(2021, 1, '김정훈', ARRAY['신문스크랩 동아리로 출범', '1기 8명 창단'], false, 'published', 1),
(2022, 2, '조아상', ARRAY['직무분석경진대회 최우수상', '산업/기업분석 도입'], false, 'published', 2),
(2023, 3, '김민중', ARRAY['정규/유닛활동 체제 도입', '현직자 멘토링 시작'], false, 'published', 3),
(2024, 4, '윤지노', ARRAY['DBGAPS 투자대회 도입', 'CUFA 물적 분할'], false, 'published', 4),
(2025, 5, '전윤철', ARRAY['충남대 3F MOU 체결', '고용노동부 장관상', '글로컬 연수'], false, 'published', 5),
(2026, 6, '이승현', ARRAY['웹사이트 리뉴얼', '금은동 9기 모집'], true, 'published', 6)
ON CONFLICT DO NOTHING;

INSERT INTO faq_items (question, answer, status, sort_order) VALUES
('전공 제한이 있나요?', '없습니다. 금융에 관심 있는 충북대학교 재학생이면 누구나 지원 가능합니다.', 'published', 1),
('다른 동아리와 겸할 수 있나요?', '타 중앙동아리와는 중복가입이 가능합니다. 다만 진로취업부 소속 직무잡아드림 동아리와는 중복가입이 제한될 수 있습니다.', 'published', 2),
('면접은 어떤 형식인가요?', '제출한 지원서를 바탕으로 기본 질문과 추가 질문을 함께 진행합니다.', 'published', 3),
('회비는 얼마인가요?', '학기당 10,000원이며 조건 충족 시 환급됩니다. 세부 조건은 OT에서 안내합니다.', 'published', 4)
ON CONFLICT DO NOTHING;
