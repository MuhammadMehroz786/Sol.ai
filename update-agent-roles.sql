-- Update agent_role enum to support admin/editor roles
ALTER TYPE agent_role RENAME TO agent_role_old;

CREATE TYPE agent_role AS ENUM ('admin', 'editor', 'viewer', 'moderator', 'custom');

-- Update the agents table to use the new enum
ALTER TABLE agents
ALTER COLUMN role TYPE agent_role
USING role::text::agent_role;

-- Drop the old enum
DROP TYPE agent_role_old;