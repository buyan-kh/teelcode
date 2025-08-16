-- Add chat limit columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_chat_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_chat_reset_date DATE DEFAULT CURRENT_DATE;
