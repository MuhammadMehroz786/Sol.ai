-- Create enums for agent status, authentication methods, and roles
CREATE TYPE agent_status AS ENUM ('active', 'inactive', 'planned', 'error');
CREATE TYPE auth_method AS ENUM ('bearer_token', 'api_key', 'basic_auth', 'oauth', 'custom');
CREATE TYPE agent_role AS ENUM ('content_discovery', 'content_refinement', 'data_analysis', 'fallback_processing', 'custom');

-- Create the agents table
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Basic agent info
    name TEXT NOT NULL,
    role agent_role NOT NULL DEFAULT 'custom',
    function TEXT NOT NULL,

    -- API configuration
    endpoint TEXT NOT NULL,
    auth_method auth_method NOT NULL DEFAULT 'api_key',
    api_key_encrypted TEXT, -- Encrypted API key/token
    api_headers JSONB DEFAULT '{}', -- Additional headers

    -- Schema definitions
    input_schema JSONB, -- JSON schema for input validation
    output_schema JSONB, -- JSON schema for output validation

    -- Status and monitoring
    status agent_status NOT NULL DEFAULT 'planned',
    last_ping TIMESTAMPTZ,
    response_time INTEGER, -- in milliseconds
    success_rate DECIMAL(5,2) DEFAULT 0.0, -- percentage
    error_count INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON public.agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_role ON public.agents(role);
CREATE INDEX IF NOT EXISTS idx_agents_updated_at ON public.agents(updated_at DESC);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own agents
CREATE POLICY "Users can view their own agents" ON public.agents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agents" ON public.agents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" ON public.agents
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" ON public.agents
    FOR DELETE USING (auth.uid() = user_id);

-- Create a table for agent health checks history (optional)
CREATE TABLE IF NOT EXISTS public.agent_health_checks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,

    -- Health check results
    success BOOLEAN NOT NULL,
    response_time INTEGER, -- in milliseconds
    status_code INTEGER,
    error_message TEXT,

    -- Timestamp
    checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for health checks
CREATE INDEX IF NOT EXISTS idx_agent_health_checks_agent_id ON public.agent_health_checks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_health_checks_checked_at ON public.agent_health_checks(checked_at DESC);

-- RLS for health checks
ALTER TABLE public.agent_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view health checks for their agents" ON public.agent_health_checks
    FOR SELECT USING (
        agent_id IN (
            SELECT id FROM public.agents WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert health checks" ON public.agent_health_checks
    FOR INSERT WITH CHECK (true); -- Allow system to insert health checks

-- Insert some sample agents (optional - for testing)
-- Note: These would be inserted after a user signs up, so user_id would be real
/*
INSERT INTO public.agents (user_id, name, role, function, endpoint, auth_method, status, input_schema, output_schema) VALUES
(
    'YOUR_USER_ID_HERE', -- Replace with actual user ID
    'GPT-4 Scout',
    'content_discovery',
    'Signal Detection & Analysis',
    'https://api.openai.com/v1/chat/completions',
    'bearer_token',
    'active',
    '{"type": "object", "properties": {"model": {"type": "string"}, "messages": {"type": "array"}}, "required": ["model", "messages"]}',
    '{"type": "object", "properties": {"choices": {"type": "array"}}}'
),
(
    'YOUR_USER_ID_HERE', -- Replace with actual user ID
    'Claude Editorial',
    'content_refinement',
    'Article & Tweet Generation',
    'https://api.anthropic.com/v1/messages',
    'api_key',
    'active',
    '{"type": "object", "properties": {"model": {"type": "string"}, "max_tokens": {"type": "number"}, "messages": {"type": "array"}}, "required": ["model", "max_tokens", "messages"]}',
    '{"type": "object", "properties": {"content": {"type": "string"}}}'
);
*/