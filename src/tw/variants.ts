import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Compose des className conditionnels en résolvant les conflits Tailwind
 * (le dernier gagne : cn('p-4', condition && 'p-2')). À utiliser dans toutes
 * les primitives à variants de src/components/ui/.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
