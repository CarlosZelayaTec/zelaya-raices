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
      audit_logs: {
        Row: {
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_table: string
          id: number
          operation: string
          organization_id: string | null
          request_id: string | null
        }
        Insert: {
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_table: string
          id?: never
          operation: string
          organization_id?: string | null
          request_id?: string | null
        }
        Update: {
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_table?: string
          id?: never
          operation?: string
          organization_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          assigned_to: string | null
          closed_at: string | null
          consent_to_contact: boolean
          contact_email: string | null
          contact_name: string
          contact_phone: string | null
          contact_preference: Database["public"]["Enums"]["contact_preference"]
          created_at: string
          id: string
          listing_id: string
          message: string
          organization_id: string
          requester_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          closed_at?: string | null
          consent_to_contact?: boolean
          contact_email?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_preference?: Database["public"]["Enums"]["contact_preference"]
          created_at?: string
          id?: string
          listing_id: string
          message: string
          organization_id: string
          requester_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          closed_at?: string | null
          consent_to_contact?: boolean
          contact_email?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_preference?: Database["public"]["Enums"]["contact_preference"]
          created_at?: string
          id?: string
          listing_id?: string
          message?: string
          organization_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "inquiries_organization_id_assigned_to_fkey"
            columns: ["organization_id", "assigned_to"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "profile_id"]
          },
          {
            foreignKeyName: "inquiries_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_amenities: {
        Row: {
          amenity_code: string
          created_at: string
          display_label: string | null
          listing_id: string
          organization_id: string
          value: string | null
        }
        Insert: {
          amenity_code: string
          created_at?: string
          display_label?: string | null
          listing_id: string
          organization_id: string
          value?: string | null
        }
        Update: {
          amenity_code?: string
          created_at?: string
          display_label?: string | null
          listing_id?: string
          organization_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_amenities_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      listing_locations: {
        Row: {
          city: string | null
          country_code: string
          created_at: string
          department: string
          listing_id: string
          location_confirmed_at: string | null
          location_confirmed_by: string | null
          municipality: string
          organization_id: string
          precision: Database["public"]["Enums"]["location_precision"]
          public_geog: unknown
          public_latitude: number
          public_longitude: number
          updated_at: string
          visible_address: string | null
          zone: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string
          created_at?: string
          department: string
          listing_id: string
          location_confirmed_at?: string | null
          location_confirmed_by?: string | null
          municipality: string
          organization_id: string
          precision?: Database["public"]["Enums"]["location_precision"]
          public_geog: unknown
          public_latitude: number
          public_longitude: number
          updated_at?: string
          visible_address?: string | null
          zone?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string
          created_at?: string
          department?: string
          listing_id?: string
          location_confirmed_at?: string | null
          location_confirmed_by?: string | null
          municipality?: string
          organization_id?: string
          precision?: Database["public"]["Enums"]["location_precision"]
          public_geog?: unknown
          public_latitude?: number
          public_longitude?: number
          updated_at?: string
          visible_address?: string | null
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_locations_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "listing_locations_location_confirmed_by_fkey"
            columns: ["location_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_managers: {
        Row: {
          assigned_by: string
          created_at: string
          listing_id: string
          organization_id: string
          profile_id: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          listing_id: string
          organization_id: string
          profile_id: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          listing_id?: string
          organization_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_managers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_managers_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "listing_managers_organization_id_profile_id_fkey"
            columns: ["organization_id", "profile_id"]
            isOneToOne: false
            referencedRelation: "organization_members"
            referencedColumns: ["organization_id", "profile_id"]
          },
        ]
      }
      listing_media: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          height: number | null
          id: string
          is_primary: boolean
          listing_id: string
          media_type: Database["public"]["Enums"]["listing_media_type"]
          mime_type: string
          organization_id: string
          processing_status: Database["public"]["Enums"]["media_processing_status"]
          public_bucket: string | null
          public_path: string | null
          size_bytes: number
          sort_order: number
          source_bucket: string
          source_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean
          listing_id: string
          media_type: Database["public"]["Enums"]["listing_media_type"]
          mime_type: string
          organization_id: string
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          public_bucket?: string | null
          public_path?: string | null
          size_bytes: number
          sort_order?: number
          source_bucket?: string
          source_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_primary?: boolean
          listing_id?: string
          media_type?: Database["public"]["Enums"]["listing_media_type"]
          mime_type?: string
          organization_id?: string
          processing_status?: Database["public"]["Enums"]["media_processing_status"]
          public_bucket?: string | null
          public_path?: string | null
          size_bytes?: number
          sort_order?: number
          source_bucket?: string
          source_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_media_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      listing_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: number
          listing_id: string
          new_currency_code: Database["public"]["Enums"]["currency_code"]
          new_price_amount: number | null
          new_price_period: Database["public"]["Enums"]["price_period"]
          previous_currency_code:
            | Database["public"]["Enums"]["currency_code"]
            | null
          previous_price_amount: number | null
          previous_price_period:
            | Database["public"]["Enums"]["price_period"]
            | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          listing_id: string
          new_currency_code: Database["public"]["Enums"]["currency_code"]
          new_price_amount?: number | null
          new_price_period: Database["public"]["Enums"]["price_period"]
          previous_currency_code?:
            | Database["public"]["Enums"]["currency_code"]
            | null
          previous_price_amount?: number | null
          previous_price_period?:
            | Database["public"]["Enums"]["price_period"]
            | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: never
          listing_id?: string
          new_currency_code?: Database["public"]["Enums"]["currency_code"]
          new_price_amount?: number | null
          new_price_period?: Database["public"]["Enums"]["price_period"]
          previous_currency_code?:
            | Database["public"]["Enums"]["currency_code"]
            | null
          previous_price_amount?: number | null
          previous_price_period?:
            | Database["public"]["Enums"]["price_period"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_private_locations: {
        Row: {
          access_notes: string | null
          created_at: string
          exact_geog: unknown
          exact_latitude: number
          exact_longitude: number
          listing_id: string
          organization_id: string
          private_address: string | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          created_at?: string
          exact_geog: unknown
          exact_latitude: number
          exact_longitude: number
          listing_id: string
          organization_id: string
          private_address?: string | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          created_at?: string
          exact_geog?: unknown
          exact_latitude?: number
          exact_longitude?: number
          listing_id?: string
          organization_id?: string
          private_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_private_locations_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      listings: {
        Row: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          availability_updated_at: string
          bathrooms: number | null
          bedrooms: number | null
          construction_area: number | null
          construction_area_unit:
            | Database["public"]["Enums"]["area_unit"]
            | null
          created_at: string
          created_by: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          description: string
          featured_until: string | null
          id: string
          land_area: number | null
          land_area_unit: Database["public"]["Enums"]["area_unit"] | null
          last_price_update_at: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          organization_id: string
          parking_spaces: number | null
          price_amount: number | null
          price_on_request: boolean
          price_period: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          publication_status: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          reports_count: number
          slug: string
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          version: number
          view_count: number
          year_built: number | null
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          availability_updated_at?: string
          bathrooms?: number | null
          bedrooms?: number | null
          construction_area?: number | null
          construction_area_unit?:
            | Database["public"]["Enums"]["area_unit"]
            | null
          created_at?: string
          created_by: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          description: string
          featured_until?: string | null
          id?: string
          land_area?: number | null
          land_area_unit?: Database["public"]["Enums"]["area_unit"] | null
          last_price_update_at?: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          organization_id: string
          parking_spaces?: number | null
          price_amount?: number | null
          price_on_request?: boolean
          price_period?: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          publication_status?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          reports_count?: number
          slug: string
          title: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          version?: number
          view_count?: number
          year_built?: number | null
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          availability_updated_at?: string
          bathrooms?: number | null
          bedrooms?: number | null
          construction_area?: number | null
          construction_area_unit?:
            | Database["public"]["Enums"]["area_unit"]
            | null
          created_at?: string
          created_by?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          description?: string
          featured_until?: string | null
          id?: string
          land_area?: number | null
          land_area_unit?: Database["public"]["Enums"]["area_unit"] | null
          last_price_update_at?: string
          operation_type?: Database["public"]["Enums"]["operation_type"]
          organization_id?: string
          parking_spaces?: number | null
          price_amount?: number | null
          price_on_request?: boolean
          price_period?: Database["public"]["Enums"]["price_period"]
          property_type?: Database["public"]["Enums"]["property_type"]
          publication_status?: Database["public"]["Enums"]["publication_status"]
          published_at?: string | null
          reports_count?: number
          slug?: string
          title?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          version?: number
          view_count?: number
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["moderation_action_type"]
          created_at: string
          id: string
          internal_notes: string | null
          listing_id: string | null
          metadata: Json
          moderator_id: string
          new_state: string | null
          organization_id: string | null
          previous_state: string | null
          profile_id: string | null
          public_reason: string | null
          report_id: string | null
          review_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["moderation_action_type"]
          created_at?: string
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          metadata?: Json
          moderator_id: string
          new_state?: string | null
          organization_id?: string | null
          previous_state?: string | null
          profile_id?: string | null
          public_reason?: string | null
          report_id?: string | null
          review_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["moderation_action_type"]
          created_at?: string
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          metadata?: Json
          moderator_id?: string
          new_state?: string | null
          organization_id?: string | null
          previous_state?: string | null
          profile_id?: string | null
          public_reason?: string | null
          report_id?: string | null
          review_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          profile_id: string
          role: Database["public"]["Enums"]["organization_member_role"]
          status: Database["public"]["Enums"]["organization_member_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          profile_id: string
          role: Database["public"]["Enums"]["organization_member_role"]
          status?: Database["public"]["Enums"]["organization_member_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["organization_member_role"]
          status?: Database["public"]["Enums"]["organization_member_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          legal_name: string | null
          logo_path: string | null
          name: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          public_email: string | null
          public_phone: string | null
          slug: string
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          name: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          public_email?: string | null
          public_phone?: string | null
          slug: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          legal_name?: string | null
          logo_path?: string | null
          name?: string
          organization_type?: Database["public"]["Enums"]["organization_type"]
          public_email?: string | null
          public_phone?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          public_phone: string | null
          public_whatsapp: string | null
          slug: string | null
          staff_role: Database["public"]["Enums"]["staff_role"] | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          public_phone?: string | null
          public_whatsapp?: string | null
          slug?: string | null
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          public_phone?: string | null
          public_whatsapp?: string | null
          slug?: string | null
          staff_role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          organization_id: string | null
          profile_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          organization_id?: string | null
          profile_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          organization_id?: string | null
          profile_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          canceled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          customer_notes: string | null
          ends_at: string
          guests: number
          id: string
          internal_notes: string | null
          listing_id: string
          organization_id: string
          reservation_period: unknown
          starts_at: string
          status: Database["public"]["Enums"]["reservation_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          customer_id: string
          customer_notes?: string | null
          ends_at: string
          guests?: number
          id?: string
          internal_notes?: string | null
          listing_id: string
          organization_id: string
          reservation_period?: unknown
          starts_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          customer_id?: string
          customer_notes?: string | null
          ends_at?: string
          guests?: number
          id?: string
          internal_notes?: string | null
          listing_id?: string
          organization_id?: string
          reservation_period?: unknown
          starts_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_listing_id_organization_id_fkey"
            columns: ["listing_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          created_at: string
          id: string
          listing_id: string | null
          moderated_at: string | null
          moderated_by: string | null
          organization_id: string | null
          organization_responded_at: string | null
          organization_responded_by: string | null
          organization_response: string | null
          rating: number
          reservation_id: string | null
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
          subject_profile_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          listing_id?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          organization_id?: string | null
          organization_responded_at?: string | null
          organization_responded_by?: string | null
          organization_response?: string | null
          rating: number
          reservation_id?: string | null
          reviewer_id: string
          status?: Database["public"]["Enums"]["review_status"]
          subject_profile_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          organization_id?: string | null
          organization_responded_at?: string | null
          organization_responded_by?: string | null
          organization_response?: string | null
          rating?: number
          reservation_id?: string | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          subject_profile_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_organization_responded_by_fkey"
            columns: ["organization_responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reservation_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_period: Database["public"]["Enums"]["price_period"]
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          organization_id: string
          plan_code: string
          price_amount: number
          provider: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          billing_period: Database["public"]["Enums"]["price_period"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          organization_id: string
          plan_code: string
          price_amount: number
          provider: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["price_period"]
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency_code?: Database["public"]["Enums"]["currency_code"]
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          organization_id?: string
          plan_code?: string
          price_amount?: number
          provider?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_initial_super_admin: { Args: { p_code: string }; Returns: boolean }
      create_listing_draft: {
        Args: {
          p_bathrooms?: number
          p_bedrooms?: number
          p_construction_area?: number
          p_construction_area_unit?: Database["public"]["Enums"]["area_unit"]
          p_currency_code: Database["public"]["Enums"]["currency_code"]
          p_description: string
          p_land_area?: number
          p_land_area_unit?: Database["public"]["Enums"]["area_unit"]
          p_operation_type: Database["public"]["Enums"]["operation_type"]
          p_organization_id: string
          p_parking_spaces?: number
          p_price_amount: number
          p_price_on_request: boolean
          p_price_period: Database["public"]["Enums"]["price_period"]
          p_property_type: Database["public"]["Enums"]["property_type"]
          p_slug: string
          p_title: string
          p_year_built?: number
        }
        Returns: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          availability_updated_at: string
          bathrooms: number | null
          bedrooms: number | null
          construction_area: number | null
          construction_area_unit:
            | Database["public"]["Enums"]["area_unit"]
            | null
          created_at: string
          created_by: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          description: string
          featured_until: string | null
          id: string
          land_area: number | null
          land_area_unit: Database["public"]["Enums"]["area_unit"] | null
          last_price_update_at: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          organization_id: string
          parking_spaces: number | null
          price_amount: number | null
          price_on_request: boolean
          price_period: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          publication_status: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          reports_count: number
          slug: string
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          version: number
          view_count: number
          year_built: number | null
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization: {
        Args: {
          p_description?: string
          p_legal_name?: string
          p_name: string
          p_organization_type: Database["public"]["Enums"]["organization_type"]
          p_slug: string
        }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          legal_name: string | null
          logo_path: string | null
          name: string
          organization_type: Database["public"]["Enums"]["organization_type"]
          public_email: string | null
          public_phone: string | null
          slug: string
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_agent_dashboard: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      moderate_listing: {
        Args: {
          p_action: Database["public"]["Enums"]["moderation_action_type"]
          p_expected_version: number
          p_internal_notes?: string
          p_listing_id: string
          p_public_reason?: string
        }
        Returns: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          availability_updated_at: string
          bathrooms: number | null
          bedrooms: number | null
          construction_area: number | null
          construction_area_unit:
            | Database["public"]["Enums"]["area_unit"]
            | null
          created_at: string
          created_by: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          description: string
          featured_until: string | null
          id: string
          land_area: number | null
          land_area_unit: Database["public"]["Enums"]["area_unit"] | null
          last_price_update_at: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          organization_id: string
          parking_spaces: number | null
          price_amount: number | null
          price_on_request: boolean
          price_period: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          publication_status: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          reports_count: number
          slug: string
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          version: number
          view_count: number
          year_built: number | null
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      organize_listing_media: {
        Args: { p_listing_id: string; p_ordered_ids: string[] }
        Returns: {
          alt_text: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          height: number | null
          id: string
          is_primary: boolean
          listing_id: string
          media_type: Database["public"]["Enums"]["listing_media_type"]
          mime_type: string
          organization_id: string
          processing_status: Database["public"]["Enums"]["media_processing_status"]
          public_bucket: string | null
          public_path: string | null
          size_bytes: number
          sort_order: number
          source_bucket: string
          source_path: string
          updated_at: string
          width: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "listing_media"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      register_listing_media: {
        Args: {
          p_extension: string
          p_listing_id: string
          p_media_id: string
          p_media_type: Database["public"]["Enums"]["listing_media_type"]
          p_mime_type: string
          p_size_bytes: number
        }
        Returns: {
          alt_text: string | null
          created_at: string
          created_by: string
          duration_seconds: number | null
          height: number | null
          id: string
          is_primary: boolean
          listing_id: string
          media_type: Database["public"]["Enums"]["listing_media_type"]
          mime_type: string
          organization_id: string
          processing_status: Database["public"]["Enums"]["media_processing_status"]
          public_bucket: string | null
          public_path: string | null
          size_bytes: number
          sort_order: number
          source_bucket: string
          source_path: string
          updated_at: string
          width: number | null
        }
        SetofOptions: {
          from: "*"
          to: "listing_media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_listing_location: {
        Args: {
          p_city?: string
          p_department: string
          p_exact_latitude: number
          p_exact_longitude: number
          p_listing_id: string
          p_municipality: string
          p_organization_id: string
          p_precision: Database["public"]["Enums"]["location_precision"]
          p_private_address?: string
          p_zone?: string
        }
        Returns: {
          saved_listing_id: string
        }[]
      }
      set_platform_staff_role: {
        Args: {
          p_profile_id: string
          p_staff_role: Database["public"]["Enums"]["staff_role"]
        }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status"]
          avatar_path: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          public_phone: string | null
          public_whatsapp: string | null
          slug: string | null
          staff_role: Database["public"]["Enums"]["staff_role"] | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_listing_for_review: {
        Args: { p_expected_version: number; p_listing_id: string }
        Returns: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          availability_updated_at: string
          bathrooms: number | null
          bedrooms: number | null
          construction_area: number | null
          construction_area_unit:
            | Database["public"]["Enums"]["area_unit"]
            | null
          created_at: string
          created_by: string
          currency_code: Database["public"]["Enums"]["currency_code"]
          description: string
          featured_until: string | null
          id: string
          land_area: number | null
          land_area_unit: Database["public"]["Enums"]["area_unit"] | null
          last_price_update_at: string
          operation_type: Database["public"]["Enums"]["operation_type"]
          organization_id: string
          parking_spaces: number | null
          price_amount: number | null
          price_on_request: boolean
          price_period: Database["public"]["Enums"]["price_period"]
          property_type: Database["public"]["Enums"]["property_type"]
          publication_status: Database["public"]["Enums"]["publication_status"]
          published_at: string | null
          reports_count: number
          slug: string
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
          verified_by: string | null
          version: number
          view_count: number
          year_built: number | null
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_status: "active" | "suspended" | "disabled"
      area_unit: "m2" | "vara2" | "manzana" | "sqft" | "acre"
      availability_status:
        | "available"
        | "reserved"
        | "sold"
        | "rented"
        | "unavailable"
      contact_preference: "email" | "phone" | "whatsapp" | "in_app"
      currency_code: "HNL" | "USD"
      inquiry_status: "new" | "assigned" | "responded" | "closed" | "spam"
      listing_media_type: "image" | "video" | "floor_plan" | "virtual_tour"
      location_precision: "zone" | "approximate" | "exact"
      media_processing_status:
        | "pending"
        | "processing"
        | "ready"
        | "rejected"
        | "failed"
      moderation_action_type:
        | "verify"
        | "unverify"
        | "approve"
        | "reject"
        | "request_changes"
        | "publish"
        | "unpublish"
        | "archive"
        | "suspend"
        | "restore"
        | "resolve_report"
      operation_type: "sale" | "rent" | "short_term_rent"
      organization_member_role:
        | "agency_owner"
        | "manager"
        | "agent"
        | "property_owner"
        | "editor"
        | "viewer"
      organization_member_status: "invited" | "active" | "suspended" | "removed"
      organization_status: "active" | "suspended" | "archived"
      organization_type: "agency" | "individual_owner" | "business"
      price_period:
        | "total"
        | "monthly"
        | "yearly"
        | "weekly"
        | "nightly"
        | "daily"
      property_type:
        | "house"
        | "apartment"
        | "condominium"
        | "land"
        | "commercial"
        | "office"
        | "warehouse"
        | "farm"
        | "building"
      publication_status:
        | "draft"
        | "pending_review"
        | "published"
        | "rejected"
        | "archived"
      report_reason:
        | "inaccurate"
        | "duplicate"
        | "fraud"
        | "scam"
        | "offensive"
        | "unavailable"
        | "other"
      report_status: "open" | "in_review" | "resolved" | "dismissed"
      reservation_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
        | "expired"
      review_status: "pending" | "published" | "rejected" | "hidden"
      staff_role: "super_admin" | "admin" | "moderator"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceled"
        | "expired"
      verification_status: "unverified" | "pending" | "verified" | "rejected"
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
      account_status: ["active", "suspended", "disabled"],
      area_unit: ["m2", "vara2", "manzana", "sqft", "acre"],
      availability_status: [
        "available",
        "reserved",
        "sold",
        "rented",
        "unavailable",
      ],
      contact_preference: ["email", "phone", "whatsapp", "in_app"],
      currency_code: ["HNL", "USD"],
      inquiry_status: ["new", "assigned", "responded", "closed", "spam"],
      listing_media_type: ["image", "video", "floor_plan", "virtual_tour"],
      location_precision: ["zone", "approximate", "exact"],
      media_processing_status: [
        "pending",
        "processing",
        "ready",
        "rejected",
        "failed",
      ],
      moderation_action_type: [
        "verify",
        "unverify",
        "approve",
        "reject",
        "request_changes",
        "publish",
        "unpublish",
        "archive",
        "suspend",
        "restore",
        "resolve_report",
      ],
      operation_type: ["sale", "rent", "short_term_rent"],
      organization_member_role: [
        "agency_owner",
        "manager",
        "agent",
        "property_owner",
        "editor",
        "viewer",
      ],
      organization_member_status: ["invited", "active", "suspended", "removed"],
      organization_status: ["active", "suspended", "archived"],
      organization_type: ["agency", "individual_owner", "business"],
      price_period: [
        "total",
        "monthly",
        "yearly",
        "weekly",
        "nightly",
        "daily",
      ],
      property_type: [
        "house",
        "apartment",
        "condominium",
        "land",
        "commercial",
        "office",
        "warehouse",
        "farm",
        "building",
      ],
      publication_status: [
        "draft",
        "pending_review",
        "published",
        "rejected",
        "archived",
      ],
      report_reason: [
        "inaccurate",
        "duplicate",
        "fraud",
        "scam",
        "offensive",
        "unavailable",
        "other",
      ],
      report_status: ["open", "in_review", "resolved", "dismissed"],
      reservation_status: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "expired",
      ],
      review_status: ["pending", "published", "rejected", "hidden"],
      staff_role: ["super_admin", "admin", "moderator"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "paused",
        "canceled",
        "expired",
      ],
      verification_status: ["unverified", "pending", "verified", "rejected"],
    },
  },
} as const
