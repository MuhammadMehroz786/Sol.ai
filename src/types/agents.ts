import { Database } from "@/integrations/supabase/types";

// Database types
export type Agent = Database['public']['Tables']['agents']['Row'];
export type AgentInsert = Database['public']['Tables']['agents']['Insert'];
export type AgentUpdate = Database['public']['Tables']['agents']['Update'];

// Enums
export type AgentStatus = Database['public']['Enums']['agent_status'];
export type AuthMethod = Database['public']['Enums']['auth_method'];
export type AgentRole = Database['public']['Enums']['agent_role'];

// Enhanced interfaces for UI
export interface AgentWithStats {
  id: string;
  user_id: string;
  name: string;
  role: string;
  function: string;
  endpoint: string;
  auth_method: string;
  api_key_encrypted: string | null;
  api_headers: any;
  input_schema: any;
  output_schema: any;
  status: string;
  last_ping: string | null;
  response_time: number | null;
  success_rate: number | null;
  error_count: number;
  total_requests: number;
  created_at: string;
  updated_at: string;
  health_status?: string;
  category?: string;
  priority?: number;
  is_fallback_enabled?: boolean;
  consecutive_failures?: number;
  last_failure_time?: string | null;
  avg_response_time?: number;
  uptime_percentage?: number;
  last_error?: string;
  is_healthy?: boolean;
}

// Schema validation structures
export interface IOSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, SchemaProperty>;
  required?: string[];
  items?: IOSchema;
  description?: string;
  example?: any;
}

export interface SchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  example?: any;
  enum?: string[];
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  required?: boolean;
}

// Authentication configuration
export interface AuthConfig {
  method: AuthMethod;
  credentials: Record<string, string>;
  headers?: Record<string, string>;
}

// Agent request/response types
export interface AgentRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>;
  body?: any;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  response_time: number;
  status_code: number;
}

// Health check types
export interface HealthCheck {
  agent_id: string;
  timestamp: string;
  success: boolean;
  response_time: number;
  error?: string;
  status_code?: number;
}

// Agent configuration for different providers
export interface AgentProvider {
  name: string;
  baseUrl: string;
  authMethods: AuthMethod[];
  defaultHeaders: Record<string, string>;
  rateLimits?: {
    requests_per_minute: number;
    requests_per_day: number;
  };
}

// Predefined agent templates
export const AGENT_TEMPLATES: Record<string, Partial<AgentInsert>> = {
  openai_gpt4: {
    name: "GPT-4 Agent",
    role: "content_refinement",
    function: "Content Generation and Refinement",
    endpoint: "https://api.openai.com/v1/chat/completions",
    auth_method: "bearer_token",
    input_schema: {
      type: "object",
      properties: {
        model: { type: "string", example: "gpt-4" },
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["system", "user", "assistant"] },
              content: { type: "string" }
            }
          }
        },
        max_tokens: { type: "number", example: 1000 },
        temperature: { type: "number", example: 0.7 }
      },
      required: ["model", "messages"]
    },
    output_schema: {
      type: "object",
      properties: {
        choices: {
          type: "array",
          items: {
            type: "object",
            properties: {
              message: {
                type: "object",
                properties: {
                  content: { type: "string" },
                  role: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },
  claude_anthropic: {
    name: "Claude Agent",
    role: "content_refinement",
    function: "Advanced Content Analysis and Generation",
    endpoint: "https://api.anthropic.com/v1/messages",
    auth_method: "api_key",
    api_headers: {
      "anthropic-version": "2023-06-01"
    },
    input_schema: {
      type: "object",
      properties: {
        model: { type: "string", example: "claude-3-sonnet-20240229" },
        max_tokens: { type: "number", example: 1000 },
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string" }
            }
          }
        }
      },
      required: ["model", "max_tokens", "messages"]
    }
  },
  custom_webhook: {
    name: "Custom Webhook Agent",
    role: "custom",
    function: "Custom processing via webhook",
    auth_method: "bearer_token",
    input_schema: {
      type: "object",
      properties: {
        data: { type: "object" }
      }
    },
    output_schema: {
      type: "object",
      properties: {
        result: { type: "object" }
      }
    }
  }
};

// Agent role configurations
export const AGENT_ROLES: Record<AgentRole, { name: string; description: string; icon: string }> = {
  content_discovery: {
    name: "Content Discovery",
    description: "Discover and analyze content signals from various sources",
    icon: "Search"
  },
  content_refinement: {
    name: "Content Refinement",
    description: "Generate, edit, and improve content quality",
    icon: "Edit"
  },
  data_analysis: {
    name: "Data Analysis",
    description: "Analyze data patterns and generate insights",
    icon: "BarChart"
  },
  fallback_processing: {
    name: "Fallback Processing",
    description: "Handle requests when primary agents are unavailable",
    icon: "Shield"
  },
  custom: {
    name: "Custom",
    description: "Custom agent functionality",
    icon: "Settings"
  }
};

// Validation functions
export const validateAgentSchema = (schema: any): IOSchema | null => {
  try {
    // Basic validation - could be enhanced with JSON Schema validator
    if (typeof schema !== 'object' || !schema.type) {
      return null;
    }
    return schema as IOSchema;
  } catch {
    return null;
  }
};

export const validateEndpoint = (endpoint: string): boolean => {
  try {
    new URL(endpoint);
    return endpoint.startsWith('https://');
  } catch {
    return false;
  }
};