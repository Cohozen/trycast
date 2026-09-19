import type { Database } from '@/lib/database.types';

type ReactorRow = Database['public']['Functions']['get_prediction_reactors']['Returns'][number];

/**
 * Un auteur de réaction, tel que le renvoie `get_prediction_reactors`. Un
 * ancien membre de la ligue arrive anonymisé : `user_id`, `username` et
 * `avatar_url` à null, `is_member` à false. Le typegen déclare non-nullables
 * toutes les colonnes d'une RPC : la nullabilité réelle est rétablie ici.
 */
export type PredictionReactor = Omit<ReactorRow, 'user_id' | 'username' | 'avatar_url'> & {
    user_id: string | null;
    username: string | null;
    avatar_url: string | null;
};

/** Le prono dont on consulte les réactions (ouvre la sheet). */
export type ReactionsTarget = {
    userId: string;
    username: string;
};
