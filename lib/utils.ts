import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge class names
 * Combines clsx and tailwind-merge for conditional className handling
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
