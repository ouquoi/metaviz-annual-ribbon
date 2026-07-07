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

export type Granularity = "hour" | "day" | "week" | "month" | "quarter" | "year";

function isoWeekNumber(d: Date): number {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
}

function isoWeekYear(d: Date): number {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  return utc.getUTCFullYear();
}

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
  if (minDiff <= 10 * D) return "week";
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
  if (g === "week") return `${isoWeekYear(d)}-W${String(isoWeekNumber(d)).padStart(2, "0")}`;
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
  if (g === "week") {
    const [y, w] = key.split("-W");
    return `W${w} ${y}`;
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
    const multiYear = maxDate.getFullYear() > minDate.getFullYear();
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
    let cur = new Date(start);
    while (cur <= end) {
      let label: string | undefined;
      if (cur.getDate() === 1) {
        label = multiYear && cur.getMonth() === 0
          ? `${cur.getFullYear()}`
          : MONTHS_SHORT_EN[cur.getMonth()];
      }
      periods.push({ key: dateToPeriodKey(cur, "day"), date: new Date(cur), separatorLabel: label });
      cur.setDate(cur.getDate() + 1);
    }
    return periods;
  }

  if (g === "week") {
    const start = new Date(minDate);
    const dayOfWeek = start.getDay() || 7;
    start.setDate(start.getDate() - (dayOfWeek - 1));
    start.setHours(0, 0, 0, 0);
    const multiYear = maxDate.getFullYear() > minDate.getFullYear();
    let cur = new Date(start);
    let lastMonth = -1;
    let lastYear = -1;
    while (cur <= maxDate) {
      const curMonth = cur.getMonth();
      const curYear = cur.getFullYear();
      let label: string | undefined;
      if (curYear !== lastYear) {
        label = multiYear ? `${curYear}` : MONTHS_SHORT_EN[curMonth];
        lastYear = curYear;
        lastMonth = curMonth;
      } else if (curMonth !== lastMonth) {
        label = MONTHS_SHORT_EN[curMonth];
        lastMonth = curMonth;
      }
      periods.push({ key: dateToPeriodKey(cur, "week"), date: new Date(cur), separatorLabel: label });
      cur = new Date(cur.getTime() + 7 * 86_400_000);
    }
    return periods;
  }

  if (g === "month") {
    const start = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    let cur = new Date(start);
    while (cur <= end) {
      periods.push({
        key: dateToPeriodKey(cur, "month"),
        date: new Date(cur),
        separatorLabel: cur.getMonth() === 0 ? `${cur.getFullYear()}` : undefined,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return periods;
  }

  if (g === "quarter") {
    const startQ = Math.floor(minDate.getMonth() / 3);
    const endQ = Math.floor(maxDate.getMonth() / 3);
    let year = minDate.getFullYear();
    let q = startQ;
    while (year < maxDate.getFullYear() || (year === maxDate.getFullYear() && q <= endQ)) {
      const d = new Date(year, q * 3, 1);
      periods.push({
        key: `${year}-Q${q + 1}`,
        date: d,
        separatorLabel: q === 0 ? `${year}` : undefined,
      });
      q++;
      if (q > 3) { q = 0; year++; }
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
