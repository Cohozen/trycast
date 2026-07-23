import { useSession } from '@/features/auth/session-context';
import { ProfileView } from '@/features/profile/components/profile-view';

/**
 * Écran Profil (maquette Profil) : mon propre profil, avec l'accès aux
 * réglages et l'onglet Ligues. Le corps est partagé avec le profil public
 * d'un autre joueur (`player/[id]`).
 */
export default function ProfileScreen() {
    const { session } = useSession();
    return <ProfileView isSelf userId={session?.user.id ?? ''} />;
}
