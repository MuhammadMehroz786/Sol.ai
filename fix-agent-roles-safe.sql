-- SAFE MIGRATION: Handle all dependent objects

-- Step 1: Check current values and dependencies
SELECT DISTINCT role FROM agents;

-- Check what other tables use agent_role
SELECT
    t.table_name,
    c.column_name,
    c.data_type
FROM
    information_schema.columns c
    JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE
    c.udt_name = 'agent_role';

-- Step 2: Create new enum type
CREATE TYPE agent_role_new AS ENUM ('admin', 'editor', 'viewer', 'moderator', 'custom');

-- Step 3: Update agents table
ALTER TABLE agents ADD COLUMN role_new agent_role_new;

UPDATE agents SET role_new =
  CASE
    WHEN role = 'content_discovery' THEN 'admin'::agent_role_new
    WHEN role = 'content_refinement' THEN 'editor'::agent_role_new
    WHEN role = 'data_analysis' THEN 'viewer'::agent_role_new
    WHEN role = 'fallback_processing' THEN 'moderator'::agent_role_new
    WHEN role = 'custom' THEN 'custom'::agent_role_new
    ELSE 'custom'::agent_role_new
  END;

ALTER TABLE agents DROP COLUMN role;
ALTER TABLE agents RENAME COLUMN role_new TO role;

-- Step 4: Update agent_fallback_events table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_fallback_events') THEN
        -- Add new column
        ALTER TABLE agent_fallback_events ADD COLUMN agent_role_new agent_role_new;

        -- Update values
        UPDATE agent_fallback_events SET agent_role_new =
          CASE
            WHEN agent_role = 'content_discovery' THEN 'admin'::agent_role_new
            WHEN agent_role = 'content_refinement' THEN 'editor'::agent_role_new
            WHEN agent_role = 'data_analysis' THEN 'viewer'::agent_role_new
            WHEN agent_role = 'fallback_processing' THEN 'moderator'::agent_role_new
            WHEN agent_role = 'custom' THEN 'custom'::agent_role_new
            ELSE 'custom'::agent_role_new
          END;

        -- Drop old column and rename
        ALTER TABLE agent_fallback_events DROP COLUMN agent_role;
        ALTER TABLE agent_fallback_events RENAME COLUMN agent_role_new TO agent_role;
    END IF;
END $$;

-- Step 5: Now safely drop the old enum and rename new one
DROP TYPE agent_role CASCADE;
ALTER TYPE agent_role_new RENAME TO agent_role;

-- Step 6: Verify the change
SELECT DISTINCT role FROM agents;