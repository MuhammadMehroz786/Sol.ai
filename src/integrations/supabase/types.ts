export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      agent_fallback_events: {
        Row: {
          agent_role: Database["public"]["Enums"]["agent_role"] | null
          consecutive_failures: number | null
          failed_agent_id: string | null
          failure_reason: string | null
          fallback_agent_id: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          trigger_type: string
          triggered_at: string
          triggered_by_user_id: string | null
        }
        Insert: {
          agent_role?: Database["public"]["Enums"]["agent_role"] | null
          consecutive_failures?: number | null
          failed_agent_id?: string | null
          failure_reason?: string | null
          fallback_agent_id?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          trigger_type: string
          triggered_at?: string
          triggered_by_user_id?: string | null
        }
        Update: {
          agent_role?: Database["public"]["Enums"]["agent_role"] | null
          consecutive_failures?: number | null
          failed_agent_id?: string | null
          failure_reason?: string | null
          fallback_agent_id?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          trigger_type?: string
          triggered_at?: string
          triggered_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_fallback_events_failed_agent_id_fkey"
            columns: ["failed_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_fallback_events_fallback_agent_id_fkey"
            columns: ["fallback_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_health_checks: {
        Row: {
          agent_id: string
          checked_at: string
          error_message: string | null
          error_type: string | null
          health_status: Database["public"]["Enums"]["health_status"]
          id: string
          request_method: string | null
          request_payload: Json | null
          response_payload: Json | null
          response_time: number | null
          status_code: number | null
          success: boolean
        }
        Insert: {
          agent_id: string
          checked_at?: string
          error_message?: string | null
          error_type?: string | null
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          request_method?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_time?: number | null
          status_code?: number | null
          success: boolean
        }
        Update: {
          agent_id?: string
          checked_at?: string
          error_message?: string | null
          error_type?: string | null
          health_status?: Database["public"]["Enums"]["health_status"]
          id?: string
          request_method?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          response_time?: number | null
          status_code?: number | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "agent_health_checks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_monitoring_stats: {
        Row: {
          agent_id: string
          avg_response_time: number | null
          created_at: string
          failed_requests: number | null
          health_status: Database["public"]["Enums"]["health_status"] | null
          id: string
          max_response_time: number | null
          min_response_time: number | null
          success_rate: number | null
          successful_requests: number | null
          total_requests: number | null
          uptime_percentage: number | null
          window_end: string
          window_start: string
        }
        Insert: {
          agent_id: string
          avg_response_time?: number | null
          created_at?: string
          failed_requests?: number | null
          health_status?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          max_response_time?: number | null
          min_response_time?: number | null
          success_rate?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          uptime_percentage?: number | null
          window_end: string
          window_start: string
        }
        Update: {
          agent_id?: string
          avg_response_time?: number | null
          created_at?: string
          failed_requests?: number | null
          health_status?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          max_response_time?: number | null
          min_response_time?: number | null
          success_rate?: number | null
          successful_requests?: number | null
          total_requests?: number | null
          uptime_percentage?: number | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_monitoring_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent: string
          cost_usd: number | null
          created_at: string | null
          error: Json | null
          id: string
          idempotency_key: string
          input_hash: string
          status: string
          tokens: number | null
          user_id: string
        }
        Insert: {
          agent: string
          cost_usd?: number | null
          created_at?: string | null
          error?: Json | null
          id?: string
          idempotency_key: string
          input_hash: string
          status: string
          tokens?: number | null
          user_id: string
        }
        Update: {
          agent?: string
          cost_usd?: number | null
          created_at?: string | null
          error?: Json | null
          id?: string
          idempotency_key?: string
          input_hash?: string
          status?: string
          tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          api_headers: Json | null
          api_key_encrypted: string | null
          auth_method: Database["public"]["Enums"]["auth_method"]
          avg_response_time: number | null
          category: Database["public"]["Enums"]["agent_category"] | null
          consecutive_failures: number | null
          created_at: string
          endpoint: string
          error_count: number | null
          function: string
          health_status: Database["public"]["Enums"]["health_status"] | null
          id: string
          input_schema: Json | null
          is_fallback_enabled: boolean | null
          last_failure_time: string | null
          last_ping: string | null
          name: string
          output_schema: Json | null
          priority: number | null
          response_time: number | null
          role: Database["public"]["Enums"]["agent_role"] | null
          status: Database["public"]["Enums"]["agent_status"]
          success_rate: number | null
          total_requests: number | null
          updated_at: string
          uptime_percentage: number | null
          user_id: string
        }
        Insert: {
          api_headers?: Json | null
          api_key_encrypted?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method"]
          avg_response_time?: number | null
          category?: Database["public"]["Enums"]["agent_category"] | null
          consecutive_failures?: number | null
          created_at?: string
          endpoint: string
          error_count?: number | null
          function: string
          health_status?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          input_schema?: Json | null
          is_fallback_enabled?: boolean | null
          last_failure_time?: string | null
          last_ping?: string | null
          name: string
          output_schema?: Json | null
          priority?: number | null
          response_time?: number | null
          role?: Database["public"]["Enums"]["agent_role"] | null
          status?: Database["public"]["Enums"]["agent_status"]
          success_rate?: number | null
          total_requests?: number | null
          updated_at?: string
          uptime_percentage?: number | null
          user_id: string
        }
        Update: {
          api_headers?: Json | null
          api_key_encrypted?: string | null
          auth_method?: Database["public"]["Enums"]["auth_method"]
          avg_response_time?: number | null
          category?: Database["public"]["Enums"]["agent_category"] | null
          consecutive_failures?: number | null
          created_at?: string
          endpoint?: string
          error_count?: number | null
          function?: string
          health_status?: Database["public"]["Enums"]["health_status"] | null
          id?: string
          input_schema?: Json | null
          is_fallback_enabled?: boolean | null
          last_failure_time?: string | null
          last_ping?: string | null
          name?: string
          output_schema?: Json | null
          priority?: number | null
          response_time?: number | null
          role?: Database["public"]["Enums"]["agent_role"] | null
          status?: Database["public"]["Enums"]["agent_status"]
          success_rate?: number | null
          total_requests?: number | null
          updated_at?: string
          uptime_percentage?: number | null
          user_id?: string
        }
        Relationships: []
      }
      content_outputs: {
        Row: {
          content: string
          created_at: string
          id: string
          output_type: string
          persona: string
          status: string
          title: string
          tones: string[] | null
          topic_context: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          output_type: string
          persona: string
          status?: string
          title: string
          tones?: string[] | null
          topic_context?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          output_type?: string
          persona?: string
          status?: string
          title?: string
          tones?: string[] | null
          topic_context?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      editorial_scores: {
        Row: {
          accessibility_score: number | null
          article_content: string
          article_title: string
          black_expertise_score: number | null
          clarity_score: number | null
          created_at: string | null
          cultural_context_score: number | null
          freshness_score: number | null
          id: number
          integrity_score: number | null
          summary: string | null
          total_score: number
        }
        Insert: {
          accessibility_score?: number | null
          article_content: string
          article_title: string
          black_expertise_score?: number | null
          clarity_score?: number | null
          created_at?: string | null
          cultural_context_score?: number | null
          freshness_score?: number | null
          id?: number
          integrity_score?: number | null
          summary?: string | null
          total_score: number
        }
        Update: {
          accessibility_score?: number | null
          article_content?: string
          article_title?: string
          black_expertise_score?: number | null
          clarity_score?: number | null
          created_at?: string | null
          cultural_context_score?: number | null
          freshness_score?: number | null
          id?: number
          integrity_score?: number | null
          summary?: string | null
          total_score?: number
        }
        Relationships: []
      }
      feeds: {
        Row: {
          active: boolean | null
          base_url: string | null
          created_at: string | null
          feed_url: string | null
          has_rss: boolean | null
          id: string
          last_checked: string | null
          last_error: string | null
          ownership: string | null
          refresh_minutes: number | null
          region: string | null
          scrape_needed: boolean | null
          source_name: string
          tier: string | null
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          base_url?: string | null
          created_at?: string | null
          feed_url?: string | null
          has_rss?: boolean | null
          id?: string
          last_checked?: string | null
          last_error?: string | null
          ownership?: string | null
          refresh_minutes?: number | null
          region?: string | null
          scrape_needed?: boolean | null
          source_name: string
          tier?: string | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          base_url?: string | null
          created_at?: string | null
          feed_url?: string | null
          has_rss?: boolean | null
          id?: string
          last_checked?: string | null
          last_error?: string | null
          ownership?: string | null
          refresh_minutes?: number | null
          region?: string | null
          scrape_needed?: boolean | null
          source_name?: string
          tier?: string | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      output_packs: {
        Row: {
          created_at: string | null
          date: string | null
          editorial_pack: Json | null
          exec_pack: Json | null
          id: string
          social_pack: Json | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          editorial_pack?: Json | null
          exec_pack?: Json | null
          id?: string
          social_pack?: Json | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          editorial_pack?: Json | null
          exec_pack?: Json | null
          id?: string
          social_pack?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      signals_in: {
        Row: {
          created_at: string | null
          id: string
          published_at: string | null
          source: string | null
          text: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          source?: string | null
          text?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          published_at?: string | null
          source?: string | null
          text?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: []
      }
      signals_ranked: {
        Row: {
          analyzed_at: string | null
          community_context: string | null
          confidence: number | null
          headline: string | null
          id: string
          narrative_stakes: string[] | null
          published_at: string | null
          rationale: string | null
          score: number | null
          source: string | null
          summary: string | null
          signal_type: string | null
          tag: string | null
          url: string | null
          use_mode: string[] | null
          user_id: string | null
        }
        Insert: {
          analyzed_at?: string | null
          community_context?: string | null
          confidence?: number | null
          headline?: string | null
          id?: string
          narrative_stakes?: string[] | null
          published_at?: string | null
          rationale?: string | null
          score?: number | null
          signal_type?: string | null
          source?: string | null
          summary?: string | null
          tag?: string | null
          url?: string | null
          use_mode?: string[] | null
          user_id?: string | null
        }
        Update: {
          analyzed_at?: string | null
          community_context?: string | null
          confidence?: number | null
          headline?: string | null
          id?: string
          narrative_stakes?: string[] | null
          published_at?: string | null
          rationale?: string | null
          score?: number | null
          signal_type?: string | null
          source?: string | null
          summary?: string | null
          tag?: string | null
          url?: string | null
          use_mode?: string[] | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_outputs: {
        Row: {
          artifact: Json
          compliance: Json | null
          created_at: string | null
          cta: string | null
          est_read_time_sec: number | null
          hashtags: Json | null
          id: string
          platform: string
          run_id: string | null
          user_id: string
        }
        Insert: {
          artifact: Json
          compliance?: Json | null
          created_at?: string | null
          cta?: string | null
          est_read_time_sec?: number | null
          hashtags?: Json | null
          id?: string
          platform: string
          run_id?: string | null
          user_id: string
        }
        Update: {
          artifact?: Json
          compliance?: Json | null
          created_at?: string | null
          cta?: string | null
          est_read_time_sec?: number | null
          hashtags?: Json | null
          id?: string
          platform?: string
          run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_outputs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          agent_id: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          id: string
          is_acknowledged: boolean | null
          message: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
          user_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          is_acknowledged?: boolean | null
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          severity: string
          title: string
          user_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          agent_id?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          is_acknowledged?: boolean | null
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_kv: {
        Row: {
          last_updated: string | null
          streak_days: number | null
          topic_key: string
          trend30: number | null
          trend7: number | null
        }
        Insert: {
          last_updated?: string | null
          streak_days?: number | null
          topic_key: string
          trend30?: number | null
          trend7?: number | null
        }
        Update: {
          last_updated?: string | null
          streak_days?: number | null
          topic_key?: string
          trend30?: number | null
          trend7?: number | null
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          created_at: string | null
          id: string
          profile_name: string
          samples: string[] | null
          style_json: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_name: string
          samples?: string[] | null
          style_json: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_name?: string
          samples?: string[] | null
          style_json?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_agent_health_status: {
        Args: { p_agent_id: string; p_window_minutes?: number }
        Returns: Database["public"]["Enums"]["health_status"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_agent_health_status: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
    }
    Enums: {
      agent_category: "primary" | "secondary" | "fallback" | "emergency"
      agent_role: "admin" | "editor" | "viewer" | "moderator" | "custom"
      agent_status: "active" | "inactive" | "planned" | "error"
      alert_type:
        | "agent_down"
        | "high_latency"
        | "category_failure"
        | "all_agents_down"
      app_role: "admin" | "editor" | "viewer"
      auth_method:
        | "bearer_token"
        | "api_key"
        | "basic_auth"
        | "oauth"
        | "custom"
      health_status: "ok" | "warn" | "fail" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_category: ["primary", "secondary", "fallback", "emergency"],
      agent_role: ["admin", "editor", "viewer", "moderator", "custom"],
      agent_status: ["active", "inactive", "planned", "error"],
      alert_type: [
        "agent_down",
        "high_latency",
        "category_failure",
        "all_agents_down",
      ],
      app_role: ["admin", "editor", "viewer"],
      auth_method: ["bearer_token", "api_key", "basic_auth", "oauth", "custom"],
      health_status: ["ok", "warn", "fail", "unknown"],
    },
  },
} as const
