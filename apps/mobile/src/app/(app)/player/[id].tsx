import { useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/features/profile/components/profile-view';

/**
 * Profil public d'un joueur, ouvert depuis un classement ou une liste de
 * pronos. Même corps que mon profil, sans les réglages ni l'onglet Ligues
 * (« mes » ligues n'ont pas de sens ici) : `isSelf` reste false même si l'id
 * est le mien — les écrans n'exposent de toute façon pas ma propre ligne.
 */
export default function PlayerScreen() {
    // tab : ouverture depuis la liste des pronos d'un match, sur l'onglet Pronos
    const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
    return (
        <ProfileView
            initialTab={tab === 'predictions' ? 'predictions' : undefined}
            isSelf={false}
            userId={id}
        />
    );
}
