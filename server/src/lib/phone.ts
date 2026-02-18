function normalizeIndianMobile(phone: string) {
  const raw = phone.replace(/\s+/g, "").replace(/-/g, "");
  const digits = raw.replace(/^\+/, "");

  // Accept: 10-digit, 91xxxxxxxxxx, +91xxxxxxxxxx
  if (/^\d{10}$/.test(digits)) return { e164: `+91${digits}`, national: digits };
  if (/^91\d{10}$/.test(digits)) return { e164: `+${digits}`, national: digits.slice(2) };

  throw new Error("Invalid Indian mobile number");
}

export function normalizeIndianPhoneE164(phone: string) {
  return normalizeIndianMobile(phone).e164;
}
