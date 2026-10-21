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
  let candidate = utcGuess;

  // Re-evaluate the zone offset after each adjustment so midnight remains
  // correct when the local offset changes at a daylight-saving boundary.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = partsMap(new Date(candidate), zonedFormatter);
    const representedAsUtc = Date.UTC(
      Number(local.year),
      Number(local.month) - 1,
      Number(local.day),
      Number(local.hour),
      Number(local.minute),
      Number(local.second),
    );
    const nextCandidate = utcGuess - (representedAsUtc - candidate);
    if (nextCandidate === candidate) return candidate;
    candidate = nextCandidate;
  }

  const finalLocal = partsMap(new Date(candidate), zonedFormatter);
  if (dateKeyFromParts(finalLocal) !== dateKey) {
    throw new Error("INVALID_ARGUMENT: Could not resolve business-local day");
  }
  return candidate;
}

export function businessDayBounds(dateKey: string, timeZone: string) {
  const startAt = zonedMidnight(dateKey, timeZone);
  const endAt = zonedMidnight(shiftDateKey(dateKey, 1), timeZone);
  return { startAt, endAt, dateKey, timeZone };
}
