-- Create tables for the LeetCode problem tracker

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Problem ratings table
CREATE TABLE IF NOT EXISTS public.problem_ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  problem_id integer NOT NULL,
  rating text NOT NULL CHECK (rating IN ('yum', 'understandable', 'challenging', 'incomprehensible', 'exhausting')),
  notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, problem_id)
);

-- 3. Starred problems table
CREATE TABLE IF NOT EXISTS public.starred_problems (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  problem_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, problem_id)
);

-- 4. Problem recalls table (for spaced repetition)
CREATE TABLE IF NOT EXISTS public.problem_recalls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  problem_id integer NOT NULL,
  recall_type text NOT NULL CHECK (recall_type IN ('challenging', 'incomprehensible')),
  assigned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, problem_id)
);

-- 5. Marathon sessions table
CREATE TABLE IF NOT EXISTS public.marathon_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  problem_ids integer[] NOT NULL DEFAULT '{}',
  current_problem_index integer DEFAULT 0,
  completed_problems integer[] DEFAULT '{}',
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starred_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for problem_ratings
CREATE POLICY "Users can view own problem ratings" ON public.problem_ratings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own problem ratings" ON public.problem_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own problem ratings" ON public.problem_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own problem ratings" ON public.problem_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for starred_problems
CREATE POLICY "Users can view own starred problems" ON public.starred_problems
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own starred problems" ON public.starred_problems
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own starred problems" ON public.starred_problems
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for problem_recalls
CREATE POLICY "Users can view own problem recalls" ON public.problem_recalls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own problem recalls" ON public.problem_recalls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own problem recalls" ON public.problem_recalls
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own problem recalls" ON public.problem_recalls
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for marathon_sessions
CREATE POLICY "Users can view own marathon sessions" ON public.marathon_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own marathon sessions" ON public.marathon_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marathon sessions" ON public.marathon_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own marathon sessions" ON public.marathon_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_problem_ratings_user_id ON public.problem_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_ratings_problem_id ON public.problem_ratings(problem_id);
CREATE INDEX IF NOT EXISTS idx_starred_problems_user_id ON public.starred_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_recalls_user_id ON public.problem_recalls(user_id);
CREATE INDEX IF NOT EXISTS idx_marathon_sessions_user_id ON public.marathon_sessions(user_id);

-- Function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
