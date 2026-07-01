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

export type Granularity = "hour" | "day" | "month" | "quarter" | "year";

export interface Period {
  key: string;
  date: Date;
  separatorLabel?: string;
}

export function detectGranularity(dates: Date[]): Granularity {
  if (dates.length < 2) return "day";
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  let minDiff = Infinity;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i].getTime() - sorted[i - 1].getTime();
    if (d > 0 && d < minDiff) minDiff = d;
  }
  if (minDiff === Infinity) return "day";
  const H = 3_600_000;
  const D = 86_400_000;
  if (minDiff <= 2 * H) return "hour";
  if (minDiff <= 2 * D) return "day";
  if (minDiff <= 50 * D) return "month";
  if (minDiff <= 150 * D) return "quarter";
  return "year";
}

export function dateToPeriodKey(d: Date, g: Granularity): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  if (g === "hour") return `${y}-${m}-${day} ${h}`;
  if (g === "day") return `${y}-${m}-${day}`;
  if (g === "month") return `${y}-${m}`;
  if (g === "quarter") return `${y}-Q${Math.ceil((d.getMonth() + 1) / 3)}`;
  return `${y}`;
}

const MONTHS_SHORT_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatPeriodLabel(key: string, g: Granularity): string {
  if (g === "hour") {
    const [datePart, h] = key.split(" ");
    const [y, m, d] = datePart.split("-");
    return `${y}-${m}-${d} ${h}:00`;
  }
  if (g === "day") return key;
  if (g === "month") {
    const [y, m] = key.split("-");
    return `${MONTHS_SHORT_EN[parseInt(m) - 1]} ${y}`;
  }
  if (g === "quarter") return key.replace("-", " ");
  return key;
}

export function generatePeriods(g: Granularity, minDate: Date, maxDate: Date): Period[] {
  const periods: Period[] = [];

  if (g === "hour") {
    const start = new Date(minDate);
    start.setMinutes(0, 0, 0);
    const end = new Date(maxDate);
    end.setMinutes(59, 59, 999);
    let cur = new Date(start);
    while (cur <= end) {
      periods.push({
        key: dateToPeriodKey(cur, "hour"),
        date: new Date(cur),
        separatorLabel: cur.getHours() === 0
          ? `${MONTHS_SHORT_EN[cur.getMonth()]} ${cur.getDate()}`
          : undefined,
      });
      cur = new Date(cur.getTime() + 3_600_000);
    }
    return periods;
  }

  if (g === "day") {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    const multiYear = maxYear > minYear;
    for (let y = minYear; y <= maxYear; y++) {
      for (const d of getAllDaysOfYear(y)) {
        let label: string | undefined;
        if (d.getDate() === 1) {
          label = multiYear && d.getMonth() === 0
            ? `${d.getFullYear()}`
            : MONTHS_SHORT_EN[d.getMonth()];
        }
        periods.push({ key: dateToPeriodKey(d, "day"), date: new Date(d), separatorLabel: label });
      }
    }
    return periods;
  }

  if (g === "month") {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    for (let y = minYear; y <= maxYear; y++) {
      for (let mo = 0; mo < 12; mo++) {
        const d = new Date(y, mo, 1);
        periods.push({
          key: dateToPeriodKey(d, "month"),
          date: d,
          separatorLabel: mo === 0 ? `${y}` : undefined,
        });
      }
    }
    return periods;
  }

  if (g === "quarter") {
    const minYear = minDate.getFullYear();
    const maxYear = maxDate.getFullYear();
    for (let y = minYear; y <= maxYear; y++) {
      for (let q = 1; q <= 4; q++) {
        const d = new Date(y, (q - 1) * 3, 1);
        periods.push({
          key: `${y}-Q${q}`,
          date: d,
          separatorLabel: q === 1 ? `${y}` : undefined,
        });
      }
    }
    return periods;
  }

  // year
  const minYear = minDate.getFullYear();
  const maxYear = maxDate.getFullYear();
  const nYears = maxYear - minYear + 1;
  const step = nYears <= 10 ? 1 : nYears <= 30 ? 5 : 10;
  for (let y = minYear; y <= maxYear; y++) {
    periods.push({
      key: `${y}`,
      date: new Date(y, 0, 1),
      separatorLabel: (y - minYear) % step === 0 ? `${y}` : undefined,
    });
  }
  return periods;
}
