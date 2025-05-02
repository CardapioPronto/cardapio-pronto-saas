import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to format dates
export function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('pt-BR');
  } catch (error) {
    return dateString;
  }
}
