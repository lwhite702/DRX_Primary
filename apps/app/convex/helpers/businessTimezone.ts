const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

function formatter(timeZone: string, includeTime = false) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(includeTime
        ? { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" as const }
        : {}),
    });
  } catch {
    throw new Error("INVALID_ARGUMENT: Business timezone is invalid");
  }
}

function partsMap(date: Date, format: Intl.DateTimeFormat) {
  return Object.fromEntries(
    format.formatToParts(date).map(({ type, value }) => [type, value]),
  );
}

function dateKeyFromParts(parts: Record<string, string>) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validateDateKey(dateKey: string) {
  if (!dateKeyPattern.test(dateKey)) {
    throw new Error("INVALID_ARGUMENT: Date must use YYYY-MM-DD format");
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== dateKey) {
    throw new Error("INVALID_ARGUMENT: Date is not a calendar day");
  }
}

export function businessDateKey(at: Date, timeZone: string) {
  return dateKeyFromParts(partsMap(at, formatter(timeZone)));
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function isValidDateKey(dateKey: string): boolean {
  try {
    validateDateKey(dateKey);
    return true;
  } catch {
    return false;
  }
}

export function shiftDateKey(dateKey: string, days: number) {
  validateDateKey(dateKey);
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function zonedMidnight(dateKey: string, timeZone: string) {
  validateDateKey(dateKey);
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcGuess = Date.UTC(year, month - 1, day);
  const zonedFormatter = formatter(timeZone, true);
  // Find the first instant whose local date is this key. This also resolves
  // zones that advance clocks at midnight: their day starts at the first
  // valid instant (for example, 01:00 local), not at a nonexistent 00:00.
  let low = utcGuess - 36 * 60 * 60 * 1_000;
  let high = utcGuess + 36 * 60 * 60 * 1_000;
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dateKeyFromParts(partsMap(new Date(middle), zonedFormatter)) >= dateKey) {
      high = middle;
    } else {
      low = middle;
    }
  }
  if (dateKeyFromParts(partsMap(new Date(high), zonedFormatter)) !== dateKey) {
    throw new Error("INVALID_ARGUMENT: Could not resolve business-local day");
  }
  return high;
}

export function businessDayBounds(dateKey: string, timeZone: string) {
  const startAt = zonedMidnight(dateKey, timeZone);
  const endAt = zonedMidnight(shiftDateKey(dateKey, 1), timeZone);
  return { startAt, endAt, dateKey, timeZone };
}
