-- 금은동 웹사이트 Supabase 스키마
-- Supabase SQL Editor에서 실행하세요

-- 지원자 테이블
CREATE TABLE applicants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  student_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 9,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  CONSTRAINT valid_name CHECK (name ~ '^[가-힣]{2,10}$' OR name ~ '^[a-zA-Z ]{2,30}$'),
  CONSTRAINT valid_student_id CHECK (student_id ~ '^\d{8,10}$'),
  CONSTRAINT valid_email CHECK (email ~ '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT valid_phone CHECK (phone ~ '^01[016789]\d{7,8}$')
);

-- 사이트 설정 테이블
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 데이터: 모집 설정
INSERT INTO settings (key, value) VALUES
('recruitment', '{
  "is_open": true,
  "generation": 9,
  "start_date": "2026-02-19",
  "end_date": "2026-03-01",
  "end_time": "18:00",
  "document_result_date": "2026-03-03",
  "interview_date": "2026-03-06",
  "final_result_date": "2026-03-07"
}'::jsonb);

-- RLS 정책
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (지원)
CREATE POLICY "Anyone can apply"
  ON applicants FOR INSERT
  WITH CHECK (true);

-- 인증된 관리자만 SELECT/UPDATE 가능
CREATE POLICY "Admins can view applicants"
  ON applicants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update applicants"
  ON applicants FOR UPDATE
  USING (auth.role() = 'authenticated');

-- =============================================
-- Storage: applications 버킷
-- =============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('applications', 'applications', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- 파일 업로드 허용
CREATE POLICY "Allow public uploads"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'applications');

-- 파일 읽기 허용 (public bucket)
CREATE POLICY "Allow public reads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'applications');

-- =============================================
-- settings 테이블 RLS
-- =============================================
-- settings는 누구나 읽기 가능
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (auth.role() = 'authenticated');
