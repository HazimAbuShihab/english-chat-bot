// =============================================================================
// Auto-generated Supabase types. Regenerate with:
//   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
// (or via the Supabase MCP `generate_typescript_types` tool)
// =============================================================================
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      answer_evaluations: {
        Row: {
          answer_id: string;
          cefr_level: Database["public"]["Enums"]["cefr_level"] | null;
          communication_score: number | null;
          created_at: string;
          evaluation_id: string;
          feedback: string | null;
          fluency_score: number | null;
          grammar_score: number | null;
          id: string;
          overall_score: number | null;
          pronunciation_score: number | null;
          question_id: string | null;
          raw: Json | null;
          vocabulary_score: number | null;
        };
        Insert: {
          answer_id: string;
          cefr_level?: Database["public"]["Enums"]["cefr_level"] | null;
          communication_score?: number | null;
          created_at?: string;
          evaluation_id: string;
          feedback?: string | null;
          fluency_score?: number | null;
          grammar_score?: number | null;
          id?: string;
          overall_score?: number | null;
          pronunciation_score?: number | null;
          question_id?: string | null;
          raw?: Json | null;
          vocabulary_score?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["answer_evaluations"]["Insert"]>;
        Relationships: [];
      };
      answers: {
        Row: {
          answered_at: string | null;
          audio_file_id: string | null;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          meta: Json;
          organization_id: string;
          position: number | null;
          question_id: string;
          session_id: string;
          skipped: boolean;
          status: Database["public"]["Enums"]["answer_status"];
          transcript: string | null;
          updated_at: string;
        };
        Insert: {
          answered_at?: string | null;
          audio_file_id?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          meta?: Json;
          organization_id: string;
          position?: number | null;
          question_id: string;
          session_id: string;
          skipped?: boolean;
          status?: Database["public"]["Enums"]["answer_status"];
          transcript?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["answers"]["Insert"]>;
        Relationships: [];
      };
      audio_files: {
        Row: {
          bucket: string;
          checksum: string | null;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          mime_type: string | null;
          organization_id: string;
          session_id: string | null;
          size_bytes: number | null;
          storage_path: string;
          student_id: string | null;
          uploaded_by: string | null;
        };
        Insert: {
          bucket?: string;
          checksum?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          mime_type?: string | null;
          organization_id: string;
          session_id?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          student_id?: string | null;
          uploaded_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["audio_files"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          description: string | null;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          ip: unknown;
          metadata: Json;
          organization_id: string | null;
          user_agent: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          description?: string | null;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          ip?: unknown;
          metadata?: Json;
          organization_id?: string | null;
          user_agent?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          color: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      evaluations: {
        Row: {
          cefr_level: Database["public"]["Enums"]["cefr_level"] | null;
          communication_score: number | null;
          completed_at: string | null;
          created_at: string;
          error: string | null;
          evaluator: Database["public"]["Enums"]["evaluator_type"];
          evaluator_version: string | null;
          feedback: string | null;
          fluency_score: number | null;
          grammar_score: number | null;
          id: string;
          improvements: string[] | null;
          organization_id: string;
          overall_score: number | null;
          pronunciation_score: number | null;
          raw_result: Json | null;
          requested_at: string;
          session_id: string;
          status: Database["public"]["Enums"]["evaluation_status"];
          strengths: string[] | null;
          student_id: string | null;
          updated_at: string;
          vocabulary_score: number | null;
        };
        Insert: {
          cefr_level?: Database["public"]["Enums"]["cefr_level"] | null;
          communication_score?: number | null;
          completed_at?: string | null;
          created_at?: string;
          error?: string | null;
          evaluator?: Database["public"]["Enums"]["evaluator_type"];
          evaluator_version?: string | null;
          feedback?: string | null;
          fluency_score?: number | null;
          grammar_score?: number | null;
          id?: string;
          improvements?: string[] | null;
          organization_id: string;
          overall_score?: number | null;
          pronunciation_score?: number | null;
          raw_result?: Json | null;
          requested_at?: string;
          session_id: string;
          status?: Database["public"]["Enums"]["evaluation_status"];
          strengths?: string[] | null;
          student_id?: string | null;
          updated_at?: string;
          vocabulary_score?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["evaluations"]["Insert"]>;
        Relationships: [];
      };
      exam_assignments: {
        Row: {
          assigned_by: string | null;
          attempts_used: number;
          created_at: string;
          due_at: string | null;
          exam_id: string;
          id: string;
          invited_at: string;
          organization_id: string;
          status: Database["public"]["Enums"]["assignment_status"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          assigned_by?: string | null;
          attempts_used?: number;
          created_at?: string;
          due_at?: string | null;
          exam_id: string;
          id?: string;
          invited_at?: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["assignment_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_assignments"]["Insert"]>;
        Relationships: [];
      };
      exam_questions: {
        Row: {
          created_at: string;
          id: string;
          is_required: boolean;
          points: number | null;
          position: number;
          question_id: string;
          template_id: string;
          time_limit_seconds: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_required?: boolean;
          points?: number | null;
          position?: number;
          question_id: string;
          template_id: string;
          time_limit_seconds?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["exam_questions"]["Insert"]>;
        Relationships: [];
      };
      exam_sessions: {
        Row: {
          assignment_id: string | null;
          attempt_number: number;
          created_at: string;
          current_index: number;
          exam_id: string;
          expires_at: string | null;
          id: string;
          meta: Json;
          organization_id: string;
          question_order: Json;
          started_at: string | null;
          status: Database["public"]["Enums"]["session_status"];
          student_id: string;
          submitted_at: string | null;
          total_time_seconds: number | null;
          updated_at: string;
        };
        Insert: {
          assignment_id?: string | null;
          attempt_number?: number;
          created_at?: string;
          current_index?: number;
          exam_id: string;
          expires_at?: string | null;
          id?: string;
          meta?: Json;
          organization_id: string;
          question_order?: Json;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["session_status"];
          student_id: string;
          submitted_at?: string | null;
          total_time_seconds?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_sessions"]["Insert"]>;
        Relationships: [];
      };
      exam_templates: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          id: string;
          instructions: string | null;
          max_attempts: number;
          organization_id: string;
          passing_score: number;
          question_count: number | null;
          randomize_categories: boolean;
          randomize_questions: boolean;
          retake_policy: Database["public"]["Enums"]["retake_policy"];
          show_results_to_student: boolean;
          status: Database["public"]["Enums"]["template_status"];
          title: string;
          total_time_limit_seconds: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          instructions?: string | null;
          max_attempts?: number;
          organization_id: string;
          passing_score?: number;
          question_count?: number | null;
          randomize_categories?: boolean;
          randomize_questions?: boolean;
          retake_policy?: Database["public"]["Enums"]["retake_policy"];
          show_results_to_student?: boolean;
          status?: Database["public"]["Enums"]["template_status"];
          title: string;
          total_time_limit_seconds?: number | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exam_templates"]["Insert"]>;
        Relationships: [];
      };
      exams: {
        Row: {
          available_from: string | null;
          available_until: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          id: string;
          join_code: string | null;
          max_attempts: number;
          organization_id: string;
          passing_score: number;
          settings: Json;
          show_results_to_student: boolean;
          status: Database["public"]["Enums"]["exam_status"];
          template_id: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          available_from?: string | null;
          available_until?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          join_code?: string | null;
          max_attempts?: number;
          organization_id: string;
          passing_score?: number;
          settings?: Json;
          show_results_to_student?: boolean;
          status?: Database["public"]["Enums"]["exam_status"];
          template_id?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["exams"]["Insert"]>;
        Relationships: [];
      };
      invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          code: string | null;
          created_at: string;
          email: string | null;
          exam_id: string | null;
          expires_at: string | null;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: string;
          status: Database["public"]["Enums"]["invitation_status"];
          token: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          code?: string | null;
          created_at?: string;
          email?: string | null;
          exam_id?: string | null;
          expires_at?: string | null;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role?: string;
          status?: Database["public"]["Enums"]["invitation_status"];
          token: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invitations"]["Insert"]>;
        Relationships: [];
      };
      organizations: {
        Row: {
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          logo_url: string | null;
          max_students: number | null;
          name: string;
          plan: string;
          settings: Json;
          slug: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          logo_url?: string | null;
          max_students?: number | null;
          name: string;
          plan?: string;
          settings?: Json;
          slug: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          full_name: string | null;
          id: string;
          last_seen_at: string | null;
          locale: string;
          metadata: Json;
          native_language: string | null;
          organization_id: string | null;
          phone: string | null;
          role: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          full_name?: string | null;
          id: string;
          last_seen_at?: string | null;
          locale?: string;
          metadata?: Json;
          native_language?: string | null;
          organization_id?: string | null;
          phone?: string | null;
          role?: string;
          status?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      questions: {
        Row: {
          audio_url: string | null;
          category_id: string | null;
          cefr_level: Database["public"]["Enums"]["cefr_level"];
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          difficulty: Database["public"]["Enums"]["difficulty_level"];
          id: string;
          is_active: boolean;
          max_score: number;
          organization_id: string | null;
          prep_time_seconds: number;
          question_text: string;
          tags: string[];
          time_limit_seconds: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          audio_url?: string | null;
          category_id?: string | null;
          cefr_level?: Database["public"]["Enums"]["cefr_level"];
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          difficulty?: Database["public"]["Enums"]["difficulty_level"];
          id?: string;
          is_active?: boolean;
          max_score?: number;
          organization_id?: string | null;
          prep_time_seconds?: number;
          question_text: string;
          tags?: string[];
          time_limit_seconds?: number;
          title: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["questions"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          data: Json;
          evaluation_id: string | null;
          exam_id: string | null;
          generated_by: string | null;
          id: string;
          organization_id: string;
          pdf_path: string | null;
          report_type: string;
          session_id: string | null;
          status: Database["public"]["Enums"]["report_status"];
          student_id: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          data?: Json;
          evaluation_id?: string | null;
          exam_id?: string | null;
          generated_by?: string | null;
          id?: string;
          organization_id: string;
          pdf_path?: string | null;
          report_type?: string;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
          student_id?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          key: string;
          name: string;
          rank: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key: string;
          name: string;
          rank?: number;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: { Args: Record<string, never>; Returns: string };
      current_role_key: { Args: Record<string, never>; Returns: string };
      generate_code: { Args: { len?: number }; Returns: string };
      get_session_detail: { Args: { p_session_id: string }; Returns: Json };
      is_org_admin: { Args: Record<string, never>; Returns: boolean };
      is_org_admin_of: { Args: { org: string }; Returns: boolean };
      is_org_member: { Args: { org: string }; Returns: boolean };
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
      log_audit_event: {
        Args: {
          p_action: string;
          p_description?: string;
          p_entity_id?: string;
          p_entity_type?: string;
          p_metadata?: Json;
        };
        Returns: string;
      };
      org_dashboard_stats: { Args: { p_org: string }; Returns: Json };
      platform_stats: { Args: Record<string, never>; Returns: Json };
      start_exam_session: { Args: { p_exam_id: string }; Returns: string };
      submit_exam_session: { Args: { p_session_id: string }; Returns: string };
    };
    Enums: {
      answer_status: "pending" | "recorded" | "uploaded" | "skipped";
      assignment_status:
        | "assigned"
        | "started"
        | "submitted"
        | "evaluated"
        | "expired"
        | "cancelled";
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
      difficulty_level: "easy" | "medium" | "hard";
      evaluation_status: "pending" | "processing" | "completed" | "failed";
      evaluator_type: "mock" | "manual" | "ai";
      exam_status: "draft" | "scheduled" | "active" | "closed" | "archived";
      invitation_status: "pending" | "accepted" | "expired" | "revoked";
      report_status: "pending" | "ready" | "failed";
      retake_policy: "none" | "limited" | "unlimited";
      session_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "abandoned"
        | "evaluating"
        | "evaluated"
        | "expired";
      template_status: "draft" | "published" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T];
