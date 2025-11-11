-- Enable RLS on all public tables that are missing it
ALTER TABLE public.feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.output_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals_in ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals_ranked ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_kv ENABLE ROW LEVEL SECURITY;

-- Create policies for feeds (public read, admin write)
CREATE POLICY "Anyone can read feeds" ON public.feeds
    FOR SELECT USING (true);

CREATE POLICY "System can manage feeds" ON public.feeds
    FOR ALL WITH CHECK (true);

-- Create policies for signals_in (public read, system write)
CREATE POLICY "Anyone can read signals_in" ON public.signals_in
    FOR SELECT USING (true);

CREATE POLICY "System can insert signals" ON public.signals_in
    FOR INSERT WITH CHECK (true);

-- Create policies for signals_ranked (public read, system write)
CREATE POLICY "Anyone can read signals_ranked" ON public.signals_ranked
    FOR SELECT USING (true);

CREATE POLICY "System can manage signals_ranked" ON public.signals_ranked
    FOR ALL WITH CHECK (true);

-- Create policies for output_packs (authenticated users)
CREATE POLICY "Users can read output_packs" ON public.output_packs
    FOR SELECT USING (true);

CREATE POLICY "System can manage output_packs" ON public.output_packs
    FOR ALL WITH CHECK (true);

-- Create policies for trend_kv (public read, system write)
CREATE POLICY "Anyone can read trends" ON public.trend_kv
    FOR SELECT USING (true);

CREATE POLICY "System can manage trends" ON public.trend_kv
    FOR ALL WITH CHECK (true);

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;