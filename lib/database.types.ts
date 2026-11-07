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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agreements: {
        Row: {
          allowed_channels: string[]
          brand_rules: string
          business_accepted_at: string | null
          campaign_id: string
          commission_minor: number
          created_at: string
          id: string
          payout_days: number
          refund_window_days: number
          template_version: string
          version: number
        }
        Insert: {
          allowed_channels?: string[]
          brand_rules?: string
          business_accepted_at?: string | null
          campaign_id: string
          commission_minor: number
          created_at?: string
          id?: string
          payout_days: number
          refund_window_days: number
          template_version?: string
          version: number
        }
        Update: {
          allowed_channels?: string[]
          brand_rules?: string
          business_accepted_at?: string | null
          campaign_id?: string
          commission_minor?: number
          created_at?: string
          id?: string
          payout_days?: number
          refund_window_days?: number
          template_version?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agreements_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_contacts: {
        Row: {
          booking_id: string
          customer_name: string
          customer_phone: string
        }
        Insert: {
          booking_id: string
          customer_name: string
          customer_phone: string
        }
        Update: {
          booking_id?: string
          customer_name?: string
          customer_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_contacts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        Insert: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at?: string
          currency: string
          fee_bps: number
          fee_minor: number
          id?: string
          payout_at?: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at?: string | null
          refunded_at?: string | null
          released_at?: string | null
          slot_start: string
          status?: string
          verified_at?: string | null
        }
        Update: {
          agreement_id?: string
          business_id?: string
          business_total_minor?: number
          campaign_id?: string
          commission_minor?: number
          created_at?: string
          currency?: string
          fee_bps?: number
          fee_minor?: number
          id?: string
          payout_at?: string | null
          payout_days?: number
          price_minor?: number
          promoter_id?: string
          referral_link_id?: string
          refund_window_days?: number
          refund_window_ends_at?: string | null
          refunded_at?: string | null
          released_at?: string | null
          slot_start?: string
          status?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          category: string
          city: string
          country: string
          created_at: string
          currency: string
          description: string
          id: string
          is_demo: boolean
          logo_url: string | null
          name: string
          owner_id: string
        }
        Insert: {
          category: string
          city?: string
          country: string
          created_at?: string
          currency: string
          description?: string
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
        }
        Update: {
          category?: string
          city?: string
          country?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_memberships: {
        Row: {
          agreement_id: string
          campaign_id: string
          created_at: string
          id: string
          promoter_accepted_at: string
          promoter_id: string
        }
        Insert: {
          agreement_id: string
          campaign_id: string
          created_at?: string
          id?: string
          promoter_accepted_at?: string
          promoter_id: string
        }
        Update: {
          agreement_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          promoter_accepted_at?: string
          promoter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_memberships_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_memberships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_memberships_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          current_agreement_id: string | null
          description: string
          id: string
          image_url: string | null
          price_minor: number
          published_at: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          commission_minor?: number
          created_at?: string
          currency: string
          current_agreement_id?: string | null
          description?: string
          id?: string
          image_url?: string | null
          price_minor: number
          published_at?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          commission_minor?: number
          created_at?: string
          currency?: string
          current_agreement_id?: string | null
          description?: string
          id?: string
          image_url?: string | null
          price_minor?: number
          published_at?: string | null
          service_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_current_agreement_fk"
            columns: ["current_agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account: string
          amount_minor: number
          booking_id: string
          bucket: string
          created_at: string
          currency: string
          entry_type: string
          id: number
          party_id: string | null
        }
        Insert: {
          account: string
          amount_minor: number
          booking_id: string
          bucket: string
          created_at?: string
          currency: string
          entry_type: string
          id?: never
          party_id?: string | null
        }
        Update: {
          account?: string
          amount_minor?: number
          booking_id?: string
          bucket?: string
          created_at?: string
          currency?: string
          entry_type?: string
          id?: never
          party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          payload: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          payload?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          payload?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_demo: boolean
          role: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          is_demo?: boolean
          role?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_demo?: boolean
          role?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          created_at: string
          id: number
          referral_link_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: never
          referral_link_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: never
          referral_link_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_referral_link_id_fkey"
            columns: ["referral_link_id"]
            isOneToOne: false
            referencedRelation: "referral_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_links: {
        Row: {
          campaign_id: string
          code: string
          created_at: string
          id: string
          membership_id: string
          promoter_id: string
        }
        Insert: {
          campaign_id: string
          code: string
          created_at?: string
          id?: string
          membership_id: string
          promoter_id: string
        }
        Update: {
          campaign_id?: string
          code?: string
          created_at?: string
          id?: string
          membership_id?: string
          promoter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: true
            referencedRelation: "campaign_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_links_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _lock_booking_for_owner: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _release_booking: {
        Args: { p_booking: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "bookings"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_join_campaign: {
        Args: { p_agreement_id: string; p_campaign_id: string }
        Returns: boolean
      }
      create_booking: {
        Args: {
          p_customer_name: string
          p_customer_phone: string
          p_fee_bps: number
          p_referral_code: string
          p_slot_start: string
        }
        Returns: string
      }
      current_user_role: { Args: never; Returns: string }
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean }
      is_campaign_member: { Args: { p_campaign_id: string }; Returns: boolean }
      owns_campaign: { Args: { p_campaign_id: string }; Returns: boolean }
      platform_fee_minor: {
        Args: { p_fee_bps: number; p_price_minor: number }
        Returns: number
      }
      purge_demo_data: { Args: never; Returns: undefined }
      refund_booking: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      release_commission: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      simulate_end_of_refund_window: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_booking: {
        Args: { p_actor_id: string; p_booking_id: string }
        Returns: {
          agreement_id: string
          business_id: string
          business_total_minor: number
          campaign_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_bps: number
          fee_minor: number
          id: string
          payout_at: string | null
          payout_days: number
          price_minor: number
          promoter_id: string
          referral_link_id: string
          refund_window_days: number
          refund_window_ends_at: string | null
          refunded_at: string | null
          released_at: string | null
          slot_start: string
          status: string
          verified_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
