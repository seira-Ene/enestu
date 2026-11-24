/**
 * DBスキーマの型。テーブルがまだないため空にしている。
 * テーブル作成後は `supabase gen types typescript` の出力で置き換える。
 */
export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
