export function resolveLocale(header: unknown): 'fa' | 'en';
export function hasMessage(code: unknown): code is string;
export function translate(code: string, locale?: 'fa' | 'en', parameters?: Record<string, string | number>): string;
