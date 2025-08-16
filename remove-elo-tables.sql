-- Remove ELO-related columns from Supabase
-- Run this in your Supabase SQL Editor

-- Remove elo_rating column from profiles table (if it exists)
DO $$ 
BEGIN
    -- Check if elo_rating column exists before trying to drop it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'elo_rating'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.profiles DROP COLUMN elo_rating;
        RAISE NOTICE 'elo_rating column removed from profiles table';
    ELSE
        RAISE NOTICE 'elo_rating column does not exist in profiles table';
    END IF;
END $$;

SELECT 'ELO cleanup completed successfully' as status;
