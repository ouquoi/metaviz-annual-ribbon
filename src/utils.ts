export function isNumericCol(col: { base_type?: string; effective_type?: string }): boolean {
  const t = (col.base_type ?? col.effective_type ?? "").toLowerCase();
  return /integer|float|decimal|number|percent|currency|biginteger/.test(t);
}

export function isDateCol(col: { base_type?: string; effective_type?: string }): boolean {
  const t = (col.base_type ?? col.effective_type ?? "").toLowerCase();
  return t.includes("date") || t.includes("time");
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDate(v: unknown): Date | null {
  if (v == null || v === "") return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

export function getAllDaysOfYear(year: number): Date[] {
  const days: Date[] = [];
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, m, d));
    }
  }
  return days;
}
