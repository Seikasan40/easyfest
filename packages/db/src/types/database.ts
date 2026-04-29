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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          rating: number | null
          rating_comment: string | null
          refusal_reason: string | null
          refused_by_volunteer_at: string | null
          shift_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          updated_at: string
          validated_by_volunteer_at: string | null
          volunteer_user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          rating_comment?: string | null
          refusal_reason?: string | null
          refused_by_volunteer_at?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          validated_by_volunteer_at?: string | null
          volunteer_user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          rating_comment?: string | null
          refusal_reason?: string | null
          refused_by_volunteer_at?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          updated_at?: string
          validated_by_volunteer_at?: string | null
          volunteer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          event_id: string | null
          id: number
          ip_address: unknown
          occurred_at: string
          payload: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          event_id?: string | null
          id?: number
          ip_address?: unknown
          occurred_at?: string
          payload?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          event_id?: string | null
          id?: number
          ip_address?: unknown
          occurred_at?: string
          payload?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      bans: {
        Row: {
          ban_proposal_id: string | null
          enforced_at: string
          event_id: string
          id: string
          reason: string | null
          target_user_id: string
          unbanned_at: string | null
          unbanned_by: string | null
          unbanned_reason: string | null
          validated_by: string[]
        }
        Insert: {
          ban_proposal_id?: string | null
          enforced_at?: string
          event_id: string
          id?: string
          reason?: string | null
          target_user_id: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          unbanned_reason?: string | null
          validated_by?: string[]
        }
        Update: {
          ban_proposal_id?: string | null
          enforced_at?: string
          event_id?: string
          id?: string
          reason?: string | null
          target_user_id?: string
          unbanned_at?: string | null
          unbanned_by?: string | null
          unbanned_reason?: string | null
          validated_by?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "bans_ban_proposal_id_fkey"
            columns: ["ban_proposal_id"]
            isOneToOne: false
            referencedRelation: "moderation_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bans_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_at: string
          geo_lat: number | null
          geo_lng: number | null
          id: string
          itinerary_enabled: boolean
          location: string | null
          manual_signup_enabled: boolean
          max_preferred_positions: number
          name: string
          organization_id: string
          registration_close_at: string | null
          registration_open_at: string | null
          safer_alerts_enabled: boolean
          slug: string
          starts_at: string
          status: string
          timezone: string
          updated_at: string
          wellbeing_enabled: boolean
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          itinerary_enabled?: boolean
          location?: string | null
          manual_signup_enabled?: boolean
          max_preferred_positions?: number
          name: string
          organization_id: string
          registration_close_at?: string | null
          registration_open_at?: string | null
          safer_alerts_enabled?: boolean
          slug: string
          starts_at: string
          status?: string
          timezone?: string
          updated_at?: string
          wellbeing_enabled?: boolean
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          itinerary_enabled?: boolean
          location?: string | null
          manual_signup_enabled?: boolean
          max_preferred_positions?: number
          name?: string
          organization_id?: string
          registration_close_at?: string | null
          registration_open_at?: string | null
          safer_alerts_enabled?: boolean
          slug?: string
          starts_at?: string
          status?: string
          timezone?: string
          updated_at?: string
          wellbeing_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_allowances: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          event_id: string
          id: string
          meal_label: string | null
          meal_slot: string
          served_at: string | null
          served_by: string | null
          volunteer_user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          event_id: string
          id?: string
          meal_label?: string | null
          meal_slot: string
          served_at?: string | null
          served_by?: string | null
          volunteer_user_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          event_id?: string
          id?: string
          meal_label?: string | null
          meal_slot?: string
          served_at?: string | null
          served_by?: string | null
          volunteer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_allowances_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          event_id: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          is_entry_scanner: boolean
          is_mediator: boolean
          notes_admin: string | null
          position_id: string | null
          role: Database["public"]["Enums"]["role_kind"]
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          event_id: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          is_entry_scanner?: boolean
          is_mediator?: boolean
          notes_admin?: string | null
          position_id?: string | null
          role: Database["public"]["Enums"]["role_kind"]
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          event_id?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          is_entry_scanner?: boolean
          is_mediator?: boolean
          notes_admin?: string | null
          position_id?: string | null
          role?: Database["public"]["Enums"]["role_kind"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_memberships_position"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      message_channels: {
        Row: {
          color: string | null
          created_at: string
          event_id: string
          id: string
          is_archived: boolean
          kind: Database["public"]["Enums"]["channel_kind"]
          name: string
          participant_user_ids: string[] | null
          position_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_archived?: boolean
          kind: Database["public"]["Enums"]["channel_kind"]
          name: string
          participant_user_ids?: string[] | null
          position_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_archived?: boolean
          kind?: Database["public"]["Enums"]["channel_kind"]
          name?: string
          participant_user_ids?: string[] | null
          position_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_channels_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_channels_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_broadcast: boolean
          is_muted: boolean
          muted_at: string | null
          muted_by: string | null
          sender_user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_muted?: boolean
          muted_at?: string | null
          muted_by?: string | null
          sender_user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_muted?: boolean
          muted_at?: string | null
          muted_by?: string | null
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "message_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          actor_user_id: string
          ban_proposal_id: string | null
          created_at: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["moderation_action_kind"]
          reason: string | null
          related_alert_id: string | null
          related_message_id: string | null
          target_user_id: string
        }
        Insert: {
          actor_user_id: string
          ban_proposal_id?: string | null
          created_at?: string
          event_id: string
          id?: string
          kind: Database["public"]["Enums"]["moderation_action_kind"]
          reason?: string | null
          related_alert_id?: string | null
          related_message_id?: string | null
          target_user_id: string
        }
        Update: {
          actor_user_id?: string
          ban_proposal_id?: string | null
          created_at?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["moderation_action_kind"]
          reason?: string | null
          related_alert_id?: string | null
          related_message_id?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_ban_proposal_id_fkey"
            columns: ["ban_proposal_id"]
            isOneToOne: false
            referencedRelation: "moderation_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_related_alert_id_fkey"
            columns: ["related_alert_id"]
            isOneToOne: false
            referencedRelation: "safer_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_related_message_id_fkey"
            columns: ["related_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event_id: string | null
          id: string
          preview: string | null
          provider_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          preview?: string | null
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event_id?: string | null
          id?: string
          preview?: string | null
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ban_required_approvals: number
          billing_plan: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          privacy_policy_version: string
          slug: string
          updated_at: string
        }
        Insert: {
          ban_required_approvals?: number
          billing_plan?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          privacy_policy_version?: string
          slug: string
          updated_at?: string
        }
        Update: {
          ban_required_approvals?: number
          billing_plan?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          privacy_policy_version?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          display_order: number
          event_id: string
          geo_zone: Json | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          needs_count_default: number
          responsible_user_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          event_id: string
          geo_zone?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          needs_count_default?: number
          responsible_user_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          event_id?: string
          geo_zone?: Json | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          needs_count_default?: number
          responsible_user_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      safer_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          description: string | null
          event_id: string
          geo_lat: number | null
          geo_lng: number | null
          id: string
          kind: Database["public"]["Enums"]["safer_alert_kind"]
          location_hint: string | null
          mediator_user_id: string | null
          notified_user_ids: string[] | null
          reporter_user_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["safer_alert_status"]
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string | null
          event_id: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          kind: Database["public"]["Enums"]["safer_alert_kind"]
          location_hint?: string | null
          mediator_user_id?: string | null
          notified_user_ids?: string[] | null
          reporter_user_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["safer_alert_status"]
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          description?: string | null
          event_id?: string
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["safer_alert_kind"]
          location_hint?: string | null
          mediator_user_id?: string | null
          notified_user_ids?: string[] | null
          reporter_user_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["safer_alert_status"]
        }
        Relationships: [
          {
            foreignKeyName: "safer_alerts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_events: {
        Row: {
          context: Json
          event_id: string
          id: string
          is_replay: boolean
          qr_nonce: string | null
          qr_token: string | null
          scan_kind: Database["public"]["Enums"]["scan_kind"]
          scanned_at: string
          scanned_by: string | null
          volunteer_user_id: string
        }
        Insert: {
          context?: Json
          event_id: string
          id?: string
          is_replay?: boolean
          qr_nonce?: string | null
          qr_token?: string | null
          scan_kind: Database["public"]["Enums"]["scan_kind"]
          scanned_at?: string
          scanned_by?: string | null
          volunteer_user_id: string
        }
        Update: {
          context?: Json
          event_id?: string
          id?: string
          is_replay?: boolean
          qr_nonce?: string | null
          qr_token?: string | null
          scan_kind?: Database["public"]["Enums"]["scan_kind"]
          scanned_at?: string
          scanned_by?: string | null
          volunteer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          meal_included: boolean
          needs_count: number
          notes: string | null
          position_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          meal_included?: boolean
          needs_count?: number
          notes?: string | null
          position_id: string
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          meal_included?: boolean
          needs_count?: number
          notes?: string | null
          position_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      signed_engagements: {
        Row: {
          engagement_kind: string
          event_id: string
          id: string
          ip_address: unknown
          signed_at: string
          user_agent: string | null
          user_id: string
          version: string
        }
        Insert: {
          engagement_kind: string
          event_id: string
          id?: string
          ip_address?: unknown
          signed_at?: string
          user_agent?: string | null
          user_id: string
          version: string
        }
        Update: {
          engagement_kind?: string
          event_id?: string
          id?: string
          ip_address?: unknown
          signed_at?: string
          user_agent?: string | null
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_engagements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_applications: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_street: string | null
          address_zip: string | null
          admin_notes: string | null
          arrival_at: string | null
          bio: string | null
          birth_date: string | null
          consent_anti_harass_at: string
          consent_charter_at: string
          consent_image_at: string | null
          consent_pii_at: string
          created_at: string
          created_user_id: string | null
          departure_at: string | null
          diet_notes: string | null
          driving_license: boolean | null
          email: string
          event_id: string
          first_name: string | null
          full_name: string
          gender: string | null
          has_vehicle: boolean | null
          id: string
          ip_address: unknown
          is_minor: boolean | null
          is_returning: boolean | null
          last_name: string | null
          limitations: string[] | null
          parental_auth_url: string | null
          phone: string | null
          preferred_position_slugs: string[] | null
          privacy_policy_version_accepted: string
          profession: string | null
          refusal_reason: string | null
          size: string | null
          skills: string[] | null
          source: string
          status: Database["public"]["Enums"]["application_status"]
          turnstile_token: string | null
          updated_at: string
          user_agent: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_notes?: string | null
          arrival_at?: string | null
          bio?: string | null
          birth_date?: string | null
          consent_anti_harass_at?: string
          consent_charter_at?: string
          consent_image_at?: string | null
          consent_pii_at?: string
          created_at?: string
          created_user_id?: string | null
          departure_at?: string | null
          diet_notes?: string | null
          driving_license?: boolean | null
          email: string
          event_id: string
          first_name?: string | null
          full_name: string
          gender?: string | null
          has_vehicle?: boolean | null
          id?: string
          ip_address?: unknown
          is_minor?: boolean | null
          is_returning?: boolean | null
          last_name?: string | null
          limitations?: string[] | null
          parental_auth_url?: string | null
          phone?: string | null
          preferred_position_slugs?: string[] | null
          privacy_policy_version_accepted?: string
          profession?: string | null
          refusal_reason?: string | null
          size?: string | null
          skills?: string[] | null
          source?: string
          status?: Database["public"]["Enums"]["application_status"]
          turnstile_token?: string | null
          updated_at?: string
          user_agent?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_zip?: string | null
          admin_notes?: string | null
          arrival_at?: string | null
          bio?: string | null
          birth_date?: string | null
          consent_anti_harass_at?: string
          consent_charter_at?: string
          consent_image_at?: string | null
          consent_pii_at?: string
          created_at?: string
          created_user_id?: string | null
          departure_at?: string | null
          diet_notes?: string | null
          driving_license?: boolean | null
          email?: string
          event_id?: string
          first_name?: string | null
          full_name?: string
          gender?: string | null
          has_vehicle?: boolean | null
          id?: string
          ip_address?: unknown
          is_minor?: boolean | null
          is_returning?: boolean | null
          last_name?: string | null
          limitations?: string[] | null
          parental_auth_url?: string | null
          phone?: string | null
          preferred_position_slugs?: string[] | null
          privacy_policy_version_accepted?: string
          profession?: string | null
          refusal_reason?: string | null
          size?: string | null
          skills?: string[] | null
          source?: string
          status?: Database["public"]["Enums"]["application_status"]
          turnstile_token?: string | null
          updated_at?: string
          user_agent?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_applications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_profiles: {
        Row: {
          address_city: string | null
          address_country: string | null
          address_street: string | null
          address_zip: string | null
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          consent_anti_harass_at: string | null
          consent_charter_at: string | null
          consent_image_at: string | null
          consent_pii_at: string | null
          created_at: string
          diet_notes: string | null
          email: string | null
          first_name: string | null
          full_name: string
          gender: string | null
          is_minor: boolean | null
          is_returning: boolean
          last_name: string | null
          limitations: string[] | null
          notes_admin: string | null
          parental_auth_url: string | null
          phone: string | null
          privacy_policy_version_accepted: string | null
          profession: string | null
          size: string | null
          skills: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          consent_anti_harass_at?: string | null
          consent_charter_at?: string | null
          consent_image_at?: string | null
          consent_pii_at?: string | null
          created_at?: string
          diet_notes?: string | null
          email?: string | null
          first_name?: string | null
          full_name: string
          gender?: string | null
          is_minor?: boolean | null
          is_returning?: boolean
          last_name?: string | null
          limitations?: string[] | null
          notes_admin?: string | null
          parental_auth_url?: string | null
          phone?: string | null
          privacy_policy_version_accepted?: string | null
          profession?: string | null
          size?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_country?: string | null
          address_street?: string | null
          address_zip?: string | null
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          consent_anti_harass_at?: string | null
          consent_charter_at?: string | null
          consent_image_at?: string | null
          consent_pii_at?: string | null
          created_at?: string
          diet_notes?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string
          gender?: string | null
          is_minor?: boolean | null
          is_returning?: boolean
          last_name?: string | null
          limitations?: string[] | null
          notes_admin?: string | null
          parental_auth_url?: string | null
          phone?: string | null
          privacy_policy_version_accepted?: string | null
          profession?: string | null
          size?: string | null
          skills?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wellbeing_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          comment: string | null
          created_at: string
          event_id: string
          id: string
          level: Database["public"]["Enums"]["wellbeing_level"]
          reporter_user_id: string
          resolution_notes: string | null
          resolved_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          comment?: string | null
          created_at?: string
          event_id: string
          id?: string
          level: Database["public"]["Enums"]["wellbeing_level"]
          reporter_user_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          comment?: string | null
          created_at?: string
          event_id?: string
          id?: string
          level?: Database["public"]["Enums"]["wellbeing_level"]
          reporter_user_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wellbeing_reports_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_volunteer_safe: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          is_minor: boolean | null
          is_returning: boolean | null
          last_name: string | null
          limitations: string[] | null
          phone: string | null
          size: string | null
          skills: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          is_minor?: boolean | null
          is_returning?: boolean | null
          last_name?: string | null
          limitations?: string[] | null
          phone?: string | null
          size?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          is_minor?: boolean | null
          is_returning?: boolean | null
          last_name?: string | null
          limitations?: string[] | null
          phone?: string | null
          size?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role_at_least: {
        Args: {
          target_event_id: string
          threshold: Database["public"]["Enums"]["role_kind"]
        }
        Returns: boolean
      }
      log_audit: {
        Args: { p_action: string; p_event_id?: string; p_payload?: Json }
        Returns: number
      }
      now_iso: { Args: never; Returns: string }
      role_in_event: {
        Args: { target_event_id: string }
        Returns: Database["public"]["Enums"]["role_kind"]
      }
    }
    Enums: {
      application_status:
        | "pending"
        | "validated"
        | "refused"
        | "reserve"
        | "pre_selected"
        | "duplicate"
      assignment_status:
        | "pending"
        | "validated"
        | "refused"
        | "reserve"
        | "no_show"
        | "completed"
      channel_kind: "team" | "responsibles" | "regie" | "admin" | "direct"
      moderation_action_kind:
        | "mute"
        | "unmute"
        | "ban_proposal"
        | "ban_validate"
        | "unban"
      role_kind:
        | "volunteer"
        | "post_lead"
        | "staff_scan"
        | "volunteer_lead"
        | "direction"
      safer_alert_kind:
        | "harassment"
        | "physical_danger"
        | "medical"
        | "wellbeing_red"
        | "other"
      safer_alert_status:
        | "open"
        | "acknowledged"
        | "in_progress"
        | "resolved"
        | "false_alarm"
      scan_kind: "arrival" | "meal" | "post_take" | "exit"
      wellbeing_level: "green" | "yellow" | "red"
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
      application_status: [
        "pending",
        "validated",
        "refused",
        "reserve",
        "pre_selected",
        "duplicate",
      ],
      assignment_status: [
        "pending",
        "validated",
        "refused",
        "reserve",
        "no_show",
        "completed",
      ],
      channel_kind: ["team", "responsibles", "regie", "admin", "direct"],
      moderation_action_kind: [
        "mute",
        "unmute",
        "ban_proposal",
        "ban_validate",
        "unban",
      ],
      role_kind: [
        "volunteer",
        "post_lead",
        "staff_scan",
        "volunteer_lead",
        "direction",
      ],
      safer_alert_kind: [
        "harassment",
        "physical_danger",
        "medical",
        "wellbeing_red",
        "other",
      ],
      safer_alert_status: [
        "open",
        "acknowledged",
        "in_progress",
        "resolved",
        "false_alarm",
      ],
      scan_kind: ["arrival", "meal", "post_take", "exit"],
      wellbeing_level: ["green", "yellow", "red"],
    },
  },
} as const

