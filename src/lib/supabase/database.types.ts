/**
 * DBスキーマの型。supabase/migrations に合わせて手で書いている。
 * Supabaseプロジェクトの準備後は `supabase gen types typescript` の出力で置き換える。
 */
export type Database = {
  public: {
    Tables: {
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
