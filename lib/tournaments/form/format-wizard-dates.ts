/** Format `datetime-local` value (YYYY-MM-DDTHH:mm) for display. */
export function formatWizardDateTime(localValue: string): string | null {
  if (!localValue.trim()) return null;
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) return localValue;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatWizardDateRange(starts: string, ends: string): string {
  const start = formatWizardDateTime(starts);
  const end = formatWizardDateTime(ends);
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return "Not scheduled";
}
