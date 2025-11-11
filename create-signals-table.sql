-- Create signals table for Scout GPT integration
CREATE TABLE IF NOT EXISTS public.signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  hashtag TEXT[],
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  source TEXT DEFAULT 'Scout GPT' NOT NULL,
  priority TEXT DEFAULT 'Medium' NOT NULL,
  engagement TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own signals
CREATE POLICY "Users can view their own signals" ON public.signals
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own signals
CREATE POLICY "Users can insert their own signals" ON public.signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own signals
CREATE POLICY "Users can update their own signals" ON public.signals
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own signals
CREATE POLICY "Users can delete their own signals" ON public.signals
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_signals_user_id ON public.signals(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_score ON public.signals(score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_created_at ON public.signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_date ON public.signals(date DESC);

-- Add a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_signals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_signals_updated_at_trigger
    BEFORE UPDATE ON public.signals
    FOR EACH ROW
    EXECUTE FUNCTION update_signals_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.signals IS 'Stores signals fetched from Scout GPT API';
COMMENT ON COLUMN public.signals.topic IS 'The main topic/headline of the signal';
COMMENT ON COLUMN public.signals.summary IS 'Brief summary of the signal content';
COMMENT ON COLUMN public.signals.url IS 'Optional URL associated with the signal';
COMMENT ON COLUMN public.signals.date IS 'Date when the signal was originally created';
COMMENT ON COLUMN public.signals.hashtag IS 'Array of hashtags associated with the signal';
COMMENT ON COLUMN public.signals.score IS 'Score assigned by Scout GPT (0-100)';
COMMENT ON COLUMN public.signals.rank IS 'Ranking of the signal for display purposes';
COMMENT ON COLUMN public.signals.source IS 'Source of the signal (default: Scout GPT)';
COMMENT ON COLUMN public.signals.priority IS 'Priority level (High, Medium, Low)';
COMMENT ON COLUMN public.signals.engagement IS 'Engagement metrics for display';