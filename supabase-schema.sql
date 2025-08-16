-- TeelCode Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable the uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  elo_rating INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Problem ratings by user
CREATE TABLE public.problem_ratings (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL,
  rating TEXT CHECK (rating IN ('yum', 'desirable', 'challenging', 'incomprehensible', 'exhausting')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE(user_id, problem_id)
);

-- Starred problems
CREATE TABLE public.starred_problems (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE(user_id, problem_id)
);

-- Recall schedules for spaced repetition
CREATE TABLE public.problem_recalls (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL,
  recall_type TEXT CHECK (recall_type IN ('challenging', 'incomprehensible')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id),
  UNIQUE(user_id, problem_id)
);

-- Marathon coding sessions
CREATE TABLE public.marathon_sessions (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  status TEXT CHECK (status IN ('planning', 'running', 'completed')) DEFAULT 'planning',
  messages JSONB DEFAULT '[]'::jsonb,
  suggestions INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  solved_map JSONB DEFAULT '{}'::jsonb,
  elapsed_ms INTEGER DEFAULT 0,
  preference TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  best_time INTEGER,
  ever_completed BOOLEAN DEFAULT FALSE,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- ELO gains tracking for problems
CREATE TABLE public.elo_gains (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  problem_id INTEGER NOT NULL,
  elo_gain INTEGER NOT NULL,
  problem_elo INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id),
  UNIQUE(user_id, problem_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.starred_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marathon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elo_gains ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for problem_ratings
CREATE POLICY "Users can view own problem ratings" ON public.problem_ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own problem ratings" ON public.problem_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own problem ratings" ON public.problem_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own problem ratings" ON public.problem_ratings FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for starred_problems
CREATE POLICY "Users can view own starred problems" ON public.starred_problems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own starred problems" ON public.starred_problems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own starred problems" ON public.starred_problems FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for problem_recalls
CREATE POLICY "Users can view own problem recalls" ON public.problem_recalls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own problem recalls" ON public.problem_recalls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own problem recalls" ON public.problem_recalls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own problem recalls" ON public.problem_recalls FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for marathon_sessions
CREATE POLICY "Users can view own marathon sessions" ON public.marathon_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marathon sessions" ON public.marathon_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own marathon sessions" ON public.marathon_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own marathon sessions" ON public.marathon_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for elo_gains
CREATE POLICY "Users can view own elo gains" ON public.elo_gains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own elo gains" ON public.elo_gains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own elo gains" ON public.elo_gains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own elo gains" ON public.elo_gains FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_problem_ratings_updated_at BEFORE UPDATE ON public.problem_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_marathon_sessions_updated_at BEFORE UPDATE ON public.marathon_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
