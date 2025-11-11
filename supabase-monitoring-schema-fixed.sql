-- Safe monitoring schema for Supabase (handles policy conflicts)
-- Run this in Supabase SQL Editor

-- Create new health status enum (only if not exists)
DO $$ BEGIN
    CREATE TYPE health_status AS ENUM ('ok', 'warn', 'fail', 'unknown');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create agent category enum (only if not exists)
DO $$ BEGIN
    CREATE TYPE agent_category AS ENUM ('primary', 'secondary', 'fallback', 'emergency');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create alert type enum (only if not exists)
DO $$ BEGIN
    CREATE TYPE alert_type AS ENUM ('agent_down', 'high_latency', 'category_failure', 'all_agents_down');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Safely add monitoring columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS health_status health_status DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS category agent_category DEFAULT 'primary',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS is_fallback_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failure_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS avg_response_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS uptime_percentage DECIMAL(5,2) DEFAULT 100.0;

-- Create enhanced agent health checks table
DROP TABLE IF EXISTS public.agent_health_checks;
CREATE TABLE public.agent_health_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,

    -- Health check details
    success BOOLEAN NOT NULL,
    response_time INTEGER, -- in milliseconds
    status_code INTEGER,
    error_message TEXT,
    error_type TEXT, -- 'network', 'timeout', 'auth', 'server', 'client'

    -- Request details
    request_method TEXT DEFAULT 'POST',
    request_payload JSONB,
    response_payload JSONB,

    -- Health determination
    health_status health_status NOT NULL DEFAULT 'unknown',

    -- Timestamps
    checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Agent monitoring stats (aggregated data)
CREATE TABLE IF NOT EXISTS public.agent_monitoring_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,

    -- Time window
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,

    -- Aggregated metrics
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    avg_response_time INTEGER DEFAULT 0,
    min_response_time INTEGER DEFAULT 0,
    max_response_time INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    uptime_percentage DECIMAL(5,2) DEFAULT 0.0,

    -- Health status during this window
    health_status health_status DEFAULT 'unknown',

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Fallback events tracking
CREATE TABLE IF NOT EXISTS public.agent_fallback_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Event details
    trigger_type TEXT NOT NULL, -- 'manual', 'automatic', 'health_check'
    failed_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    fallback_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    agent_role agent_role NOT NULL,

    -- Failure context
    failure_reason TEXT,
    consecutive_failures INTEGER DEFAULT 0,

    -- Event metadata
    triggered_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,

    -- Additional data
    metadata JSONB DEFAULT '{}'
);

-- System alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Alert details
    alert_type alert_type NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Related entities
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Alert status
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMPTZ,

    -- Additional data
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_health_checks_agent_id_time ON public.agent_health_checks(agent_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_health_checks_health_status ON public.agent_health_checks(health_status);
CREATE INDEX IF NOT EXISTS idx_agent_monitoring_stats_agent_id_window ON public.agent_monitoring_stats(agent_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_agent_fallback_events_role_time ON public.agent_fallback_events(agent_role, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity_created ON public.system_alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON public.system_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Enable RLS on new tables
ALTER TABLE public.agent_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_monitoring_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_fallback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe way)
DROP POLICY IF EXISTS "Users can view health checks for their agents" ON public.agent_health_checks;
DROP POLICY IF EXISTS "System can insert health checks" ON public.agent_health_checks;
DROP POLICY IF EXISTS "Users can view monitoring stats for their agents" ON public.agent_monitoring_stats;
DROP POLICY IF EXISTS "System can manage monitoring stats" ON public.agent_monitoring_stats;
DROP POLICY IF EXISTS "Users can view their fallback events" ON public.agent_fallback_events;
DROP POLICY IF EXISTS "System can manage fallback events" ON public.agent_fallback_events;
DROP POLICY IF EXISTS "Users can view their alerts" ON public.system_alerts;
DROP POLICY IF EXISTS "Users can acknowledge their alerts" ON public.system_alerts;
DROP POLICY IF EXISTS "System can create alerts" ON public.system_alerts;

-- Create RLS policies (without IF NOT EXISTS)
CREATE POLICY "Users can view health checks for their agents" ON public.agent_health_checks
    FOR SELECT USING (
        agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    );

CREATE POLICY "System can insert health checks" ON public.agent_health_checks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view monitoring stats for their agents" ON public.agent_monitoring_stats
    FOR SELECT USING (
        agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    );

CREATE POLICY "System can manage monitoring stats" ON public.agent_monitoring_stats
    FOR ALL WITH CHECK (true);

CREATE POLICY "Users can view their fallback events" ON public.agent_fallback_events
    FOR SELECT USING (
        triggered_by_user_id = auth.uid() OR
        failed_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()) OR
        fallback_agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
    );

CREATE POLICY "System can manage fallback events" ON public.agent_fallback_events
    FOR ALL WITH CHECK (true);

CREATE POLICY "Users can view their alerts" ON public.system_alerts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can acknowledge their alerts" ON public.system_alerts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create alerts" ON public.system_alerts
    FOR INSERT WITH CHECK (true);

-- Health status calculation function
CREATE OR REPLACE FUNCTION calculate_agent_health_status(
    p_agent_id UUID,
    p_window_minutes INTEGER DEFAULT 15
) RETURNS health_status AS $$
DECLARE
    v_recent_checks INTEGER;
    v_successful_checks INTEGER;
    v_avg_response_time INTEGER;
    v_success_rate DECIMAL;
BEGIN
    -- Get recent health checks within the window
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE success = true),
        AVG(response_time) FILTER (WHERE success = true)
    INTO v_recent_checks, v_successful_checks, v_avg_response_time
    FROM public.agent_health_checks
    WHERE agent_id = p_agent_id
        AND checked_at >= NOW() - INTERVAL '1 minute' * p_window_minutes;

    -- If no recent checks, return unknown
    IF v_recent_checks = 0 THEN
        RETURN 'unknown';
    END IF;

    -- Calculate success rate
    v_success_rate := (v_successful_checks::DECIMAL / v_recent_checks::DECIMAL) * 100;

    -- Determine health status
    IF v_success_rate < 50 THEN
        RETURN 'fail';
    ELSIF v_success_rate < 80 OR v_avg_response_time > 5000 THEN
        RETURN 'warn';
    ELSE
        RETURN 'ok';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Agent health status update function
CREATE OR REPLACE FUNCTION update_agent_health_status(p_agent_id UUID)
RETURNS void AS $$
DECLARE
    v_health_status health_status;
    v_consecutive_failures INTEGER;
BEGIN
    -- Calculate current health status
    v_health_status := calculate_agent_health_status(p_agent_id, 15);

    -- Count consecutive failures in last 5 minutes
    SELECT COUNT(*)
    INTO v_consecutive_failures
    FROM public.agent_health_checks
    WHERE agent_id = p_agent_id
        AND checked_at >= NOW() - INTERVAL '5 minutes'
        AND success = false
        AND checked_at >= (
            SELECT COALESCE(MAX(checked_at), NOW() - INTERVAL '5 minutes')
            FROM public.agent_health_checks
            WHERE agent_id = p_agent_id AND success = true
        );

    -- Update agent record
    UPDATE public.agents SET
        health_status = v_health_status,
        consecutive_failures = v_consecutive_failures,
        last_failure_time = CASE
            WHEN v_health_status = 'fail' THEN NOW()
            ELSE last_failure_time
        END,
        updated_at = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Monitoring schema setup completed successfully!' as status;