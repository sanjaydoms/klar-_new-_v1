/**
 * One definition of "HH:MM" → minutes since midnight.
 *
 * There were five identical copies of this across the filters and sorters, each
 * doing `time.split(':').map(Number)` with nothing checking the result. On a
 * missing or malformed value that yields `NaN`, and `NaN` compares false against
 * everything — so in the filters a flight with a bad time was silently dropped
 * from the results rather than reported, and no log said why.
 *
 * Returning `null` instead of `NaN` makes the unreadable case a value the caller
 * has to decide about, which is the whole point: "keep it" and "drop it" are
 * different answers in different places, and neither should happen by accident.
 */

/** Minutes since midnight, or null when `time` is not a readable "HH:MM". */
export function timeToMinutes(time: string): number | null {
    if (typeof time !== 'string') return null;

    const match = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.exec(time.trim());
    if (match === null) return null;

    return (Number(match[1]) * 60) + Number(match[2]);
}

/**
 * Order two times of day. Returns 0 when they are equal *or* when neither can be
 * read, so callers keep their own tie-break (usually the date).
 *
 * **Never returns NaN**, which is the point. `Array.prototype.sort` requires a
 * consistent comparator, and NaN is not a valid answer to "which of these comes
 * first" — the damage is not confined to the offending record. One unreadable
 * time made every comparison involving it indeterminate, so the sort could leave
 * the *whole* list in an arbitrary order while looking like it had worked.
 *
 * An unreadable time sorts after a readable one. Callers that invert the result
 * for a descending sort will therefore surface those records first; that is
 * accepted here rather than threading sort direction through every comparator,
 * because a record with no usable time is a normalizer defect to be fixed at the
 * source, not ordered around.
 */
export function compareTimes(timeA: string, timeB: string): number {
    return compareParsed(timeToMinutes(timeA), timeToMinutes(timeB));
}

const MONTHS: Readonly<Record<string, number>> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Epoch milliseconds for a "DD-MMM-YY" date, or null when it is not one.
 *
 * The normalizer builds this format with `toLocaleDateString`, so "20-Sep-26"
 * is what real data looks like. The previous parser indexed a month map with
 * the raw substring and passed the result straight to `new Date`, so anything
 * it did not recognise — a different case like "SEP", a missing part, an empty
 * string — produced `undefined` as the month, an Invalid Date, and NaN out of
 * `getTime()`. Month names are matched case-insensitively here, and everything
 * that is still not a date is refused rather than turned into NaN.
 */
export function dateToEpoch(date: string): number | null {
    if (typeof date !== 'string') return null;

    const parts = date.trim().split('-');
    if (parts.length !== 3) return null;

    const day = Number(parts[0]);
    const month = MONTHS[parts[1].toLowerCase()];
    const year = Number(parts[2]);

    if (!Number.isInteger(day) || day < 1 || day > 31) return null;
    if (month === undefined) return null;
    if (!Number.isInteger(year) || year < 0 || year > 99) return null;

    const parsed = new Date(2000 + year, month, day);
    // Rejects a day the month does not have — 31-Feb-26 rolls over otherwise.
    if (parsed.getMonth() !== month || parsed.getDate() !== day) return null;

    return parsed.getTime();
}

/** Order two "DD-MMM-YY" dates. Never NaN; an unreadable date sorts last. */
export function compareDates(dateA: string, dateB: string): number {
    return compareParsed(dateToEpoch(dateA), dateToEpoch(dateB));
}

/**
 * Total minutes for a "2h 30m" duration, or null when it is not one.
 *
 * The old parser returned 0 for anything it could not read, which is a real
 * duration — `formatDuration` emits "0h 0m" — so "we do not know" and "this
 * flight takes no time" were the same value. A flight with a broken duration
 * therefore sorted to the top of "shortest first" and pulled the duration
 * facet's minimum down to zero. It also called `.match` on its argument
 * unguarded, so a missing duration threw a TypeError rather than degrading.
 */
export function durationToMinutes(duration: string): number | null {
    if (typeof duration !== 'string') return null;

    const match = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/.exec(duration.trim());
    if (match === null) return null;
    // Both groups absent means the string was empty, not "0h 0m".
    if (match[1] === undefined && match[2] === undefined) return null;

    return (Number(match[1] ?? 0) * 60) + Number(match[2] ?? 0);
}

/** Order two durations. Never NaN; an unreadable duration sorts last. */
export function compareDurations(durationA: string, durationB: string): number {
    return compareParsed(durationToMinutes(durationA), durationToMinutes(durationB));
}

/**
 * The one ordering rule the four comparators above share: a value we could not
 * read is not smaller or larger, it is unknown — so it goes last rather than
 * being compared as NaN. Two unknowns are equal to each other.
 */
function compareParsed(a: number | null, b: number | null): number {
    if (a === null || b === null) {
        if (a === b) return 0;
        return a === null ? 1 : -1;
    }
    return a - b;
}
