import { useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/features/profile/components/profile-view';

/**
 * Profil public d'un joueur, ouvert depuis un classement ou une liste de
 * pronos. Même corps que mon profil, sans les réglages ni l'onglet Ligues
 * (« mes » ligues n'ont pas de sens ici) : `isSelf` reste false même si l'id
 * est le mien — les écrans n'exposent de toute façon pas ma propre ligne.
 */
export default function PlayerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    return <ProfileView isSelf={false} userId={id} />;
}
