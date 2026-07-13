import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

const BUCKET = 'avatars';
/** Chemin stable par utilisateur (upsert) — cf. policies storage `<userId>/`. */
const avatarPath = (userId: string) => `${userId}/avatar.jpg`;

/** Erreur interne « accès photothèque refusé », mappée en clé i18n. */
const PERMISSION_DENIED = 'permission_denied';

export type AvatarMessageKey =
    | 'profile:settings.avatar.errors.permission'
    | 'common:errors.generic';

/** Traduit une erreur d'action avatar en clé i18n (à passer à t() côté écran). */
export function toAvatarMessageKey(error: unknown): AvatarMessageKey {
    if (error instanceof Error && error.message === PERMISSION_DENIED) {
        return 'profile:settings.avatar.errors.permission';
    }
    return 'common:errors.generic';
}

/**
 * Choix + compression + upload de la photo de profil. Tout est client :
 * sélection (expo-image-picker), redimensionnement 512 px JPEG
 * (expo-image-manipulator), upload dans `avatars/<userId>/avatar.jpg` (upsert),
 * puis écriture de l'URL publique dans `profiles.avatar_url` avec un
 * cache-buster ?v=<ts> (le chemin est stable → sinon l'ancienne image reste
 * en cache). Retourne false si l'utilisateur annule le picker (pas d'erreur).
 */
export function useUpdateAvatar(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (): Promise<boolean> => {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                throw new Error(PERMISSION_DENIED);
            }

            const picked = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (picked.canceled || !picked.assets[0]) {
                return false;
            }

            const context = ImageManipulator.manipulate(picked.assets[0].uri);
            context.resize({ width: 512 });
            const rendered = await context.renderAsync();
            const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

            const bytes = await fetch(image.uri).then((res) => res.arrayBuffer());
            const path = avatarPath(userId);
            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
            if (uploadError) {
                throw uploadError;
            }

            const { publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path).data;
            const avatarUrl = `${publicUrl}?v=${Date.now()}`;
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: avatarUrl })
                .eq('id', userId);
            if (error) {
                throw error;
            }
            return true;
        },
        onSuccess: (updated) => {
            if (!updated) {
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}

/** Supprime la photo de profil : retire l'objet Storage puis remet avatar_url à null. */
export function useRemoveAvatar(userId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const { error: removeError } = await supabase.storage
                .from(BUCKET)
                .remove([avatarPath(userId)]);
            if (removeError) {
                throw removeError;
            }
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId);
            if (error) {
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}
