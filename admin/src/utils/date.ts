import { format, isValid } from 'date-fns';

/**
 * Safely formats a date. Returns a fallback string if the date is invalid.
 * @param date The date to format (Date object, string, or number)
 * @param formatStr The date-fns format string
 * @param fallback The string to return if formatting fails
 */
export function safeFormat(
  date: Date | string | number | null | undefined,
  formatStr: string = 'dd/MM/yyyy',
  fallback: string = 'Chưa cập nhật'
): string {
  if (!date) return fallback;
  
  const d = new Date(date);
  
  if (!isValid(d)) {
    return fallback;
  }
  
  try {
    return format(d, formatStr);
  } catch (error) {
    console.warn('[DateUtils] Safe formatting failed for:', date);
    return fallback;
  }
}
