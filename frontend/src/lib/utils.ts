import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Indian currency with Lakhs and Crores or standard commas
 */
export function formatINR(amount: number, compact: boolean = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  if (compact) {
    if (absAmount >= 10000000) {
      const cr = (absAmount / 10000000).toFixed(2);
      return `${isNegative ? '-' : ''}₹${cr.replace(/\.00$/, '')} Cr`;
    }
    if (absAmount >= 100000) {
      const lk = (absAmount / 100000).toFixed(2);
      return `${isNegative ? '-' : ''}₹${lk.replace(/\.00$/, '')} Lakh`;
    }
  }

  // Standard Indian comma format
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format date nicely for human readability
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}
