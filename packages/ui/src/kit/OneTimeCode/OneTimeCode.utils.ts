/** Normalize SMS autofill/paste consistently for Persian, Arabic and Latin digits. */
export function normalizeOneTimeCode(raw: string, length: number) {
  return raw
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "")
    .slice(0, length);
}
