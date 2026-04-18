ALTER TABLE signals_ranked ADD COLUMN IF NOT EXISTS signal_type TEXT DEFAULT 'topic';
