import { type ClassValue, clsx } from "clsx";
import { bgGradient } from "./utils"; // Placeholder self-reference helper if needed
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
