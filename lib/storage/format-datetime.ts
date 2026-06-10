/** Safe Intl format — weekday cannot be combined with dateStyle/timeStyle. */
export function formatDateTimePreview(value: string, locale = "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
