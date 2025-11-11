-- Setup prioritized agent stack: GPT-4o > Claude > Gemini > Llama
-- Run this script to set default priorities for existing agents

-- Update agent priorities based on provider/model names
UPDATE public.agents SET
    priority = CASE
        -- GPT-4o (highest priority)
        WHEN name ILIKE '%gpt-4o%' OR name ILIKE '%gpt-4-turbo%' THEN 10

        -- GPT-4 (second highest)
        WHEN name ILIKE '%gpt-4%' OR name ILIKE '%openai%' THEN 20

        -- Claude (third priority)
        WHEN name ILIKE '%claude%' OR name ILIKE '%anthropic%' THEN 30

        -- Gemini (fourth priority)
        WHEN name ILIKE '%gemini%' OR name ILIKE '%google%' OR name ILIKE '%vertex%' THEN 40

        -- Llama (lowest priority)
        WHEN name ILIKE '%llama%' OR name ILIKE '%together%' OR name ILIKE '%meta%' THEN 50

        -- Custom/other agents (medium priority)
        ELSE 35
    END,

    -- Enable fallback for all agents by default
    is_fallback_enabled = true,

    -- Set category based on priority
    category = CASE
        WHEN name ILIKE '%gpt-4o%' OR name ILIKE '%gpt-4-turbo%' THEN 'primary'
        WHEN name ILIKE '%gpt-4%' OR name ILIKE '%openai%' THEN 'primary'
        WHEN name ILIKE '%claude%' OR name ILIKE '%anthropic%' THEN 'secondary'
        WHEN name ILIKE '%gemini%' OR name ILIKE '%google%' OR name ILIKE '%vertex%' THEN 'fallback'
        WHEN name ILIKE '%llama%' OR name ILIKE '%together%' OR name ILIKE '%meta%' THEN 'emergency'
        ELSE 'secondary'
    END

WHERE priority IS NULL OR priority = 50;

-- Display the updated priorities
SELECT
    name,
    role,
    priority,
    category,
    is_fallback_enabled,
    status
FROM public.agents
ORDER BY role, priority ASC;

-- Create sample agent configurations for testing (uncomment if needed)
/*
-- Sample GPT-4o agent
INSERT INTO public.agents (user_id, name, role, function, endpoint, auth_method, status, priority, category) VALUES
(
    'YOUR_USER_ID_HERE',
    'GPT-4o Scout',
    'content_discovery',
    'Advanced signal detection with GPT-4o',
    'https://api.openai.com/v1/chat/completions',
    'bearer_token',
    'active',
    10,
    'primary'
);

-- Sample Claude agent
INSERT INTO public.agents (user_id, name, role, function, endpoint, auth_method, status, priority, category) VALUES
(
    'YOUR_USER_ID_HERE',
    'Claude Editorial Pro',
    'content_refinement',
    'Content refinement with Claude-3.5-Sonnet',
    'https://api.anthropic.com/v1/messages',
    'api_key',
    'active',
    30,
    'secondary'
);

-- Sample Gemini agent
INSERT INTO public.agents (user_id, name, role, function, endpoint, auth_method, status, priority, category) VALUES
(
    'YOUR_USER_ID_HERE',
    'Gemini Analyst',
    'data_analysis',
    'Data analysis with Gemini Pro',
    'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
    'api_key',
    'active',
    40,
    'fallback'
);

-- Sample Llama agent
INSERT INTO public.agents (user_id, name, role, function, endpoint, auth_method, status, priority, category) VALUES
(
    'YOUR_USER_ID_HERE',
    'Llama Emergency',
    'fallback_processing',
    'Emergency processing with Llama',
    'https://api.together.xyz/inference',
    'bearer_token',
    'active',
    50,
    'emergency'
);
*/

-- Verify fallback configurations
SELECT
    role,
    COUNT(*) as agent_count,
    COUNT(*) FILTER (WHERE status = 'active') as active_count,
    COUNT(*) FILTER (WHERE is_fallback_enabled = true) as fallback_enabled_count,
    MIN(priority) as highest_priority,
    MAX(priority) as lowest_priority
FROM public.agents
GROUP BY role
ORDER BY role;