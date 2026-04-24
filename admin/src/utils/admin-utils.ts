/**
 * 🛠 Enterprise Product Management Utilities
 */

/**
 * Rounds a number up to the nearest 1,000 VND
 * Example: 99123 -> 100000, 99000 -> 99000
 */
export const roundTo1000 = (amount: number | string): number => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.ceil(num / 1000) * 1000;
};

/**
 * Calculates discount percentage
 */
export const calculateDiscount = (price: number, original: number): number => {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
};

/**
 * Generates a standard SKU format: NAME-OPT1-OPT2
 */
export const generateSKU = (productName: string, options: Record<string, string>): string => {
  const slugify = (text: string) => 
    text.toString().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toUpperCase();

  const namePart = slugify(productName).split('-').slice(0, 2).join('-');
  const optionPart = Object.values(options)
    .filter(Boolean)
    .map(v => slugify(v))
    .join('-');

  return `${namePart}${optionPart ? '-' + optionPart : ''}-${Math.random().toString(36).substring(7).toUpperCase()}`;
};

/**
 * Normalizes Option keys for consistent grouping
 */
export const normalizeOptionKey = (key: string): string => {
  return key.trim().toLowerCase();
};
