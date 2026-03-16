-- Contact Submissions Table
-- Run this SQL in your Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  purpose_label TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

-- Create an index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);

-- Create an index on read status
CREATE INDEX IF NOT EXISTS idx_contact_submissions_read ON contact_submissions(read);

-- Enable Row Level Security (RLS)
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows inserting new submissions (public can submit)
CREATE POLICY "Allow public insert" ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create a policy that allows reading submissions (you'll need to authenticate for this)
-- For now, we'll allow service role to read (you'll use this server-side)
-- In production, create a proper admin authentication system

-- Optional: Create a function to mark submissions as read
CREATE OR REPLACE FUNCTION mark_submission_read(submission_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE contact_submissions
  SET read = TRUE
  WHERE id = submission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

