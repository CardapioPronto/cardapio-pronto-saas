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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_handoff_rules: {
        Row: {
          created_at: string | null
          id: string
          instance_id: string
          is_active: boolean | null
          priority: number | null
          restaurant_id: string
          rule_type: string
          rule_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_id: string
          is_active?: boolean | null
          priority?: number | null
          restaurant_id: string
          rule_type: string
          rule_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_id?: string
          is_active?: boolean | null
          priority?: number | null
          restaurant_id?: string
          rule_type?: string
          rule_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_handoff_rules_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_handoff_rules_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_settings: {
        Row: {
          additional_instructions: string | null
          ai_enabled: boolean | null
          ai_persona: string | null
          auto_handoff_confidence_threshold: number | null
          auto_handoff_enabled: boolean | null
          bot_name: string | null
          business_hours: Json | null
          business_hours_only: boolean | null
          created_at: string | null
          id: string
          instance_id: string
          restaurant_id: string
          updated_at: string | null
          use_menu_knowledge: boolean | null
          welcome_message: string | null
        }
        Insert: {
          additional_instructions?: string | null
          ai_enabled?: boolean | null
          ai_persona?: string | null
          auto_handoff_confidence_threshold?: number | null
          auto_handoff_enabled?: boolean | null
          bot_name?: string | null
          business_hours?: Json | null
          business_hours_only?: boolean | null
          created_at?: string | null
          id?: string
          instance_id: string
          restaurant_id: string
          updated_at?: string | null
          use_menu_knowledge?: boolean | null
          welcome_message?: string | null
        }
        Update: {
          additional_instructions?: string | null
          ai_enabled?: boolean | null
          ai_persona?: string | null
          auto_handoff_confidence_threshold?: number | null
          auto_handoff_enabled?: boolean | null
          bot_name?: string | null
          business_hours?: Json | null
          business_hours_only?: boolean | null
          created_at?: string | null
          id?: string
          instance_id?: string
          restaurant_id?: string
          updated_at?: string | null
          use_menu_knowledge?: boolean | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_settings_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          order_position: number | null
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          order_position?: number | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          order_position?: number | null
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      configuration_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          area: string
          changed_fields: string[]
          changes: Json
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          restaurant_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          area: string
          changed_fields?: string[]
          changes?: Json
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          restaurant_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          area?: string
          changed_fields?: string[]
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          restaurant_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuration_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_audit_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configuration_audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          notes: string | null
          phone: string | null
          read_at: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          notes?: string | null
          phone?: string | null
          read_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          notes?: string | null
          phone?: string | null
          read_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      contact_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_assignments: {
        Row: {
          action: string
          assigned_by: string | null
          assigned_to: string
          created_at: string | null
          id: string
          notes: string | null
          thread_id: string
        }
        Insert: {
          action: string
          assigned_by?: string | null
          assigned_to: string
          created_at?: string | null
          id?: string
          notes?: string | null
          thread_id: string
        }
        Update: {
          action?: string
          assigned_by?: string | null
          assigned_to?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          media_url: string | null
          message_type: string | null
          metadata: Json | null
          restaurant_id: string
          sender_id: string | null
          sender_type: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          restaurant_id: string
          sender_id?: string | null
          sender_type: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          media_url?: string | null
          message_type?: string | null
          metadata?: Json | null
          restaurant_id?: string
          sender_id?: string | null
          sender_type?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          thread_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          thread_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          thread_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "conversation_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_threads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          instance_id: string
          last_message_at: string | null
          last_message_preview: string | null
          metadata: Json | null
          remote_jid: string
          restaurant_id: string
          status: string
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          instance_id: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          remote_jid: string
          restaurant_id: string
          status?: string
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          instance_id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          metadata?: Json | null
          remote_jid?: string
          restaurant_id?: string
          status?: string
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_threads_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_threads_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          created_at: string | null
          customer_identifier: string | null
          customer_phone: string | null
          discount_amount: number | null
          id: string
          order_id: string | null
          used_at: string
        }
        Insert: {
          coupon_id: string
          created_at?: string | null
          customer_identifier?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Update: {
          coupon_id?: string
          created_at?: string | null
          customer_identifier?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_categories: string[] | null
          applicable_products: string[] | null
          applicable_to: string | null
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_usage: number | null
          max_uses: number | null
          minimum_order_value: number | null
          restaurant_id: string
          title: string
          updated_at: string
          usage_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_to?: string | null
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_usage?: number | null
          max_uses?: number | null
          minimum_order_value?: number | null
          restaurant_id: string
          title: string
          updated_at?: string
          usage_count?: number
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          applicable_categories?: string[] | null
          applicable_products?: string[] | null
          applicable_to?: string | null
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_usage?: number | null
          max_uses?: number | null
          minimum_order_value?: number | null
          restaurant_id?: string
          title?: string
          updated_at?: string
          usage_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          delivery_order_id: string
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          delivery_order_id: string
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          delivery_order_id?: string
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_order_status_history_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          change_for: number | null
          city: string
          complement: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          estimated_delivery_minutes: number | null
          id: string
          neighborhood: string
          notes: string | null
          number: string
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          reference_point: string | null
          restaurant_id: string
          state: string
          status: string
          street: string
          subtotal: number
          total: number
          updated_at: string
          whatsapp_last_attempt_at: string | null
          whatsapp_last_error: string | null
          whatsapp_message_id: string | null
          whatsapp_send_attempts: number
          whatsapp_sent_at: string | null
          zip_code: string
        }
        Insert: {
          change_for?: number | null
          city: string
          complement?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          estimated_delivery_minutes?: number | null
          id?: string
          neighborhood: string
          notes?: string | null
          number: string
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          reference_point?: string | null
          restaurant_id: string
          state: string
          status?: string
          street: string
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_last_attempt_at?: string | null
          whatsapp_last_error?: string | null
          whatsapp_message_id?: string | null
          whatsapp_send_attempts?: number
          whatsapp_sent_at?: string | null
          zip_code: string
        }
        Update: {
          change_for?: number | null
          city?: string
          complement?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          estimated_delivery_minutes?: number | null
          id?: string
          neighborhood?: string
          notes?: string | null
          number?: string
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          reference_point?: string | null
          restaurant_id?: string
          state?: string
          status?: string
          street?: string
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_last_attempt_at?: string | null
          whatsapp_last_error?: string | null
          whatsapp_message_id?: string | null
          whatsapp_send_attempts?: number
          whatsapp_sent_at?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      demos: {
        Row: {
          created_at: string | null
          date: string | null
          email: string
          id: string
          message: string | null
          name: string
          phone: string
          stablishment: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          email: string
          id?: string
          message?: string | null
          name: string
          phone: string
          stablishment: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          stablishment?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          audience_filter: Json
          created_at: string
          created_by: string | null
          failed_count: number
          html_content: string
          id: string
          last_error: string | null
          name: string
          recipient_count: number
          restaurant_id: string
          scheduled_at: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          template_id: string | null
          text_content: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          created_at?: string
          created_by?: string | null
          failed_count?: number
          html_content: string
          id?: string
          last_error?: string | null
          name: string
          recipient_count?: number
          restaurant_id: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          template_id?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          created_at?: string
          created_by?: string | null
          failed_count?: number
          html_content?: string
          id?: string
          last_error?: string | null
          name?: string
          recipient_count?: number
          restaurant_id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          template_id?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          complained_at: string | null
          context_id: string | null
          context_type: string | null
          created_at: string
          delivered_at: string | null
          diagnostic_message: string | null
          diagnostic_status: string | null
          email_type: string
          error_message: string | null
          from_email: string | null
          from_name: string | null
          id: string
          last_event_at: string | null
          metadata: Json
          opened_at: string | null
          provider: string
          provider_message_id: string | null
          recipient_email: string
          recipient_name: string | null
          restaurant_id: string | null
          sent_at: string | null
          status: string
          subject: string
          template_id: string | null
          template_key: string | null
          updated_at: string
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          delivered_at?: string | null
          diagnostic_message?: string | null
          diagnostic_status?: string | null
          email_type?: string
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          last_event_at?: string | null
          metadata?: Json
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          restaurant_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          template_id?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          complained_at?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          delivered_at?: string | null
          diagnostic_message?: string | null
          diagnostic_status?: string | null
          email_type?: string
          error_message?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          last_event_at?: string | null
          metadata?: Json
          opened_at?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          restaurant_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_id?: string | null
          template_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_send_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          api_key: string
          created_at: string
          from_email: string
          from_name: string
          id: string
          is_enabled: boolean
          provider: string
          reply_to: string | null
          restaurant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key: string
          created_at?: string
          from_email: string
          from_name?: string
          id?: string
          is_enabled?: boolean
          provider?: string
          reply_to?: string | null
          restaurant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string
          from_email?: string
          from_name?: string
          id?: string
          is_enabled?: boolean
          provider?: string
          reply_to?: string | null
          restaurant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_enabled: boolean
          is_system: boolean
          name: string
          restaurant_id: string | null
          subject: string
          template_key: string
          text_content: string | null
          updated_at: string
          updated_by: string | null
          variables: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_enabled?: boolean
          is_system?: boolean
          name: string
          restaurant_id?: string | null
          subject: string
          template_key: string
          text_content?: string | null
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_enabled?: boolean
          is_system?: boolean
          name?: string
          restaurant_id?: string | null
          subject?: string
          template_key?: string
          text_content?: string | null
          updated_at?: string
          updated_by?: string | null
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_webhook_events: {
        Row: {
          created_at: string
          email_log_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_message_id: string | null
          svix_id: string | null
        }
        Insert: {
          created_at?: string
          email_log_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_message_id?: string | null
          svix_id?: string | null
        }
        Update: {
          created_at?: string
          email_log_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_message_id?: string | null
          svix_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_webhook_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_send_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_permissions: {
        Row: {
          created_at: string
          employee_id: string
          granted_by: string
          id: string
          permission: Database["public"]["Enums"]["permission_type"]
        }
        Insert: {
          created_at?: string
          employee_id: string
          granted_by: string
          id?: string
          permission: Database["public"]["Enums"]["permission_type"]
        }
        Update: {
          created_at?: string
          employee_id?: string
          granted_by?: string
          id?: string
          permission?: Database["public"]["Enums"]["permission_type"]
        }
        Relationships: [
          {
            foreignKeyName: "employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          created_by: string
          employee_email: string
          employee_name: string
          id: string
          is_active: boolean
          restaurant_id: string
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          employee_email: string
          employee_name: string
          id?: string
          is_active?: boolean
          restaurant_id: string
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          employee_email?: string
          employee_name?: string
          id?: string
          is_active?: boolean
          restaurant_id?: string
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "employees_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_events: {
        Row: {
          acknowledged_at: string | null
          code: string | null
          created_at: string
          error: string | null
          full_code: string | null
          id: string
          merchant_id: string
          order_id: string | null
          payload: Json
          processed_at: string | null
          restaurant_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          code?: string | null
          created_at?: string
          error?: string | null
          full_code?: string | null
          id: string
          merchant_id: string
          order_id?: string | null
          payload?: Json
          processed_at?: string | null
          restaurant_id: string
        }
        Update: {
          acknowledged_at?: string | null
          code?: string | null
          created_at?: string
          error?: string | null
          full_code?: string | null
          id?: string
          merchant_id?: string
          order_id?: string | null
          payload?: Json
          processed_at?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifood_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_integration: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          is_enabled: boolean
          merchant_id: string
          polling_enabled: boolean
          polling_interval: number
          restaurant_id: string
          restaurant_ifood_id: string | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          is_enabled?: boolean
          merchant_id: string
          polling_enabled?: boolean
          polling_interval?: number
          restaurant_id: string
          restaurant_ifood_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          is_enabled?: boolean
          merchant_id?: string
          polling_enabled?: boolean
          polling_interval?: number
          restaurant_id?: string
          restaurant_ifood_id?: string | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ifood_integration_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          menu_id: string
          name: string
          order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          menu_id: string
          name: string
          order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          menu_id?: string
          name?: string
          order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          menu_id: string
          order: number
          product_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          menu_id: string
          order: number
          product_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          menu_id?: string
          order?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_themes: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
          preview_image_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
          preview_image_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
          preview_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      menus: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menus_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      mesas: {
        Row: {
          area_id: string | null
          capacity: number | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          number: string
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          number: string
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          capacity?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          number?: string
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mesas_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          addons: Json | null
          created_at: string
          id: string
          observations: string | null
          order_id: string
          price: number
          product_id: string
          product_name: string
          promotion_discount: number | null
          promotion_id: string | null
          quantity: number
        }
        Insert: {
          addons?: Json | null
          created_at?: string
          id?: string
          observations?: string | null
          order_id: string
          price: number
          product_id: string
          product_name: string
          promotion_discount?: number | null
          promotion_id?: string | null
          quantity: number
        }
        Update: {
          addons?: Json | null
          created_at?: string
          id?: string
          observations?: string | null
          order_id?: string
          price?: number
          product_id?: string
          product_name?: string
          promotion_discount?: number | null
          promotion_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          boleto_barcode: string | null
          boleto_line: string | null
          boleto_url: string | null
          checkout_url: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          order_id: string
          paid_at: string | null
          payment_method: string
          provider: string
          provider_charge_id: string | null
          provider_order_id: string | null
          qr_code: string | null
          qr_code_url: string | null
          raw_response: Json
          restaurant_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          boleto_barcode?: string | null
          boleto_line?: string | null
          boleto_url?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          order_id: string
          paid_at?: string | null
          payment_method: string
          provider?: string
          provider_charge_id?: string | null
          provider_order_id?: string | null
          qr_code?: string | null
          qr_code_url?: string | null
          raw_response?: Json
          restaurant_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          boleto_barcode?: string | null
          boleto_line?: string | null
          boleto_url?: string | null
          checkout_url?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          order_id?: string
          paid_at?: string | null
          payment_method?: string
          provider?: string
          provider_charge_id?: string | null
          provider_order_id?: string | null
          qr_code?: string | null
          qr_code_url?: string | null
          raw_response?: Json
          restaurant_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          employee_id: string | null
          id: string
          ifood_id: string | null
          order_number: string
          order_type: string
          paid_at: string | null
          payment_method: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          restaurant_id: string
          source: string | null
          status: string
          table_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          employee_id?: string | null
          id?: string
          ifood_id?: string | null
          order_number?: string
          order_type: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          restaurant_id: string
          source?: string | null
          status: string
          table_id?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          employee_id?: string | null
          id?: string
          ifood_id?: string | null
          order_number?: string
          order_type?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          restaurant_id?: string
          source?: string | null
          status?: string
          table_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_orders_table_id"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "mesas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      pagarme_config: {
        Row: {
          api_key: string
          created_at: string | null
          created_by: string | null
          id: string
          is_live: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_live?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_live?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pagarme_webhook_events: {
        Row: {
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          order_id: string | null
          pagarme_customer_id: string | null
          pagarme_order_id: string | null
          pagarme_subscription_id: string | null
          payload: Json
          processed: boolean
          processed_at: string | null
          processing_error: string | null
          signature_valid: boolean | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          order_id?: string | null
          pagarme_customer_id?: string | null
          pagarme_order_id?: string | null
          pagarme_subscription_id?: string | null
          payload: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          signature_valid?: boolean | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          order_id?: string | null
          pagarme_customer_id?: string | null
          pagarme_order_id?: string | null
          pagarme_subscription_id?: string | null
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          processing_error?: string | null
          signature_valid?: boolean | null
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          feature: string
          id: string
          is_enabled: boolean | null
          plan_id: string | null
        }
        Insert: {
          feature: string
          id?: string
          is_enabled?: boolean | null
          plan_id?: string | null
        }
        Update: {
          feature?: string
          id?: string
          is_enabled?: boolean | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          description: string | null
          email_campaign_contact_limit: number
          email_campaign_monthly_limit: number
          email_campaigns_enabled: boolean
          email_custom_templates_enabled: boolean
          id: string
          is_active: boolean | null
          name: string
          pagarme_payment_methods: string[] | null
          pagarme_plan_id_monthly: string | null
          pagarme_plan_id_yearly: string | null
          pagarme_sync_error: string | null
          pagarme_sync_status: string
          pagarme_synced_at: string | null
          price_monthly: number
          price_yearly: number
          trial_days: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          email_campaign_contact_limit?: number
          email_campaign_monthly_limit?: number
          email_campaigns_enabled?: boolean
          email_custom_templates_enabled?: boolean
          id?: string
          is_active?: boolean | null
          name: string
          pagarme_payment_methods?: string[] | null
          pagarme_plan_id_monthly?: string | null
          pagarme_plan_id_yearly?: string | null
          pagarme_sync_error?: string | null
          pagarme_sync_status?: string
          pagarme_synced_at?: string | null
          price_monthly: number
          price_yearly: number
          trial_days?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          email_campaign_contact_limit?: number
          email_campaign_monthly_limit?: number
          email_campaigns_enabled?: boolean
          email_custom_templates_enabled?: boolean
          id?: string
          is_active?: boolean | null
          name?: string
          pagarme_payment_methods?: string[] | null
          pagarme_plan_id_monthly?: string | null
          pagarme_plan_id_yearly?: string | null
          pagarme_sync_error?: string | null
          pagarme_sync_status?: string
          pagarme_synced_at?: string | null
          price_monthly?: number
          price_yearly?: number
          trial_days?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_storage_path: string | null
          image_uploaded_at: string | null
          image_uploaded_by: string | null
          image_url: string | null
          name: string
          order_position: number | null
          price: number
          restaurant_id: string
          stock_is_fractional: boolean
          stock_min_quantity: number | null
          stock_quantity: number
          stock_tracking_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_storage_path?: string | null
          image_uploaded_at?: string | null
          image_uploaded_by?: string | null
          image_url?: string | null
          name: string
          order_position?: number | null
          price: number
          restaurant_id: string
          stock_is_fractional?: boolean
          stock_min_quantity?: number | null
          stock_quantity?: number
          stock_tracking_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_storage_path?: string | null
          image_uploaded_at?: string | null
          image_uploaded_by?: string | null
          image_url?: string | null
          name?: string
          order_position?: number | null
          price?: number
          restaurant_id?: string
          stock_is_fractional?: boolean
          stock_min_quantity?: number | null
          stock_quantity?: number
          stock_tracking_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applicable_to: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          min_order_value: number | null
          name: string
          restaurant_id: string
          target_id: string | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_to?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name: string
          restaurant_id: string
          target_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_to?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          min_order_value?: number | null
          name?: string
          restaurant_id?: string
          target_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_email_contacts: {
        Row: {
          accepts_marketing: boolean
          created_at: string
          email: string
          id: string
          last_order_at: string | null
          last_order_id: string | null
          metadata: Json
          name: string | null
          phone: string | null
          restaurant_id: string
          source: string
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          accepts_marketing?: boolean
          created_at?: string
          email: string
          id?: string
          last_order_at?: string | null
          last_order_id?: string | null
          metadata?: Json
          name?: string | null
          phone?: string | null
          restaurant_id: string
          source?: string
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          accepts_marketing?: boolean
          created_at?: string
          email?: string
          id?: string
          last_order_at?: string | null
          last_order_id?: string | null
          metadata?: Json
          name?: string | null
          phone?: string | null
          restaurant_id?: string
          source?: string
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_email_contacts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_menu_config: {
        Row: {
          created_at: string
          custom_colors: Json | null
          custom_settings: Json | null
          id: string
          is_active: boolean
          restaurant_id: string
          theme_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_colors?: Json | null
          custom_settings?: Json | null
          id?: string
          is_active?: boolean
          restaurant_id: string
          theme_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_colors?: Json | null
          custom_settings?: Json | null
          id?: string
          is_active?: boolean
          restaurant_id?: string
          theme_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_menu_config_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "menu_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_payment_settings: {
        Row: {
          allow_counter: boolean
          allow_delivery: boolean
          allow_pickup: boolean
          allow_table: boolean
          commission_type: string
          commission_value: number
          created_at: string
          enabled_methods: string[]
          id: string
          is_enabled: boolean
          marketplace_mode: string
          metadata: Json
          notes: string | null
          onboarding_status: string
          provider: string
          recipient_id: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          allow_counter?: boolean
          allow_delivery?: boolean
          allow_pickup?: boolean
          allow_table?: boolean
          commission_type?: string
          commission_value?: number
          created_at?: string
          enabled_methods?: string[]
          id?: string
          is_enabled?: boolean
          marketplace_mode?: string
          metadata?: Json
          notes?: string | null
          onboarding_status?: string
          provider?: string
          recipient_id?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          allow_counter?: boolean
          allow_delivery?: boolean
          allow_pickup?: boolean
          allow_table?: boolean
          commission_type?: string
          commission_value?: number
          created_at?: string
          enabled_methods?: string[]
          id?: string
          is_enabled?: boolean
          marketplace_mode?: string
          metadata?: Json
          notes?: string | null
          onboarding_status?: string
          provider?: string
          recipient_id?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_payment_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_settings: {
        Row: {
          closing_time: string | null
          created_at: string
          opening_time: string | null
          restaurant_id: string
          setting_key: string
          setting_value: Json
          stock_control_enabled: boolean
          updated_at: string
        }
        Insert: {
          closing_time?: string | null
          created_at?: string
          opening_time?: string | null
          restaurant_id: string
          setting_key: string
          setting_value: Json
          stock_control_enabled?: boolean
          updated_at?: string
        }
        Update: {
          closing_time?: string | null
          created_at?: string
          opening_time?: string | null
          restaurant_id?: string
          setting_key?: string
          setting_value?: Json
          stock_control_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          active: boolean
          address: string | null
          banner_url: string | null
          business_hours: string | null
          category: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          phone_whatsapp: string | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          banner_url?: string | null
          business_hours?: string | null
          category?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          phone_whatsapp?: string | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          banner_url?: string | null
          business_hours?: string | null
          category?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          phone_whatsapp?: string | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          idempotency_key: string | null
          movement_type: string
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          product_id: string
          quantity_delta: number
          reason: string | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          movement_type: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_id: string
          quantity_delta: number
          reason?: string | null
          restaurant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          idempotency_key?: string | null
          movement_type?: string
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string
          quantity_delta?: number
          reason?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_cycle: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          end_date: string | null
          id: string
          is_trial: boolean | null
          last_payment_at: string | null
          last_payment_status: string | null
          next_billing_at: string | null
          pagarme_customer_id: string | null
          pagarme_subscription_id: string | null
          plan_id: string
          restaurant_id: string
          start_date: string
          status: string
          trial_ends_at: string | null
          trial_start: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string | null
          id?: string
          is_trial?: boolean | null
          last_payment_at?: string | null
          last_payment_status?: string | null
          next_billing_at?: string | null
          pagarme_customer_id?: string | null
          pagarme_subscription_id?: string | null
          plan_id: string
          restaurant_id: string
          start_date: string
          status: string
          trial_ends_at?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          end_date?: string | null
          id?: string
          is_trial?: boolean | null
          last_payment_at?: string | null
          last_payment_status?: string | null
          next_billing_at?: string | null
          pagarme_customer_id?: string | null
          pagarme_subscription_id?: string | null
          plan_id?: string
          restaurant_id?: string
          start_date?: string
          status?: string
          trial_ends_at?: string | null
          trial_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_admins: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_configurations: {
        Row: {
          auto_print: boolean | null
          created_at: string
          dark_mode: boolean | null
          id: string
          language: string | null
          notification_email: boolean | null
          notification_new_order: boolean | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          auto_print?: boolean | null
          created_at?: string
          dark_mode?: boolean | null
          id?: string
          language?: string | null
          notification_email?: boolean | null
          notification_new_order?: boolean | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          auto_print?: boolean | null
          created_at?: string
          dark_mode?: boolean | null
          id?: string
          language?: string | null
          notification_email?: boolean | null
          notification_new_order?: boolean | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_configurations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_storage_path: string | null
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          restaurant_id: string | null
          role: string
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_storage_path?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          restaurant_id?: string | null
          role?: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_storage_path?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          restaurant_id?: string | null
          role?: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instance_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_data: Json | null
          event_type: string
          id: string
          instance_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          instance_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          instance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instance_events_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          automation_enabled: boolean
          created_at: string | null
          created_by: string
          evolution_instance_id: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          last_connection_update_at: string | null
          phone_number: string | null
          qrcode_base64: string | null
          restaurant_id: string
          status: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          automation_enabled?: boolean
          created_at?: string | null
          created_by: string
          evolution_instance_id?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          last_connection_update_at?: string | null
          phone_number?: string | null
          qrcode_base64?: string | null
          restaurant_id: string
          status?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          automation_enabled?: boolean
          created_at?: string | null
          created_by?: string
          evolution_instance_id?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
          last_connection_update_at?: string | null
          phone_number?: string | null
          qrcode_base64?: string | null
          restaurant_id?: string
          status?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assert_restaurant_report_access: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      audit_changed_fields: {
        Args: { ignored_fields?: string[]; new_data: Json; old_data: Json }
        Returns: Json
      }
      adjust_stock: { Args: { p_args: Json }; Returns: Json }
      apply_stock_for_order: {
        Args: { p_order_id: string; p_allow_negative: boolean }
        Returns: Json
      }
      apply_stock_movement: { Args: { p_args: Json }; Returns: Json }
      apply_public_loyalty_redemption: {
        Args: { p_order_id: string; p_requested_amount: number }
        Returns: Json
      }
      can_manage_restaurant_employees: {
        Args: { target_restaurant_id: string }
        Returns: boolean
      }
      create_default_employee_permissions: {
        Args: { employee_id_param: string; granted_by_param: string }
        Returns: undefined
      }
      create_pos_order: { Args: { payload: Json }; Returns: Json }
      capture_crm_lead_from_order: {
        Args: {
          p_accepts_marketing?: boolean | null
          p_order_id: string
          p_source?: string | null
        }
        Returns: Json
      }
      create_public_menu_order: { Args: { payload: Json }; Returns: Json }
      get_public_order_tracking: {
        Args: { p_tracking_id: string }
        Returns: Json
      }
      get_public_plan_summaries: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_public_restaurant_payment_settings: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      get_public_restaurant_promotions: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      get_public_loyalty_quote: {
        Args: {
          p_order_subtotal?: number
          p_phone: string
          p_restaurant_id: string
        }
        Returns: Json
      }
      get_orders_summary: {
        Args: {
          p_data_fim?: string | null
          p_data_inicio?: string | null
          p_restaurant_id: string
          p_status?: string | null
        }
        Returns: Json
      }
      get_restaurant_crm_customer_detail: {
        Args: {
          p_limit?: number
          p_phone_normalized: string
          p_restaurant_id: string
        }
        Returns: Json
      }
      get_restaurant_crm_customers: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_restaurant_id: string
          p_search?: string | null
          p_segment?: string
        }
        Returns: Json
      }
      get_my_subscription_summaries: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      get_restaurant_dashboard_metrics: {
        Args: {
          p_include_financials?: boolean
          p_restaurant_id: string
          p_window_days?: number
        }
        Returns: Json
      }
      get_restaurant_loyalty_dashboard: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      get_restaurant_sales_period_metrics: {
        Args: {
          p_canal?: string
          p_from: string
          p_restaurant_id: string
          p_to: string
        }
        Returns: Json
      }
      get_restaurant_sales_report: {
        Args: {
          p_canal?: string
          p_from: string
          p_produtos_sort?: string
          p_restaurant_id: string
          p_status?: string
          p_to: string
        }
        Returns: Json
      }
      get_restaurant_subscription_entitlement: {
        Args: { p_restaurant_id: string }
        Returns: Json
      }
      get_user_basic_info: {
        Args: { _user_id: string }
        Returns: {
          email: string
          id: string
          name: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_user_restaurant_id: { Args: never; Returns: string }
      get_users_basic_info: {
        Args: { _user_ids: string[] }
        Returns: {
          email: string
          id: string
          name: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      insert_configuration_audit_log: {
        Args: {
          p_action: string
          p_area: string
          p_changes: Json
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_restaurant_id: string
          p_target_user_id?: string
        }
        Returns: string
      }
      is_owner_or_manager: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      is_super_admin_v2: { Args: { user_id: string }; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      log_admin_activity: {
        Args: {
          action: string
          admin_id: string
          details?: Json
          entity_id: string
          entity_type: string
        }
        Returns: string
      }
      record_configuration_audit_event: {
        Args: {
          event_action: string
          event_area: string
          event_changes: Json
          event_entity_id: string
          event_entity_type: string
          event_metadata?: Json
          event_target_user_id?: string
          target_restaurant_id: string
        }
        Returns: string
      }
      repair_missing_restaurant_subscriptions: { Args: never; Returns: number }
      revert_stock_for_order: { Args: { p_order_id: string }; Returns: Json }
      save_restaurant_loyalty_settings: {
        Args: { p_patch: Json; p_restaurant_id: string }
        Returns: Json
      }
      update_crm_customer_profile: {
        Args: {
          p_patch: Json
          p_phone_normalized: string
          p_restaurant_id: string
        }
        Returns: Json
      }
      update_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: Json
      }
      user_can_access_conversation_realtime_topic: {
        Args: { p_topic: string }
        Returns: boolean
      }
      user_has_restaurant_permission: {
        Args: {
          required_permission: Database["public"]["Enums"]["permission_type"]
          target_restaurant_id: string
        }
        Returns: boolean
      }
      user_has_role: {
        Args: { required_role: string; user_id: string }
        Returns: boolean
      }
      validate_public_coupon: {
        Args: { p_code: string; p_order_value: number; p_restaurant_id: string }
        Returns: Json
      }
    }
    Enums: {
      permission_type:
        | "pdv_access"
        | "orders_view"
        | "orders_manage"
        | "products_view"
        | "products_manage"
        | "reports_view"
        | "settings_view"
        | "settings_manage"
        | "employees_manage"
        | "dashboard_view"
        | "subscription_view"
        | "whatsapp_manage"
        | "whatsapp_manage_instances"
        | "whatsapp_take_conversations"
        | "whatsapp_reply_as_human"
        | "whatsapp_view_all_conversations"
        | "whatsapp_configure_automation"
        | "orders_metrics_view"
        | "settings_establishment_manage"
        | "settings_system_manage"
        | "settings_integrations_manage"
        | "settings_audit_view"
      user_type: "owner" | "employee" | "manager"
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
      permission_type: [
        "pdv_access",
        "orders_view",
        "orders_manage",
        "products_view",
        "products_manage",
        "reports_view",
        "settings_view",
        "settings_manage",
        "employees_manage",
        "dashboard_view",
        "subscription_view",
        "whatsapp_manage",
        "whatsapp_manage_instances",
        "whatsapp_take_conversations",
        "whatsapp_reply_as_human",
        "whatsapp_view_all_conversations",
        "whatsapp_configure_automation",
        "orders_metrics_view",
        "settings_establishment_manage",
        "settings_system_manage",
        "settings_integrations_manage",
        "settings_audit_view",
      ],
      user_type: ["owner", "employee", "manager"],
    },
  },
} as const
