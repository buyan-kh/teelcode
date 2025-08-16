-- Add index for fast upserts on problem_ratings table
-- Run this once in your Supabase SQL Editor

CREATE INDEX IF NOT EXISTS idx_problem_ratings_user_problem
ON problem_ratings (user_id, problem_id);
