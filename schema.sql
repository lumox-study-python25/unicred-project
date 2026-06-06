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
DROP POLICY IF EXISTS "Allow public read users" ON users;
DROP POLICY IF EXISTS "Allow insert own user row" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
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

-- =======================================================
-- PART 5: MESSAGING SYSTEM
-- =======================================================

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS
CREATE POLICY "Allow select conversations for participants"
ON conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = conversations.job_id
    AND j.owner_id = auth.uid()
  )
  OR worker_id = auth.uid()
);

CREATE POLICY "Allow insert conversations for participants"
ON conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM jobs j
    WHERE j.id = conversations.job_id
    AND j.owner_id = auth.uid()
  )
  OR worker_id = auth.uid()
);

-- Messages RLS
CREATE POLICY "Participants can read messages"
ON messages
FOR SELECT
USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = messages.conversation_id
    AND (
      j.owner_id = auth.uid()
      OR c.worker_id = auth.uid()
    )
  )
);

CREATE POLICY "Participants can insert messages"
ON messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = messages.conversation_id
    AND (
      j.owner_id = auth.uid()
      OR c.worker_id = auth.uid()
    )
  )
);

CREATE POLICY "Participants can update messages seen status"
ON messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = messages.conversation_id
    AND (
      j.owner_id = auth.uid()
      OR c.worker_id = auth.uid()
    )
  )
);

-- =======================================================
-- NOTIFICATION SYSTEM
-- =======================================================

DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT,
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Notifications RLS
CREATE POLICY "Allow select own notifications"
ON notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow update own notifications"
ON notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for message notifications
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- Find recipient (the other participant in the conversation)
  SELECT CASE 
    WHEN j.owner_id = NEW.sender_id THEN c.worker_id
    ELSE j.owner_id
  END INTO v_recipient_id
  FROM conversations c
  JOIN jobs j ON j.id = c.job_id
  WHERE c.id = NEW.conversation_id;

  -- Get sender name
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
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
