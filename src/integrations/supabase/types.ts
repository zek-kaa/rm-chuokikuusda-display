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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp: string
          phone: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          otp: string
          phone: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          full_name: string
          id: string
          member_status: string
          phone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          full_name?: string
          id: string
          member_status?: string
          phone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          full_name?: string
          id?: string
          member_status?: string
          phone?: string
        }
        Relationships: []
      }
      rbac_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          key: string
          module: string
        }
        Insert: {
          key: string
          module: string
        }
        Update: {
          key?: string
          module?: string
        }
        Relationships: []
      }
      rbac_role_permissions: {
        Row: {
          permission_key: string
          role_key: string
        }
        Insert: {
          permission_key: string
          role_key: string
        }
        Update: {
          permission_key?: string
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "rbac_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "rbac_role_permissions_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["key"]
          },
        ]
      }
      rbac_roles: {
        Row: {
          description: string
          key: string
          name: string
        }
        Insert: {
          description: string
          key: string
          name: string
        }
        Update: {
          description?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      rbac_user_roles: {
        Row: {
          role_key: string
          user_id: string
        }
        Insert: {
          role_key: string
          user_id: string
        }
        Update: {
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rbac_user_roles_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "rbac_roles"
            referencedColumns: ["key"]
          },
        ]
      }
      rm_contributions: {
        Row: {
          amount: number
          contributor: string
          created_at: string
          currency: string
          id: string
          reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          contributor: string
          created_at?: string
          currency?: string
          id?: string
          reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          contributor?: string
          created_at?: string
          currency?: string
          id?: string
          reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      treasury_accounts: {
        Row: {
          currency: string
          id: string
          name: string
          opening_balance: number
        }
        Insert: {
          currency: string
          id?: string
          name: string
          opening_balance?: number
        }
        Update: {
          currency?: string
          id?: string
          name?: string
          opening_balance?: number
        }
        Relationships: []
      }
      treasury_audit_flags: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          note: string
          severity: string
          transaction_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          note: string
          severity: string
          transaction_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          note?: string
          severity?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_audit_flags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "treasury_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json
          id: string
          transaction_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          transaction_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "treasury_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_transactions: {
        Row: {
          amount: number
          approved_by: string | null
          attachment_url: string
          breakdown: Json
          category: string
          counterparty: string
          created_at: string
          created_by: string
          currency: string
          id: string
          kind: string
          notes: string
          phone: string
          reference: string
          source_id: string | null
          status: string
          transaction_date: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          attachment_url?: string
          breakdown?: Json
          category: string
          counterparty: string
          created_at?: string
          created_by: string
          currency: string
          id?: string
          kind: string
          notes?: string
          phone?: string
          reference: string
          source_id?: string | null
          status: string
          transaction_date?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          attachment_url?: string
          breakdown?: Json
          category?: string
          counterparty?: string
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          kind?: string
          notes?: string
          phone?: string
          reference?: string
          source_id?: string | null
          status?: string
          transaction_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_treasury_entry: { Args: { p_id: string }; Returns: undefined }
      broadcast_weekly_sabbath_notification: { Args: never; Returns: undefined }
      flag_treasury_entry: {
        Args: { p_id: string; p_note: string; p_severity: string }
        Returns: undefined
      }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      record_treasury_entry: {
        Args: {
          p_amount: number
          p_attachment: string
          p_breakdown: Json
          p_category: string
          p_counterparty: string
          p_currency: string
          p_date: string
          p_kind: string
          p_notes: string
          p_phone: string
          p_reference: string
        }
        Returns: string
      }
      reset_notifications_monthly: { Args: never; Returns: undefined }
      set_user_access: {
        Args: { p_active: boolean; p_role: string; p_user: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
