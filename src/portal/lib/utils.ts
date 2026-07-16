import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names with conflict resolution (shadcn utility).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
