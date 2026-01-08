import { format, formatDistance, isAfter, parseISO } from 'date-fns';
import { toWords } from 'number-to-words';

// -------------------- Currency Formatting --------------------

const CURRENCY_LOCALE_MAP: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'en-IE',
    'GBP': 'en-GB',
    'NGN': 'en-NG',
    'KES': 'en-KE',
    'GHS': 'en-GH',
    'ZAR': 'en-ZA',
    'UGX': 'en-UG',
    'TZS': 'en-TZ',
    'RWF': 'en-RW',
    'EGP': 'en-EG',
    'INR': 'en-IN',
    'AED': 'en-AE',
    'AUD': 'en-AU',
    'CAD': 'en-CA',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'BRL': 'pt-BR',
};

export const formatCurrency = (
    amount: number,
    currency: string = 'USD',
    locale: string = 'en-US'
): string => {
    // Use specific locale for the currency if available to ensure correct symbol rendering
    // explicit locale argument overrides the map
    const targetLocale = locale === 'en-US' && CURRENCY_LOCALE_MAP[currency]
        ? CURRENCY_LOCALE_MAP[currency]
        : locale;

    return new Intl.NumberFormat(targetLocale, {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatNumber = (
    value: number,
    decimals: number = 2,
    locale: string = 'en-US'
): string => {
    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

// -------------------- Date Formatting --------------------

export const formatDate = (dateString: string, formatStr: string = 'MMM d, yyyy'): string => {
    try {
        const date = parseISO(dateString);
        return format(date, formatStr);
    } catch {
        return dateString;
    }
};

export const formatDateTime = (dateString: string): string => {
    return formatDate(dateString, 'MMM d, yyyy HH:mm');
};

export const formatShortDate = (dateString: string): string => {
    return formatDate(dateString, 'MM/dd/yyyy');
};

export const formatRelativeDate = (dateString: string): string => {
    try {
        const date = parseISO(dateString);
        return formatDistance(date, new Date(), { addSuffix: true });
    } catch {
        return dateString;
    }
};

export const isOverdue = (dueDateString?: string): boolean => {
    if (!dueDateString) return false;
    try {
        const dueDate = parseISO(dueDateString);
        return isAfter(new Date(), dueDate);
    } catch {
        return false;
    }
};

// -------------------- String Formatting --------------------

export const truncate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
};

export const capitalize = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export const slugify = (str: string): string => {
    return str
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

// -------------------- Phone Formatting --------------------

export const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
};

// -------------------- File Size Formatting --------------------

export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// -------------------- Amount In Words --------------------

export const formatAmountInWords = (amount: number, currency: string = 'NGN'): string => {
    if (amount <= 0) return '';
    try {
        // toWords produces lowercase "twenty-one", let's capitalize it
        // Remove dashes if preferred, or keep them. keeping consistent with previous logic.
        const words = toWords(amount).replace(/[^a-zA-Z\s-]/g, ' ').replace(/-/g, ' ');

        const formatted = words.charAt(0).toUpperCase() + words.slice(1);

        // Map currency code to plural name
        const currencyNames: Record<string, string> = {
            'NGN': 'Naira',
            'USD': 'Dollars',
            'EUR': 'Euros',
            'GBP': 'Pounds',
            'CAD': 'Dollars',
            'AUD': 'Dollars',
            'KES': 'Shillings',
            'GHS': 'Cedis',
            'ZAR': 'Rand',
            'UGX': 'Shillings',
            'TZS': 'Shillings',
            'RWF': 'Francs',
            'EGP': 'Pounds',
            'INR': 'Rupees',
            'AED': 'Dirhams',
            'JPY': 'Yen',
            'CNY': 'Yuan',
            'BRL': 'Reais',
        };
        const currencyName = currencyNames[currency] || currency;

        return `${formatted} ${currencyName} only`;
    } catch (e) {
        return '';
    }
};
