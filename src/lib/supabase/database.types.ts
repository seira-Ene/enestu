/**
 * DBスキーマの型。supabase/migrations に合わせて手で書いている。
 * Supabaseプロジェクトの準備後は `supabase gen types typescript` の出力で置き換える。
 */
export type Database = {
  public: {
    Tables: {
      user_settings: {
        Row: { device_id: string; world_id: string; updated_at: string };
        Insert: { device_id: string; world_id: string; updated_at?: string };
        Update: { device_id?: string; world_id?: string; updated_at?: string };
        Relationships: [];
      };
      study_logs: {
        Row: {
          id: string;
          device_id: string;
          subject: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id: string;
          device_id: string;
          subject: string;
          started_at: string;
          ended_at: string;
          /** DBが計算する列のため、書き込めない。 */
          duration_seconds?: never;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
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
          device_id: string;
          subject: string;
          question: string;
          answer: string;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id: string;
          device_id: string;
          subject: string;
          question: string;
          answer: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          device_id?: string;
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
          device_id: string;
          card_id: string;
          user_answer: string;
          is_correct: boolean;
          mistake_reason: string | null;
          answered_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          device_id: string;
          card_id: string;
          user_answer: string;
          is_correct: boolean;
          mistake_reason?: string | null;
          answered_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
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
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
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
