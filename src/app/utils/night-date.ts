/**
 * The evening date of the night in progress, for pickers that say "Night of".
 *
 * Nights are named after the evening they start on, so at 01:00 the night
 * being observed is *yesterday's*. Before local noon this returns the previous
 * day; from noon onwards, today. Uses the browser's clock and timezone, which
 * is what the date pickers display in.
 */
export function currentNightDate(now: Date = new Date()): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (now.getHours() < 12) {
    date.setDate(date.getDate() - 1);
  }
  return date;
}
