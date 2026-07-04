export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '14.5';
    };
    public: {
        Tables: {
            competitions: {
                Row: {
                    api_league_id: number;
                    api_season: number;
                    ends_on: string;
                    id: string;
                    is_active: boolean;
                    name: string;
                    slug: string;
                    starts_on: string;
                };
                Insert: {
                    api_league_id: number;
                    api_season: number;
                    ends_on: string;
                    id?: string;
                    is_active?: boolean;
                    name: string;
                    slug: string;
                    starts_on: string;
                };
                Update: {
                    api_league_id?: number;
                    api_season?: number;
                    ends_on?: string;
                    id?: string;
                    is_active?: boolean;
                    name?: string;
                    slug?: string;
                    starts_on?: string;
                };
                Relationships: [];
            };
            job_runs: {
                Row: {
                    api_calls_used: number;
                    detail: Json | null;
                    finished_at: string | null;
                    id: string;
                    job: string;
                    started_at: string;
                    status: string;
                };
                Insert: {
                    api_calls_used?: number;
                    detail?: Json | null;
                    finished_at?: string | null;
                    id?: string;
                    job: string;
                    started_at?: string;
                    status?: string;
                };
                Update: {
                    api_calls_used?: number;
                    detail?: Json | null;
                    finished_at?: string | null;
                    id?: string;
                    job?: string;
                    started_at?: string;
                    status?: string;
                };
                Relationships: [];
            };
            matches: {
                Row: {
                    api_game_id: number;
                    away_score: number | null;
                    away_team_id: string | null;
                    away_tries: number | null;
                    competition_id: string;
                    home_score: number | null;
                    home_team_id: string | null;
                    home_tries: number | null;
                    id: string;
                    kickoff_at: string;
                    needs_review: boolean;
                    odds_away: number | null;
                    odds_captured_at: string | null;
                    odds_draw: number | null;
                    odds_home: number | null;
                    odds_source: string | null;
                    round: string | null;
                    scored_at: string | null;
                    status: Database['public']['Enums']['match_status'];
                    tries_missing: boolean;
                };
                Insert: {
                    api_game_id: number;
                    away_score?: number | null;
                    away_team_id?: string | null;
                    away_tries?: number | null;
                    competition_id: string;
                    home_score?: number | null;
                    home_team_id?: string | null;
                    home_tries?: number | null;
                    id?: string;
                    kickoff_at: string;
                    needs_review?: boolean;
                    odds_away?: number | null;
                    odds_captured_at?: string | null;
                    odds_draw?: number | null;
                    odds_home?: number | null;
                    odds_source?: string | null;
                    round?: string | null;
                    scored_at?: string | null;
                    status?: Database['public']['Enums']['match_status'];
                    tries_missing?: boolean;
                };
                Update: {
                    api_game_id?: number;
                    away_score?: number | null;
                    away_team_id?: string | null;
                    away_tries?: number | null;
                    competition_id?: string;
                    home_score?: number | null;
                    home_team_id?: string | null;
                    home_tries?: number | null;
                    id?: string;
                    kickoff_at?: string;
                    needs_review?: boolean;
                    odds_away?: number | null;
                    odds_captured_at?: string | null;
                    odds_draw?: number | null;
                    odds_home?: number | null;
                    odds_source?: string | null;
                    round?: string | null;
                    scored_at?: string | null;
                    status?: Database['public']['Enums']['match_status'];
                    tries_missing?: boolean;
                };
                Relationships: [
                    {
                        foreignKeyName: 'matches_away_team_id_fkey';
                        columns: ['away_team_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'matches_competition_id_fkey';
                        columns: ['competition_id'];
                        isOneToOne: false;
                        referencedRelation: 'competitions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'matches_home_team_id_fkey';
                        columns: ['home_team_id'];
                        isOneToOne: false;
                        referencedRelation: 'teams';
                        referencedColumns: ['id'];
                    },
                ];
            };
            profiles: {
                Row: {
                    created_at: string;
                    id: string;
                    username: string;
                };
                Insert: {
                    created_at?: string;
                    id: string;
                    username: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    username?: string;
                };
                Relationships: [];
            };
            teams: {
                Row: {
                    api_team_id: number;
                    code: string | null;
                    color: string | null;
                    flag_emoji: string | null;
                    id: string;
                    name: string;
                };
                Insert: {
                    api_team_id: number;
                    code?: string | null;
                    color?: string | null;
                    flag_emoji?: string | null;
                    id?: string;
                    name: string;
                };
                Update: {
                    api_team_id?: number;
                    code?: string | null;
                    color?: string | null;
                    flag_emoji?: string | null;
                    id?: string;
                    name?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            username_available: { Args: { candidate: string }; Returns: boolean };
        };
        Enums: {
            match_status: 'scheduled' | 'in_play' | 'finished' | 'postponed' | 'cancelled';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
            DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] &
            DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema['Enums']
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {
            match_status: ['scheduled', 'in_play', 'finished', 'postponed', 'cancelled'],
        },
    },
} as const;
