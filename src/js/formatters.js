/**
 * formatters.js — Pure date-formatting helpers for display purposes.
 *
 * All functions accept a Date object and return a formatted string.
 * No DOM or localStorage dependencies; fully unit-testable.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Returns the English ordinal suffix for a given day-of-month integer.
 *
 * @param {number} day  1–31
 * @returns {'st'|'nd'|'rd'|'th'}
 */
function ordinalSuffix(day) {
  // 11, 12, 13 are always "th" regardless of the tens digit
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Format a Date as "dd/MM/yyyy".
 *
 * @param {Date} date
 * @returns {string}  e.g. "05/03/2024"
 */
export function formatOccurrenceDate(date) {
  const dd   = String(date.getDate()).padStart(2, '0');
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format a Date's time as "HH:mm" in 24-hour mode.
 *
 * @param {Date} date
 * @returns {string}  e.g. "14:30", "00:00", "08:05"
 */
export function formatOccurrenceTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${min}`;
}

/**
 * Format a Date as a natural-language "tell" string.
 * Pattern: "The {N}{suffix} of {Month} at {HH:mm}"
 *
 * @param {Date} date
 * @returns {string}  e.g. "The 1st of January at 11:55"
 */
export function formatOccurrenceTell(date) {
  const day    = date.getDate();
  const suffix = ordinalSuffix(day);
  const month  = MONTH_NAMES[date.getMonth()];
  const time   = formatOccurrenceTime(date);
  return `The ${day}${suffix} of ${month} at ${time}`;
}
