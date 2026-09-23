/**
 * Utility functions for Philippine Peso (PHP / ₱) currency formatting
 * Standardized for CASCOFAMCO Cooperative Management Information System
 */

export const phpFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number or numeric string to full PHP currency representation, e.g. "₱1,250.00"
 */
export const formatPHP = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '₱0.00';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '₱0.00';
  return phpFormatter.format(num);
};

/**
 * Formats a number with commas and 2 decimals without the symbol, e.g. "1,250.00"
 */
export const formatNumberAmount = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Helper to display formatted currency with customizable space, e.g. "₱ 1,250.00"
 */
export const formatCurrency = (value: number | string | null | undefined, showSpace = true): string => {
  if (value === null || value === undefined || value === '') return showSpace ? '₱ 0.00' : '₱0.00';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num)) return showSpace ? '₱ 0.00' : '₱0.00';
  const formatted = num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return showSpace ? `₱ ${formatted}` : `₱${formatted}`;
};
