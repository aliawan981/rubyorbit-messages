/** Normalizes user-typed or provider phone numbers to E.164. Returns null if it cannot. */
export function normalizePhone(input: string, defaultCountryCode = "1"): string | null {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (!hasPlus) {
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0"))
      digits = `${defaultCountryCode}${digits.slice(1)}`; // national format
    else if (!(digits.startsWith(defaultCountryCode) && digits.length > 10)) {
      digits = `${defaultCountryCode}${digits}`;
    }
  }
  const e164 = `+${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null;
}
