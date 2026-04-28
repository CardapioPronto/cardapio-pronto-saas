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
          restaurant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          restaurant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
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
          customer_name: string
          customer_phone: string
          delivery_fee: number
          estimated_delivery_minutes: number | null
          id: string
          neighborhood: string
          notes: string | null
          number: string
          order_id: string | null
          payment_method: string | null
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
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          estimated_delivery_minutes?: number | null
          id?: string
          neighborhood: string
          notes?: string | null
          number: string
          order_id?: string | null
          payment_method?: string | null
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
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          estimated_delivery_minutes?: number | null
          id?: string
          neighborhood?: string
          notes?: string | null
          number?: string
          order_id?: string | null
          payment_method?: string | null
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
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          employee_id: string | null
          id: string
          ifood_id: string | null
          order_number: string
          order_type: string
          payment_method: string | null
          restaurant_id: string
          source: string | null
          status: string
          table_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          employee_id?: string | null
          id?: string
          ifood_id?: string | null
          order_number?: string
          order_type: string
          payment_method?: string | null
          restaurant_id: string
          source?: string | null
          status: string
          table_id?: string | null
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          employee_id?: string | null
          id?: string
          ifood_id?: string | null
          order_number?: string
          order_type?: string
          payment_method?: string | null
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
          pagarme_customer_id: string | null
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
          pagarme_customer_id?: string | null
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
          pagarme_customer_id?: string | null
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
          id: string
          is_active: boolean | null
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price_monthly: number
          price_yearly: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
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
      restaurant_settings: {
        Row: {
          created_at: string
          restaurant_id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          restaurant_id: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          restaurant_id?: string
          setting_key?: string
          setting_value?: Json
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
      subscriptions: {
        Row: {
          created_at: string
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
          updated_at: string
        }
        Insert: {
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          created_at?: string
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
          updated_at?: string
        }
        Relationships: [
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
      whatsapp_ai_config: {
        Row: {
          active: boolean | null
          additional_instructions: string | null
          ai_persona: string | null
          bot_name: string | null
          created_at: string | null
          id: string
          instance_name: string
          phone_connected: string | null
          qrcode_base64: string | null
          restaurant_id: string
          status: string
          updated_at: string | null
          use_menu_knowledge: boolean | null
        }
        Insert: {
          active?: boolean | null
          additional_instructions?: string | null
          ai_persona?: string | null
          bot_name?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          phone_connected?: string | null
          qrcode_base64?: string | null
          restaurant_id: string
          status?: string
          updated_at?: string | null
          use_menu_knowledge?: boolean | null
        }
        Update: {
          active?: boolean | null
          additional_instructions?: string | null
          ai_persona?: string | null
          bot_name?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          phone_connected?: string | null
          qrcode_base64?: string | null
          restaurant_id?: string
          status?: string
          updated_at?: string | null
          use_menu_knowledge?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_config_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_chat_history: {
        Row: {
          config_id: string | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          id: string
          is_from_ai: boolean | null
          message_content: string
          message_type: string
          remote_jid: string
          restaurant_id: string
        }
        Insert: {
          config_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          is_from_ai?: boolean | null
          message_content: string
          message_type: string
          remote_jid: string
          restaurant_id: string
        }
        Update: {
          config_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          is_from_ai?: boolean | null
          message_content?: string
          message_type?: string
          remote_jid?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_chat_history_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_ai_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_chat_history_restaurant_id_fkey"
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
          created_at: string | null
          created_by: string
          evolution_instance_id: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          phone_number: string | null
          qrcode_base64: string | null
          restaurant_id: string
          status: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          evolution_instance_id?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          phone_number?: string | null
          qrcode_base64?: string | null
          restaurant_id: string
          status?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          evolution_instance_id?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
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
      whatsapp_integration: {
        Row: {
          ai_enabled: boolean | null
          ai_provider: string | null
          ai_system_prompt: string | null
          api_token: string | null
          auto_send_orders: boolean
          created_at: string
          is_enabled: boolean
          n8n_enabled: boolean | null
          n8n_webhook_url: string | null
          order_confirmation_message: string
          phone_number: string
          provider: string | null
          restaurant_id: string
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_phone_number: string | null
          ultramsg_instance_id: string | null
          ultramsg_token: string | null
          updated_at: string
          webhook_url: string | null
          welcome_message: string
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_provider?: string | null
          ai_system_prompt?: string | null
          api_token?: string | null
          auto_send_orders?: boolean
          created_at?: string
          is_enabled?: boolean
          n8n_enabled?: boolean | null
          n8n_webhook_url?: string | null
          order_confirmation_message?: string
          phone_number: string
          provider?: string | null
          restaurant_id: string
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          ultramsg_instance_id?: string | null
          ultramsg_token?: string | null
          updated_at?: string
          webhook_url?: string | null
          welcome_message?: string
        }
        Update: {
          ai_enabled?: boolean | null
          ai_provider?: string | null
          ai_system_prompt?: string | null
          api_token?: string | null
          auto_send_orders?: boolean
          created_at?: string
          is_enabled?: boolean
          n8n_enabled?: boolean | null
          n8n_webhook_url?: string | null
          order_confirmation_message?: string
          phone_number?: string
          provider?: string | null
          restaurant_id?: string
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          ultramsg_instance_id?: string | null
          ultramsg_token?: string | null
          updated_at?: string
          webhook_url?: string | null
          welcome_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_integration_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          message_content: string
          restaurant_id: string
          template_name: string
          template_type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          message_content: string
          restaurant_id: string
          template_name: string
          template_type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          message_content?: string
          restaurant_id?: string
          template_name?: string
          template_type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          order_id: string | null
          phone_number: string
          restaurant_id: string
          status: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type: string
          order_id?: string | null
          phone_number: string
          restaurant_id: string
          status?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          order_id?: string | null
          phone_number?: string
          restaurant_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_restaurant_id_fkey"
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
      create_default_employee_permissions: {
        Args: { employee_id_param: string; granted_by_param: string }
        Returns: undefined
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
      user_has_role: {
        Args: { required_role: string; user_id: string }
        Returns: boolean
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
      ],
      user_type: ["owner", "employee", "manager"],
    },
  },
} as const
