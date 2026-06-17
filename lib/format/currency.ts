/** Parse display IDR like "10.000" or "10000" to integer rupiah */
export function parseIdrInput(value: string): number | null {
  const cleaned = value.replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

/** Format integer IDR for display inputs (Indonesian grouping) */
export function formatIdrInput(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIdrDisplay(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse percent like "1,25" or "1.25" */
export function parsePercentInput(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 100;
}

export function formatPercentInput(value: number): string {
  return String(value).replace(".", ",");
}
