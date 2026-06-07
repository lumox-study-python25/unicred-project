-- =======================================================
-- UNICRED: CHỢ VIỆC LÀM SINH VIÊN VIỆT NAM (SCHEMA UPDATE)
-- FIXED-CREDIT SYSTEM (NO MANUAL MONEY)
-- =======================================================
-- Run these queries in the Supabase SQL Editor to set up the database!

-- Cleanup existing tables in reverse-relationship order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS appeals CASCADE;
DROP TABLE IF EXISTS reputation_logs CASCADE;
DROP TABLE IF EXISTS credit_logs CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Create Public Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  university TEXT,
  major TEXT,
  avatar_url TEXT,
  bio TEXT,
  credits INTEGER DEFAULT 100, -- Default 100 virtual credits
  trust_score INTEGER DEFAULT 0, -- Default 0 trust score
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
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed')),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- e.g. coding, design, writing, translation, video, others
  location TEXT, -- e.g. Remote, FTU, HUST, etc.
  deadline TIMESTAMP WITH TIME ZONE,
  is_flagged BOOLEAN DEFAULT false,
  flagged_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Job Applications Table
CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, user_id)
);

-- 4. Create Credit Logs Table (Virtual economy audit trails)
CREATE TABLE credit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- e.g. job_post, job_completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Reputation Logs Table (Required for review history)
CREATE TABLE reputation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  rater_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  proof_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(job_id, rater_id)
);

-- =======================================================
-- MESSAGING & CONVERSATIONS TABLES
-- =======================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  seen BOOLEAN DEFAULT false,
  seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- =======================================================
-- NOTIFICATION SYSTEM
-- =======================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- =======================================================
-- INDEXES FOR SCALE & SPEED
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_logs_user_id ON credit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_logs_job_id ON reputation_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- =======================================================
-- TRIGGERS & PROCEDURES (BUSINESS LOGIC)
-- =======================================================

-- 1. Auto user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, email, name, university, major, credits, trust_score, is_verified, role, is_banned
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(split_part(new.email, '@', 1), 'Sinh Viên'),
    'Đại học Bách Khoa Hà Nội (HUST)',
    'Chưa cập nhật',
    100, -- default 100 credits
    0,   -- default 0 trust score
    false,
    'user',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Deduct 30 credits from client when job is posted
CREATE OR REPLACE FUNCTION check_job_post_credits()
RETURNS trigger AS $$
DECLARE
  v_credits INTEGER;
BEGIN
  SELECT credits INTO v_credits FROM users WHERE id = NEW.created_by;
  IF v_credits IS NULL OR v_credits < 30 THEN
    RAISE EXCEPTION 'Not enough credits';
  END IF;
  
  -- Deduct
  UPDATE users SET credits = credits - 30 WHERE id = NEW.created_by;
  
  -- Log
  INSERT INTO credit_logs (user_id, amount, type)
  VALUES (NEW.created_by, -30, 'job_post');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_job_post_credits ON jobs;
CREATE TRIGGER trg_check_job_post_credits
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION check_job_post_credits();

-- 3. Automatically add +10 credits to worker when job is completed
CREATE OR REPLACE FUNCTION handle_job_completion()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_to IS NOT NULL THEN
    -- Add credits
    UPDATE users SET credits = credits + 10 WHERE id = NEW.assigned_to;
    
    -- Log
    INSERT INTO credit_logs (user_id, amount, type)
    VALUES (NEW.assigned_to, 10, 'job_completed');
    
    -- Increase trust score
    UPDATE users SET trust_score = trust_score + 1 WHERE id = NEW.assigned_to;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_job_completion ON jobs;
CREATE TRIGGER trg_handle_job_completion
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW EXECUTE FUNCTION handle_job_completion();

-- 4. Message notification trigger
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT CASE 
    WHEN j.created_by = NEW.sender_id THEN c.worker_id
    ELSE j.created_by
  END INTO v_recipient_id
  FROM conversations c
  JOIN jobs j ON j.id = c.job_id
  WHERE c.id = NEW.conversation_id;

  SELECT COALESCE(name, split_part(email, '@', 1)) INTO v_sender_name
  FROM users
  WHERE id = NEW.sender_id;

  IF v_recipient_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, conversation_id, type, content)
    VALUES (
      v_recipient_id,
      NEW.conversation_id,
      'message',
      'Bạn có tin nhắn mới từ ' || COALESCE(v_sender_name, 'Sinh Viên')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS message_notification ON messages;
CREATE TRIGGER message_notification
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- =======================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reputation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- users policies (Read own profile or Admin)
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- jobs policies (Read all, insert own, update own/assigned/admin)
CREATE POLICY "Allow public read jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Allow update jobs" ON jobs FOR UPDATE USING (auth.uid() = created_by OR auth.uid() = assigned_to OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Allow delete own jobs" ON jobs FOR DELETE USING (auth.uid() = created_by OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- job_applications policies
CREATE POLICY "Allow read all applications" ON job_applications FOR SELECT USING (true);
CREATE POLICY "Allow insert own applications" ON job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow delete own applications" ON job_applications FOR DELETE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- credit_logs policies
CREATE POLICY "Users can view own credit logs" ON credit_logs FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- reputation_logs policies
CREATE POLICY "Allow read all reputation logs" ON reputation_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert own reputation logs" ON reputation_logs FOR INSERT WITH CHECK (auth.uid() = rater_id);

-- conversations policies
CREATE POLICY "Allow select conversations for participants" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = conversations.job_id AND j.created_by = auth.uid()) OR 
  worker_id = auth.uid() OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Allow insert conversations for participants" ON conversations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM jobs j WHERE j.id = conversations.job_id AND j.created_by = auth.uid()) OR 
  worker_id = auth.uid()
);

-- messages policies
CREATE POLICY "Participants can read messages" ON messages FOR SELECT USING (
  sender_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = messages.conversation_id
      AND (j.created_by = auth.uid() OR c.worker_id = auth.uid())
  ) OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Participants can insert messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = messages.conversation_id
      AND (j.created_by = auth.uid() OR c.worker_id = auth.uid())
  )
);
CREATE POLICY "Participants can update messages seen status" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = messages.conversation_id
      AND (j.created_by = auth.uid() OR c.worker_id = auth.uid())
  )
);

-- notifications policies
CREATE POLICY "Allow select own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
