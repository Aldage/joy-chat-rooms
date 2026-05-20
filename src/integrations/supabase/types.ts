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
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["coin_tx_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["coin_tx_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["coin_tx_type"]
          user_id?: string
        }
        Relationships: []
      }
      dice_games: {
        Row: {
          bet_amount: number
          dice_result: number
          id: string
          is_win: boolean
          played_at: string
          reward_amount: number
          room_id: string | null
          user_id: string
        }
        Insert: {
          bet_amount: number
          dice_result: number
          id?: string
          is_win: boolean
          played_at?: string
          reward_amount?: number
          room_id?: string | null
          user_id: string
        }
        Update: {
          bet_amount?: number
          dice_result?: number
          id?: string
          is_win?: boolean
          played_at?: string
          reward_amount?: number
          room_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          amount: number
          created_at: string
          gift_id: string
          id: string
          receiver_id: string
          room_id: string
          sender_id: string
          total_cost: number
        }
        Insert: {
          amount?: number
          created_at?: string
          gift_id: string
          id?: string
          receiver_id: string
          room_id: string
          sender_id: string
          total_cost: number
        }
        Update: {
          amount?: number
          created_at?: string
          gift_id?: string
          id?: string
          receiver_id?: string
          room_id?: string
          sender_id?: string
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_transactions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_transactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          cost: number
          created_at: string
          emoji: string
          id: string
          name: string
        }
        Insert: {
          cost: number
          created_at?: string
          emoji: string
          id?: string
          name: string
        }
        Update: {
          cost?: number
          created_at?: string
          emoji?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pk_battles: {
        Row: {
          blue_team_score: number
          ended_at: string | null
          id: string
          red_team_score: number
          room_id: string
          started_at: string
          status: Database["public"]["Enums"]["pk_status"]
        }
        Insert: {
          blue_team_score?: number
          ended_at?: string | null
          id?: string
          red_team_score?: number
          room_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["pk_status"]
        }
        Update: {
          blue_team_score?: number
          ended_at?: string | null
          id?: string
          red_team_score?: number
          room_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["pk_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_entry_effect: string | null
          active_frame: string | null
          avatar_url: string | null
          bio: string | null
          coin_balance: number
          coins_earned: number
          created_at: string
          display_name: string
          id: string
          is_guest: boolean
          updated_at: string
          xp: number
        }
        Insert: {
          active_entry_effect?: string | null
          active_frame?: string | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          coins_earned?: number
          created_at?: string
          display_name?: string
          id: string
          is_guest?: boolean
          updated_at?: string
          xp?: number
        }
        Update: {
          active_entry_effect?: string | null
          active_frame?: string | null
          avatar_url?: string | null
          bio?: string | null
          coin_balance?: number
          coins_earned?: number
          created_at?: string
          display_name?: string
          id?: string
          is_guest?: boolean
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      room_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_seats: {
        Row: {
          id: string
          is_locked: boolean
          is_muted: boolean
          room_id: string
          seat_index: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          is_locked?: boolean
          is_muted?: boolean
          room_id: string
          seat_index: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          id?: string
          is_locked?: boolean
          is_muted?: boolean
          room_id?: string
          seat_index?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_seats_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          owner_id: string
          password: string | null
          popularity: number
          seat_count: number
          tag: string | null
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          owner_id: string
          password?: string | null
          popularity?: number
          seat_count?: number
          tag?: string | null
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string
          password?: string | null
          popularity?: number
          seat_count?: number
          tag?: string | null
          title?: string
        }
        Relationships: []
      }
      user_items: {
        Row: {
          acquired_at: string
          expires_at: string | null
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          expires_at?: string | null
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          expires_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_room_popularity: {
        Args: { _delta: number; _room_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      purchase_store_item: {
        Args: { _cost: number; _item_id: string; _item_type: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      coin_tx_type:
        | "purchase"
        | "gift_send"
        | "gift_receive"
        | "dice_bet"
        | "dice_win"
        | "store_buy"
      pk_status: "active" | "completed"
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
      app_role: ["admin", "moderator", "user"],
      coin_tx_type: [
        "purchase",
        "gift_send",
        "gift_receive",
        "dice_bet",
        "dice_win",
        "store_buy",
      ],
      pk_status: ["active", "completed"],
    },
  },
} as const
