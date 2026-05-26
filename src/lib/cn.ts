/**
 * Tailwind class merger — clsx for conditionals + tailwind-merge to
 * resolve conflicts (e.g. "px-2 px-4" → "px-4"). The canonical helper
 * for every Tailwind-utility component in the HUD.
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
