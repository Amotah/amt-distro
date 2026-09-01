-- Add anonymous/public submitter metadata to lyrics submissions
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS submitter_name TEXT;
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS submitter_email TEXT;
ALTER TABLE lyrics ADD COLUMN IF NOT EXISTS request_note TEXT;

CREATE INDEX IF NOT EXISTS idx_lyrics_submitter_email ON lyrics(submitter_email);
