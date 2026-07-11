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
            league_members: {
                Row: {
                    joined_at: string;
                    league_id: string;
                    role: Database['public']['Enums']['league_role'];
                    user_id: string;
                };
                Insert: {
                    joined_at?: string;
                    league_id: string;
                    role?: Database['public']['Enums']['league_role'];
                    user_id: string;
                };
                Update: {
                    joined_at?: string;
                    league_id?: string;
                    role?: Database['public']['Enums']['league_role'];
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'league_members_league_id_fkey';
                        columns: ['league_id'];
                        isOneToOne: false;
                        referencedRelation: 'leagues';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'league_members_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            leagues: {
                Row: {
                    competition_id: string;
                    created_at: string;
                    id: string;
                    invite_code: string;
                    name: string;
                    owner_id: string;
                };
                Insert: {
                    competition_id: string;
                    created_at?: string;
                    id?: string;
                    invite_code: string;
                    name: string;
                    owner_id: string;
                };
                Update: {
                    competition_id?: string;
                    created_at?: string;
                    id?: string;
                    invite_code?: string;
                    name?: string;
                    owner_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'leagues_competition_id_fkey';
                        columns: ['competition_id'];
                        isOneToOne: false;
                        referencedRelation: 'competitions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'leagues_owner_id_fkey';
                        columns: ['owner_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
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
            notification_prefs: {
                Row: {
                    master: boolean;
                    reminder_enabled: boolean;
                    results_enabled: boolean;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    master?: boolean;
                    reminder_enabled?: boolean;
                    results_enabled?: boolean;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    master?: boolean;
                    reminder_enabled?: boolean;
                    results_enabled?: boolean;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notification_prefs_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: true;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            notification_sends: {
                Row: {
                    created_at: string;
                    id: string;
                    match_id: string;
                    receipt_checked_at: string | null;
                    status: string;
                    ticket_ids: Json | null;
                    type: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    match_id: string;
                    receipt_checked_at?: string | null;
                    status?: string;
                    ticket_ids?: Json | null;
                    type: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    match_id?: string;
                    receipt_checked_at?: string | null;
                    status?: string;
                    ticket_ids?: Json | null;
                    type?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'notification_sends_match_id_fkey';
                        columns: ['match_id'];
                        isOneToOne: false;
                        referencedRelation: 'matches';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'notification_sends_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            predictions: {
                Row: {
                    created_at: string;
                    id: string;
                    match_id: string;
                    points_awarded: number | null;
                    points_breakdown: Json | null;
                    predicted_away_score: number;
                    predicted_bonus_off_away: boolean;
                    predicted_bonus_off_home: boolean;
                    predicted_home_score: number;
                    scored_at: string | null;
                    scoring_rule_version: number | null;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    match_id: string;
                    points_awarded?: number | null;
                    points_breakdown?: Json | null;
                    predicted_away_score: number;
                    predicted_bonus_off_away?: boolean;
                    predicted_bonus_off_home?: boolean;
                    predicted_home_score: number;
                    scored_at?: string | null;
                    scoring_rule_version?: number | null;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    match_id?: string;
                    points_awarded?: number | null;
                    points_breakdown?: Json | null;
                    predicted_away_score?: number;
                    predicted_bonus_off_away?: boolean;
                    predicted_bonus_off_home?: boolean;
                    predicted_home_score?: number;
                    scored_at?: string | null;
                    scoring_rule_version?: number | null;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'predictions_match_id_fkey';
                        columns: ['match_id'];
                        isOneToOne: false;
                        referencedRelation: 'matches';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'predictions_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            profiles: {
                Row: {
                    created_at: string;
                    id: string;
                    locale: string | null;
                    username: string;
                };
                Insert: {
                    created_at?: string;
                    id: string;
                    locale?: string | null;
                    username: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    locale?: string | null;
                    username?: string;
                };
                Relationships: [];
            };
            push_tokens: {
                Row: {
                    created_at: string;
                    id: string;
                    platform: string;
                    token: string;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    platform: string;
                    token: string;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    platform?: string;
                    token?: string;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'push_tokens_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
            };
            scoring_rules: {
                Row: {
                    created_at: string;
                    is_active: boolean;
                    rules: Json;
                    version: number;
                };
                Insert: {
                    created_at?: string;
                    is_active?: boolean;
                    rules: Json;
                    version: number;
                };
                Update: {
                    created_at?: string;
                    is_active?: boolean;
                    rules?: Json;
                    version?: number;
                };
                Relationships: [];
            };
            standings: {
                Row: {
                    competition_id: string;
                    exact_scores: number;
                    predictions_scored: number;
                    total_points: number;
                    updated_at: string;
                    user_id: string;
                };
                Insert: {
                    competition_id: string;
                    exact_scores?: number;
                    predictions_scored?: number;
                    total_points?: number;
                    updated_at?: string;
                    user_id: string;
                };
                Update: {
                    competition_id?: string;
                    exact_scores?: number;
                    predictions_scored?: number;
                    total_points?: number;
                    updated_at?: string;
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'standings_competition_id_fkey';
                        columns: ['competition_id'];
                        isOneToOne: false;
                        referencedRelation: 'competitions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'standings_user_id_fkey';
                        columns: ['user_id'];
                        isOneToOne: false;
                        referencedRelation: 'profiles';
                        referencedColumns: ['id'];
                    },
                ];
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
            apply_match_scores: {
                Args: {
                    p_match_id: string;
                    p_predictions: Json;
                    p_rule_version: number;
                };
                Returns: Json;
            };
            create_league: {
                Args: { p_name: string };
                Returns: {
                    competition_id: string;
                    created_at: string;
                    id: string;
                    invite_code: string;
                    name: string;
                    owner_id: string;
                };
                SetofOptions: {
                    from: '*';
                    to: 'leagues';
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            get_global_leaderboard: {
                Args: { p_competition_id: string; p_limit?: number; p_offset?: number };
                Returns: {
                    exact_scores: number;
                    predictions_scored: number;
                    rank: number;
                    total_points: number;
                    user_id: string;
                    username: string;
                }[];
            };
            get_league_leaderboard: {
                Args: { p_league_id: string; p_limit?: number; p_offset?: number };
                Returns: {
                    exact_scores: number;
                    predictions_scored: number;
                    rank: number;
                    total_points: number;
                    user_id: string;
                    username: string;
                }[];
            };
            is_league_member: { Args: { p_league_id: string }; Returns: boolean };
            is_league_owner: { Args: { p_league_id: string }; Returns: boolean };
            join_league: {
                Args: { p_code: string };
                Returns: {
                    competition_id: string;
                    created_at: string;
                    id: string;
                    invite_code: string;
                    name: string;
                    owner_id: string;
                };
                SetofOptions: {
                    from: '*';
                    to: 'leagues';
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            notify_reminder_targets: {
                Args: never;
                Returns: {
                    away_team: string;
                    home_team: string;
                    kickoff_at: string;
                    locale: string;
                    match_id: string;
                    token: string;
                    user_id: string;
                }[];
            };
            notify_result_targets: {
                Args: never;
                Returns: {
                    away_score: number;
                    away_team: string;
                    home_score: number;
                    home_team: string;
                    locale: string;
                    match_id: string;
                    points_awarded: number;
                    token: string;
                    user_id: string;
                }[];
            };
            register_push_token: {
                Args: { p_platform: string; p_token: string };
                Returns: undefined;
            };
            unregister_push_token: { Args: { p_token: string }; Returns: undefined };
            username_available: { Args: { candidate: string }; Returns: boolean };
        };
        Enums: {
            league_role: 'owner' | 'member';
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
            league_role: ['owner', 'member'],
            match_status: ['scheduled', 'in_play', 'finished', 'postponed', 'cancelled'],
        },
    },
} as const;
