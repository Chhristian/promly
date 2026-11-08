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
      agreement_documents: {
        Row: {
          campaign_id: string
          file_name: string
          id: string
          sha256: string
          size_bytes: number
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          campaign_id: string
          file_name?: string
          id?: string
          sha256: string
          size_bytes: number
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          campaign_id?: string
          file_name?: string
          id?: string
          sha256?: string
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agreement_documents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agreements: {
        Row: {
          allowed_channels: string[]
          brand_rules: string
          business_accepted_at: string | null
          campaign_id: string
          commission_minor: number
          created_at: string
          document_id: string | null
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
          document_id?: string | null
          id?: string
          payout_days: number
          refund_window_days: number
          template_version?: string
          version?: number
        }
        Update: {
          allowed_channels?: string[]
          brand_rules?: string
          business_accepted_at?: string | null
          campaign_id?: string
          commission_minor?: number
          created_at?: string
          document_id?: string | null
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
          {
            foreignKeyName: "agreements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "agreement_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_paused_campaigns: {
        Row: {
          campaign_id: string
          invoice_id: string
          paused_at: string
        }
        Insert: {
          campaign_id: string
          invoice_id: string
          paused_at?: string
        }
        Update: {
          campaign_id?: string
          invoice_id?: string
          paused_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_paused_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_paused_campaigns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "business_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_contacts: {
        Row: {
          booking_id: string
          consent_at: string | null
          customer_name: string
          customer_phone: string
          customer_phone_norm: string | null
        }
        Insert: {
          booking_id: string
          consent_at?: string | null
          customer_name: string
          customer_phone: string
          customer_phone_norm?: string | null
        }
        Update: {
          booking_id?: string
          consent_at?: string | null
          customer_name?: string
          customer_phone?: string
          customer_phone_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_contacts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_settlement"
            referencedColumns: ["booking_id"]
          },
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
          final_at?: string | null
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
          slot_start?: string | null
          source?: string
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
          final_at?: string | null
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
          slot_start?: string | null
          source?: string
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
      business_invoices: {
        Row: {
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          due_at: string | null
          fee_minor: number
          finalized_at: string | null
          hosted_invoice_url: string | null
          id: string
          overdue_at: string | null
          paid_at: string | null
          payment_failed_at: string | null
          period_month: string
          status: string
          stripe_invoice_id: string | null
          total_minor: number
          voided_at: string | null
        }
        Insert: {
          business_id: string
          commission_minor: number
          created_at?: string
          currency: string
          due_at?: string | null
          fee_minor: number
          finalized_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          overdue_at?: string | null
          paid_at?: string | null
          payment_failed_at?: string | null
          period_month: string
          status?: string
          stripe_invoice_id?: string | null
          total_minor: number
          voided_at?: string | null
        }
        Update: {
          business_id?: string
          commission_minor?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          fee_minor?: number
          finalized_at?: string | null
          hosted_invoice_url?: string | null
          id?: string
          overdue_at?: string | null
          paid_at?: string | null
          payment_failed_at?: string | null
          period_month?: string
          status?: string
          stripe_invoice_id?: string | null
          total_minor?: number
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          category: string
          checkout_url: string | null
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
          checkout_url?: string | null
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
          checkout_url?: string | null
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
          agreement_document_id: string | null
          agreement_document_sha256: string | null
          agreement_id: string
          campaign_id: string
          created_at: string
          id: string
          promoter_accepted_at: string
          promoter_id: string
        }
        Insert: {
          agreement_document_id?: string | null
          agreement_document_sha256?: string | null
          agreement_id: string
          campaign_id: string
          created_at?: string
          id?: string
          promoter_accepted_at?: string
          promoter_id: string
        }
        Update: {
          agreement_document_id?: string | null
          agreement_document_sha256?: string | null
          agreement_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          promoter_accepted_at?: string
          promoter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_memberships_agreement_document_id_fkey"
            columns: ["agreement_document_id"]
            isOneToOne: false
            referencedRelation: "agreement_documents"
            referencedColumns: ["id"]
          },
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
          age_rating: string
          age_restricted: boolean
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          current_agreement_id: string | null
          description: string
          external_booking_url: string | null
          id: string
          image_url: string | null
          photo_paths: string[]
          price_minor: number
          published_at: string | null
          service_name: string
          status: string
          updated_at: string
        }
        Insert: {
          age_rating?: string
          age_restricted?: boolean
          business_id: string
          commission_minor?: number
          created_at?: string
          currency?: string
          current_agreement_id?: string | null
          description?: string
          external_booking_url?: string | null
          id?: string
          image_url?: string | null
          photo_paths?: string[]
          price_minor: number
          published_at?: string | null
          service_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          age_rating?: string
          age_restricted?: boolean
          business_id?: string
          commission_minor?: number
          created_at?: string
          currency?: string
          current_agreement_id?: string | null
          description?: string
          external_booking_url?: string | null
          id?: string
          image_url?: string | null
          photo_paths?: string[]
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
      clawbacks: {
        Row: {
          admin_id: string
          amount_minor: number
          booking_id: string
          created_at: string
          currency: string
          reason: string
        }
        Insert: {
          admin_id: string
          amount_minor: number
          booking_id: string
          created_at?: string
          currency: string
          reason: string
        }
        Update: {
          admin_id?: string
          amount_minor?: number
          booking_id?: string
          created_at?: string
          currency?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "clawbacks_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clawbacks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_settlement"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "clawbacks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          active: boolean
          booking_id: string
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          fee_minor: number
          id: number
          invoice_id: string
          kind: string
          promoter_id: string
        }
        Insert: {
          active?: boolean
          booking_id: string
          business_id: string
          commission_minor: number
          created_at?: string
          currency: string
          fee_minor: number
          id?: never
          invoice_id: string
          kind?: string
          promoter_id: string
        }
        Update: {
          active?: boolean
          booking_id?: string
          business_id?: string
          commission_minor?: number
          created_at?: string
          currency?: string
          fee_minor?: number
          id?: never
          invoice_id?: string
          kind?: string
          promoter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_settlement"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "invoice_lines_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "business_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_promoter_id_fkey"
            columns: ["promoter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "booking_settlement"
            referencedColumns: ["booking_id"]
          },
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
      payout_items: {
        Row: {
          active: boolean
          amount_minor: number
          booking_id: string
          created_at: string
          id: number
          invoice_line_id: number | null
          kind: string
          payout_id: string
        }
        Insert: {
          active?: boolean
          amount_minor: number
          booking_id: string
          created_at?: string
          id?: never
          invoice_line_id?: number | null
          kind: string
          payout_id: string
        }
        Update: {
          active?: boolean
          amount_minor?: number
          booking_id?: string
          created_at?: string
          id?: never
          invoice_line_id?: number | null
          kind?: string
          payout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_settlement"
            referencedColumns: ["booking_id"]
          },
          {
            foreignKeyName: "payout_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_invoice_line_id_fkey"
            columns: ["invoice_line_id"]
            isOneToOne: false
            referencedRelation: "invoice_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "booking_settlement"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          promoter_id: string
          reversed_at: string | null
          status: string
          stripe_account_id: string
          stripe_transfer_id: string | null
          transferred_at: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          promoter_id: string
          reversed_at?: string | null
          status?: string
          stripe_account_id: string
          stripe_transfer_id?: string | null
          transferred_at?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          promoter_id?: string
          reversed_at?: string | null
          status?: string
          stripe_account_id?: string
          stripe_transfer_id?: string | null
          transferred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_promoter_id_fkey"
            columns: ["promoter_id"]
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
      promoter_age: {
        Row: {
          age_band: string
          confirmed_at: string
          profile_id: string
        }
        Insert: {
          age_band: string
          confirmed_at?: string
          profile_id: string
        }
        Update: {
          age_band?: string
          confirmed_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promoter_age_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          discount_code: string
          id: string
          membership_id: string
          promoter_id: string
        }
        Insert: {
          campaign_id: string
          code: string
          created_at?: string
          discount_code: string
          id?: string
          membership_id: string
          promoter_id: string
        }
        Update: {
          campaign_id?: string
          code?: string
          created_at?: string
          discount_code?: string
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
      stripe_accounts: {
        Row: {
          created_at: string
          guardian_consent_at: string | null
          holder: string
          payouts_enabled: boolean
          profile_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guardian_consent_at?: string | null
          holder?: string
          payouts_enabled?: boolean
          profile_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guardian_consent_at?: string | null
          holder?: string
          payouts_enabled?: boolean
          profile_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          business_id: string
          created_at: string
          stripe_customer_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          stripe_customer_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          stripe_customer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string | null
          received_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string | null
          received_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string | null
          received_at?: string
          type?: string
        }
        Relationships: []
      }
      time_slots: {
        Row: {
          business_id: string
          created_at: string
          duration_minutes: number
          id: string
          starts_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          starts_at: string
        }
        Update: {
          business_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_slots_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      booking_settlement: {
        Row: {
          booking_id: string | null
          booking_status: string | null
          business_id: string | null
          business_total_minor: number | null
          clawed_back: boolean | null
          commission_minor: number | null
          currency: string | null
          due_at: string | null
          fee_minor: number | null
          final_at: string | null
          final_due_at: string | null
          invoice_id: string | null
          invoiced_at: string | null
          overdue_at: string | null
          paid_at: string | null
          paid_out_at: string | null
          payout_id: string | null
          promoter_id: string | null
          settlement_status: string | null
          verified_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "business_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _create_unslotted_booking: {
        Args: {
          p_consent_at: string
          p_customer_name: string
          p_customer_phone: string
          p_fee_bps: number
          p_link: Database["public"]["Tables"]["referral_links"]["Row"]
          p_source: string
        }
        Returns: string
      }
      _due_credits: {
        Args: { p_business_id: string }
        Returns: {
          booking_id: string
          commission_minor: number
          currency: string
          fee_minor: number
          kind: string
          promoter_id: string
        }[]
      }
      _finalize_booking: {
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
      _new_discount_code: { Args: { p_display_name: string }; Returns: string }
      _payable_items: {
        Args: { p_currency: string; p_promoter_id: string }
        Returns: {
          amount_minor: number
          booking_id: string
          invoice_line_id: number
          kind: string
        }[]
      }
      _release_billing_hold: {
        Args: { p_business_id: string }
        Returns: undefined
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
      attach_stripe_invoice: {
        Args: {
          p_due_at: string
          p_hosted_invoice_url: string
          p_invoice_id: string
          p_stripe_invoice_id: string
        }
        Returns: {
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          due_at: string | null
          fee_minor: number
          finalized_at: string | null
          hosted_invoice_url: string | null
          id: string
          overdue_at: string | null
          paid_at: string | null
          payment_failed_at: string | null
          period_month: string
          status: string
          stripe_invoice_id: string | null
          total_minor: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      begin_stripe_event: {
        Args: { p_event_id: string; p_type: string }
        Returns: boolean
      }
      campaign_id_from_path: { Args: { p_name: string }; Returns: string }
      can_join_campaign: {
        Args: { p_agreement_id: string; p_campaign_id: string }
        Returns: boolean
      }
      can_read_agreement_pdf: { Args: { p_path: string }; Returns: boolean }
      can_see_age_rating: { Args: { p_age_rating: string }; Returns: boolean }
      cancel_unverified_bookings: { Args: never; Returns: number }
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
      create_external_referral: {
        Args: {
          p_consent: boolean
          p_customer_name: string
          p_customer_phone: string
          p_fee_bps: number
          p_referral_code: string
        }
        Returns: string
      }
      create_invoice_draft: {
        Args: { p_business_id: string; p_period_month: string }
        Returns: string
      }
      current_user_role: { Args: never; Returns: string }
      final_after_days: { Args: never; Returns: number }
      finalize_due_bookings: { Args: never; Returns: number }
      finish_stripe_event: { Args: { p_event_id: string }; Returns: undefined }
      fraud_clawback: {
        Args: { p_admin_id: string; p_booking_id: string; p_reason: string }
        Returns: {
          admin_id: string
          amount_minor: number
          booking_id: string
          created_at: string
          currency: string
          reason: string
        }
        SetofOptions: {
          from: "*"
          to: "clawbacks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_age_restricted_category: {
        Args: { p_category: string }
        Returns: boolean
      }
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean }
      is_campaign_member: { Args: { p_campaign_id: string }; Returns: boolean }
      is_published_campaign: {
        Args: { p_campaign_id: string }
        Returns: boolean
      }
      mark_invoice_overdue: {
        Args: { p_stripe_invoice_id: string }
        Returns: {
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          due_at: string | null
          fee_minor: number
          finalized_at: string | null
          hosted_invoice_url: string | null
          id: string
          overdue_at: string | null
          paid_at: string | null
          payment_failed_at: string | null
          period_month: string
          status: string
          stripe_invoice_id: string | null
          total_minor: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_invoice_paid: {
        Args: { p_paid_at: string; p_stripe_invoice_id: string }
        Returns: {
          business_id: string
          commission_minor: number
          created_at: string
          currency: string
          due_at: string | null
          fee_minor: number
          finalized_at: string | null
          hosted_invoice_url: string | null
          id: string
          overdue_at: string | null
          paid_at: string | null
          payment_failed_at: string | null
          period_month: string
          status: string
          stripe_invoice_id: string | null
          total_minor: number
          voided_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "business_invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_invoice_payment_failed: {
        Args: { p_stripe_invoice_id: string }
        Returns: undefined
      }
      mark_invoice_voided: {
        Args: { p_stripe_invoice_id: string }
        Returns: undefined
      }
      mark_payout_failed: {
        Args: { p_payout_id: string; p_reason: string }
        Returns: undefined
      }
      mark_payout_reversed: {
        Args: { p_stripe_transfer_id: string }
        Returns: undefined
      }
      mark_payout_transferred: {
        Args: { p_payout_id: string; p_stripe_transfer_id: string }
        Returns: {
          amount_minor: number
          created_at: string
          currency: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          promoter_id: string
          reversed_at: string | null
          status: string
          stripe_account_id: string
          stripe_transfer_id: string | null
          transferred_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payouts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      owns_campaign: { Args: { p_campaign_id: string }; Returns: boolean }
      platform_fee_minor: {
        Args: { p_fee_bps: number; p_price_minor: number }
        Returns: number
      }
      prepare_payout: {
        Args: { p_currency: string; p_promoter_id: string; p_run_key: string }
        Returns: string
      }
      promoter_is_minor: { Args: { p_profile_id: string }; Returns: boolean }
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
      refund_booking_before_final: {
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
      register_discount_code: {
        Args: {
          p_actor_id: string
          p_customer_name: string
          p_customer_phone: string
          p_discount_code: string
          p_fee_bps: number
        }
        Returns: string
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
      save_stripe_account: {
        Args: {
          p_guardian_consent_at: string
          p_holder: string
          p_payouts_enabled: boolean
          p_profile_id: string
          p_stripe_account_id: string
        }
        Returns: {
          created_at: string
          guardian_consent_at: string | null
          holder: string
          payouts_enabled: boolean
          profile_id: string
          stripe_account_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "stripe_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_stripe_customer: {
        Args: { p_business_id: string; p_stripe_customer_id: string }
        Returns: undefined
      }
      set_age_band: {
        Args: { p_actor_id: string; p_age_band: string }
        Returns: undefined
      }
      simulate_end_of_holding_period: {
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
      update_stripe_account_status: {
        Args: { p_payouts_enabled: boolean; p_stripe_account_id: string }
        Returns: undefined
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
          final_at: string | null
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
          slot_start: string | null
          source: string
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
