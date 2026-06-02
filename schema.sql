-- =======================================================
-- UNICRED: CHỢ VIỆC LÀM SINH VIÊN VIỆT NAM (SCHEMA UPDATE)
-- =======================================================
-- Run these queries in the Supabase SQL Editor to set up the database!

-- Cleanup existing tables in reverse-relationship order
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Create Public Users Table
-- References Supabase auth.users(id) for secure authentications
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  university TEXT,
  major TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 500000, -- Default 500.000₫ for testing!
  reputation INTEGER DEFAULT 100,
  is_verified BOOLEAN DEFAULT false,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  student_card_url TEXT,
  facebook_url TEXT,
  instagram_url TEXT
);

-- 2. Create Jobs Table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0, -- Store as integer in VND (e.g. 100000)
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  deadline TIMESTAMP WITH TIME ZONE,
  category TEXT NOT NULL, -- e.g. Coding, Design, Writing, Translation, Video, Others
  location TEXT, -- Optional, e.g. Remote, FTU, HUST, etc.
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Applications Table (Freelancer applications)
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, user_id)
);

-- 4. Create Contracts Table (Bound relationship of hire)
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  UNIQUE(job_id)
);

-- 5. Create Ratings Table (Rating system + low star proof file)
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  rater_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  proof_image_url TEXT, -- Required in UI if stars <= 2
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, rater_id) -- One rating per job
);

-- 6. Enable Row Level Security (RLS) and Set Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- POLICY ON "users"
CREATE POLICY "Allow public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow insert own user row" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow update own user row" ON users FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- POLICY ON "jobs"
CREATE POLICY "Allow public read jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert jobs" ON jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Allow update own jobs or admin" ON jobs FOR UPDATE USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow delete own jobs or admin" ON jobs FOR DELETE USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- POLICY ON "applications"
CREATE POLICY "Allow read all applications" ON applications FOR SELECT USING (true);
CREATE POLICY "Allow insert own applications" ON applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow delete own applications" ON applications FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- POLICY ON "contracts"
CREATE POLICY "Allow read contracts" ON contracts FOR SELECT USING (true);
CREATE POLICY "Allow insert own contracts" ON contracts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM jobs WHERE id = job_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow update own contracts" ON contracts FOR UPDATE USING (
  worker_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM jobs WHERE id = job_id AND owner_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- POLICY ON "ratings"
CREATE POLICY "Allow read ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Allow insert own ratings" ON ratings FOR INSERT TO authenticated WITH CHECK (
  rater_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- 7. SQL for Database Auto-Profile Creation Trigger (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, university, major, credits, reputation, is_verified, role, is_banned)
  VALUES (
    new.id,
    new.email,
    COALESCE(split_part(new.email, '@', 1), 'Sinh Viên'),
    'Đại học Bách Khoa Hà Nội (HUST)',
    'Chưa cập nhật',
    500000,
    100,
    false,
    'user',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger mapping
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
