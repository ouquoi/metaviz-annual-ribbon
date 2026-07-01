import { useState } from "react";
import { type CustomVisualizationProps } from "@metabase/custom-viz";
import type { Settings } from "./types";
import {
  isNumericCol, isDateCol, lerpColor, parseDate,
  detectGranularity, dateToPeriodKey, generatePeriods, formatPeriodLabel,
  type Granularity,
} from "./utils";

const LABEL_H = 18;
const LABEL_GAP = 4;
const MARGIN_X = 6;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Col = Record<string, any>;

export function AnnualRibbon({
  series, settings, width, height, colorScheme, onClick,
}: CustomVisualizationProps<Settings>) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const isDark = colorScheme === "dark";
  const bgColor = isDark ? "#1c1c1c" : "#ffffff";
  const emptyColor = isDark ? "#2d333b" : "#ebedf0";
  const labelColor = isDark ? "#8b949e" : "#586069";
  const sepColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";
  const colorLow = settings?.colorLow ?? "#ebedf0";
  const colorHigh = settings?.colorHigh ?? "#509EE3";
  const bandH = Math.max(8, settings?.bandHeight ?? 40);

  const cw = (width ?? 0) > 0 ? Math.floor(width ?? 0) : 0;
  const ch = (height ?? 0) > 0 ? Math.floor(height ?? 0) : 0;
  if (!cw || !ch) return null;

  const data = series?.[0]?.data;
  if (!data) return null;

  const cols = data.cols as Col[];
  const dateColName = settings?.dateColumn ?? "";
  const valueColName = settings?.valueColumn ?? "";
  const dateIdx = dateColName
    ? cols.findIndex(c => c.name === dateColName)
    : cols.findIndex(c => isDateCol(c));
  const valueIdx = valueColName
    ? cols.findIndex(c => c.name === valueColName)
    : cols.findIndex(c => isNumericCol(c));

  if (dateIdx === -1 || valueIdx === -1) return null;

  // Parse dates to detect granularity
  const rawDates: Date[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data.rows as any[][]) {
    const d = parseDate(row[dateIdx]);
    if (d) rawDates.push(d);
  }
  if (rawDates.length === 0) return null;

  const granularity: Granularity = detectGranularity(rawDates);

  // Build value map keyed by period
  const valueMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data.rows as any[][]) {
    const d = parseDate(row[dateIdx]);
    if (!d) continue;
    const raw = row[valueIdx];
    if (raw == null) continue;
    const v = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (!isNaN(v) && v >= 0) valueMap.set(dateToPeriodKey(d, granularity), v);
  }

  // Generate all periods spanning min→max date
  const sortedDates = [...rawDates].sort((a, b) => a.getTime() - b.getTime());
  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];
  const periods = generatePeriods(granularity, minDate, maxDate);
  const nPeriods = periods.length;

  const maxVal = valueMap.size > 0 ? Math.max(...valueMap.values()) : 1;
  const animStep = nPeriods > 0 ? Math.max(0, Math.floor(1500 / nPeriods)) : 2;

  // Layout — center vertically
  const totalBlockH = LABEL_H + LABEL_GAP + bandH;
  const startY = Math.max(LABEL_H + LABEL_GAP, Math.round((ch - totalBlockH) / 2));
  const labelBaselineY = startY - LABEL_GAP - 2;
  const bandY = startY;
  const cellW = (cw - 2 * MARGIN_X) / nPeriods;

  const hoveredValue = hoveredKey != null ? valueMap.get(hoveredKey) : undefined;

  return (
    <div style={{ width: cw, height: ch, backgroundColor: bgColor, position: "relative", overflow: "hidden" }}>
      {/* Tooltip */}
      {hoveredKey != null && (
        <div style={{
          position: "absolute",
          top: Math.max(4, bandY - 36),
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: isDark ? "#2a2a2a" : "#ffffff",
          border: `1.5px solid ${lerpColor(colorLow, colorHigh, hoveredValue != null && maxVal > 0 ? hoveredValue / maxVal : 0)}`,
          borderRadius: 5,
          padding: "3px 10px",
          fontSize: 12,
          color: isDark ? "#cccccc" : "#696e7b",
          pointerEvents: "none",
          zIndex: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          whiteSpace: "nowrap",
        }}>
          <span style={{ fontWeight: 700 }}>{formatPeriodLabel(hoveredKey, granularity)}</span>
          {hoveredValue != null ? ` · ${hoveredValue.toLocaleString()}` : " · —"}
        </div>
      )}

      <svg width={cw} height={ch} style={{ display: "block" }} onMouseLeave={() => setHoveredKey(null)}>
        {/* Separator labels and lines */}
        {periods.map((p, i) => {
          if (!p.separatorLabel) return null;
          const x = MARGIN_X + i * cellW;
          return (
            <g key={`sep-${p.key}`}>
              <text x={x} y={labelBaselineY} fontSize={10} fill={labelColor} fontFamily="sans-serif">
                {p.separatorLabel}
              </text>
              {i > 0 && (
                <line x1={x} y1={bandY} x2={x} y2={bandY + bandH} stroke={sepColor} strokeWidth={1} />
              )}
            </g>
          );
        })}

        {/* Period cells */}
        {periods.map((p, i) => {
          const val = valueMap.get(p.key);
          const t = val != null && maxVal > 0 ? val / maxVal : -1;
          const fill = t >= 0 ? lerpColor(colorLow, colorHigh, t) : emptyColor;
          const x = MARGIN_X + i * cellW;
          const dim = hoveredKey !== null && hoveredKey !== p.key;

          return (
            <g
              key={p.key}
              style={{
                opacity: dim ? 0.25 : 1,
                transition: "opacity 0.1s",
                cursor: val != null ? "pointer" : "default",
              }}
              onMouseEnter={() => setHoveredKey(p.key)}
              onClick={() => {
                if (val != null && onClick) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (onClick as any)({ dimensions: [{ value: p.date, column: cols[dateIdx] }] });
                }
              }}
            >
              <rect x={x} y={bandY} width={cellW + 0.5} height={bandH} fill={fill} opacity={0}>
                <animate
                  attributeName="opacity"
                  from="0" to="1"
                  dur="0.4s"
                  begin={`${i * animStep}ms`}
                  fill="freeze"
                />
              </rect>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
