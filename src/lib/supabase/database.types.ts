/**
 * DBスキーマの型。supabase/migrations に合わせて手で書いている。
 * Supabaseプロジェクトの準備後は `supabase gen types typescript` の出力で置き換える。
 */
export type Database = {
  public: {
    Tables: {
      notes: {
        Row: {
          id: string;
          user_id: string;
          body: string;
          has_image: boolean;
          image_uploaded_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          body?: string;
          has_image?: boolean;
          /** 追加の後で、写真を送り終えてから書く。 */
          image_uploaded_at?: never;
          created_at?: never;
        };
        Update: {
          id?: never;
          user_id?: never;
          body?: never;
          has_image?: never;
          image_uploaded_at?: string;
          created_at?: never;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          device_id: string | null;
          user_id: string | null;
          world_id: string | null;
          hero_name: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_id?: string | null;
          user_id?: string | null;
          world_id?: string | null;
          hero_name?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string | null;
          user_id?: string | null;
          world_id?: string | null;
          hero_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_logs: {
        Row: {
          id: string;
          device_id: string | null;
          user_id: string | null;
          subject: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id: string;
          device_id?: string | null;
          user_id?: string | null;
          subject: string;
          started_at: string;
          ended_at: string;
          /** DBが計算する列のため、書き込めない。 */
          duration_seconds?: never;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string | null;
          user_id?: string | null;
          subject?: string;
          started_at?: string;
          ended_at?: string;
          duration_seconds?: never;
          created_at?: string;
        };
        Relationships: [];
      };
      quiz_cards: {
        Row: {
          id: string;
          device_id: string | null;
          user_id: string | null;
          subject: string;
          question: string;
          answer: string;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id: string;
          device_id?: string | null;
          user_id?: string | null;
          subject: string;
          question: string;
          answer: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          device_id?: string | null;
          user_id?: string | null;
          subject?: string;
          question?: string;
          answer?: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      answer_logs: {
        Row: {
          id: string;
          device_id: string | null;
          user_id: string | null;
          card_id: string;
          user_answer: string;
          is_correct: boolean;
          mistake_reason: string | null;
          answered_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          device_id?: string | null;
          user_id?: string | null;
          card_id: string;
          user_answer: string;
          is_correct: boolean;
          mistake_reason?: string | null;
          answered_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string | null;
          user_id?: string | null;
          card_id?: string;
          user_answer?: string;
          is_correct?: boolean;
          mistake_reason?: string | null;
          answered_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answer_logs_card_id_device_id_fkey";
            columns: ["card_id", "device_id"];
            isOneToOne: false;
            referencedRelation: "quiz_cards";
            referencedColumns: ["id", "device_id"];
          },
          {
            foreignKeyName: "answer_logs_card_id_user_id_fkey";
            columns: ["card_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "quiz_cards";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      claim_device_records: {
        Args: { p_device_id: string; p_user_id: string };
        Returns: { study_logs: number; cards: number; answers: number }[];
      };
      my_progress_totals: {
        Args: Record<PropertyKey, never>;
        Returns: { study_seconds: number; correct_count: number }[];
      };
      my_subject_stats: {
        Args: { p_since: string };
        Returns: {
          subject: string;
          study_seconds: number;
          answer_count: number;
          correct_count: number;
          knowledge_count: number;
          understanding_count: number;
          careless_count: number;
        }[];
      };
      progress_totals: {
        Args: { p_device_id: string };
        Returns: { study_seconds: number; correct_count: number }[];
      };
      subject_stats: {
        Args: { p_device_id: string; p_since: string };
        Returns: {
          subject: string;
          study_seconds: number;
          answer_count: number;
          correct_count: number;
          knowledge_count: number;
          understanding_count: number;
          careless_count: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
