import { format, formatDistance, formatRelative, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { lo } from 'date-fns/locale/lo';
import i18n from '@/i18n/config';

// Map i18n language codes to date-fns locales
const localeMap: Record<string, Locale> = {
    en: enUS,
    lo: lo,
};

/**
 * Get the current date-fns locale based on i18n language
 */
function getCurrentLocale(): Locale {
    const currentLang = i18n.language || 'en';
    return localeMap[currentLang] || enUS;
}

/**
 * Format a date string or Date object
 * @param date - Date string (ISO format) or Date object
 * @param formatStr - Format string (default: 'PP' = localized date)
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, formatStr: string = 'PP'): string {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, formatStr, { locale: getCurrentLocale() });
    } catch (error) {
        console.error('Error formatting date:', error);
        return String(date);
    }
}

/**
 * Format a datetime string or Date object
 * @param datetime - Date string (ISO format) or Date object
 * @param formatStr - Format string (default: 'PPp' = localized date and time)
 * @returns Formatted datetime string
 */
export function formatDateTime(datetime: string | Date, formatStr: string = 'PPp'): string {
    try {
        const dateObj = typeof datetime === 'string' ? parseISO(datetime) : datetime;
        return format(dateObj, formatStr, { locale: getCurrentLocale() });
    } catch (error) {
        console.error('Error formatting datetime:', error);
        return String(datetime);
    }
}

/**
 * Format a date relative to now (e.g., "2 days ago", "in 3 hours")
 * @param date - Date string (ISO format) or Date object
 * @returns Relative date string
 */
export function formatRelativeDate(date: string | Date): string {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return formatDistance(dateObj, new Date(), {
            addSuffix: true,
            locale: getCurrentLocale(),
        });
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return String(date);
    }
}

/**
 * Format a date relative to a base date (e.g., "yesterday", "last Friday")
 * @param date - Date string (ISO format) or Date object
 * @param baseDate - Base date to compare against (default: now)
 * @returns Relative date string
 */
export function formatRelativeToDate(date: string | Date, baseDate: Date = new Date()): string {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return formatRelative(dateObj, baseDate, { locale: getCurrentLocale() });
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return String(date);
    }
}

/**
 * Format a short date (e.g., "12/31/2024" or "31/12/2024" depending on locale)
 * @param date - Date string (ISO format) or Date object
 * @returns Short date string
 */
export function formatShortDate(date: string | Date): string {
    return formatDate(date, 'P');
}

/**
 * Format a long date (e.g., "December 31, 2024")
 * @param date - Date string (ISO format) or Date object
 * @returns Long date string
 */
export function formatLongDate(date: string | Date): string {
    return formatDate(date, 'PPPP');
}

/**
 * Format time only (e.g., "2:30 PM")
 * @param datetime - Date string (ISO format) or Date object
 * @returns Time string
 */
export function formatTime(datetime: string | Date): string {
    try {
        const dateObj = typeof datetime === 'string' ? parseISO(datetime) : datetime;
        return format(dateObj, 'p', { locale: getCurrentLocale() });
    } catch (error) {
        console.error('Error formatting time:', error);
        return String(datetime);
    }
}

/**
 * Format month and year (e.g., "December 2024")
 * @param date - Date string (ISO format) or Date object
 * @returns Month and year string
 */
export function formatMonthYear(date: string | Date): string {
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return format(dateObj, 'LLLL yyyy', { locale: getCurrentLocale() });
    } catch (error) {
        console.error('Error formatting month/year:', error);
        return String(date);
    }
}

/**
 * Check if a date is valid
 * @param date - Date string or Date object
 * @returns True if valid date
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
    if (!date) return false;
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : date;
        return dateObj instanceof Date && !isNaN(dateObj.getTime());
    } catch {
        return false;
    }
}
