export const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";

  // 11 digits starting with country code 1
  if (digits.startsWith("1") && digits.length > 1) {
    const withoutCountry = digits.slice(1);
    if (withoutCountry.length < 4) {
      return `+1 (${withoutCountry}`;
    }
    if (withoutCountry.length < 7) {
      return `+1 (${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3)}`;
    }
    return `+1 (${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(
      3,
      6,
    )}-${withoutCountry.slice(6, 10)}`;
  }

  // Standard 10-digit US number
  if (digits.length < 4) return digits;
  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};
