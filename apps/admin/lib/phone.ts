export function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const base = digit >= "۰" ? "۰" : "٠";
    return String(digit.charCodeAt(0) - base.charCodeAt(0));
  });
}

export function normalizeIranianMobile(value: string) {
  const digits = normalizeDigits(value.trim());
  const match = /^(?:0|\+?98)?(9[0-9]{9})$/.exec(digits);
  return match ? `+98${match[1]}` : null;
}
