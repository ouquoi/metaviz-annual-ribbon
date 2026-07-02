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
const LEGEND_BAR_H = 10;
const LEGEND_GAP = 4;
const LEGEND_TEXT_H = 14;
const LEGEND_TITLE_H = 14;
const LEGEND_H_BASE = LEGEND_BAR_H + LEGEND_GAP + LEGEND_TEXT_H;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Col = Record<string, any>;

function normalize(v: number, max: number, mode: "linear" | "log"): number {
  if (max <= 0) return 0;
  if (mode === "log") return Math.log1p(v) / Math.log1p(max);
  return v / max;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return v.toLocaleString();
}

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
  const scaleMode = settings?.scaleMode ?? "linear";
  const showLegend = settings?.showLegend ?? true;
  const legendTitle = settings?.legendTitle ?? "";

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

  const rawDates: Date[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data.rows as any[][]) {
    const d = parseDate(row[dateIdx]);
    if (d) rawDates.push(d);
  }
  if (rawDates.length === 0) return null;

  const granularity: Granularity = detectGranularity(rawDates);

  const valueMap = new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rowMap = new Map<string, { rawDate: unknown; rawValue: unknown; row: unknown[] }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data.rows as any[][]) {
    const d = parseDate(row[dateIdx]);
    if (!d) continue;
    const raw = row[valueIdx];
    if (raw == null) continue;
    const v = typeof raw === "number" ? raw : parseFloat(String(raw));
    if (!isNaN(v) && v >= 0) {
      const key = dateToPeriodKey(d, granularity);
      valueMap.set(key, v);
      rowMap.set(key, { rawDate: row[dateIdx], rawValue: raw, row });
    }
  }

  const sortedDates = [...rawDates].sort((a, b) => a.getTime() - b.getTime());
  const periods = generatePeriods(granularity, sortedDates[0], sortedDates[sortedDates.length - 1]);
  const nPeriods = periods.length;

  const allValues = [...valueMap.values()];
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;

  const animStep = nPeriods > 0 ? Math.max(0, Math.floor(1500 / nPeriods)) : 2;

  // Reserve space for legend only if it fits
  const hasTitle = legendTitle.trim().length > 0;
  const LEGEND_H = LEGEND_H_BASE + (hasTitle ? LEGEND_TITLE_H + 2 : 0);
  const legendVisible = showLegend && ch >= LABEL_H + LABEL_GAP + bandH + LEGEND_H + 10;
  const usedLegendH = legendVisible ? LEGEND_H + 6 : 0;

  // Center band+labels block vertically in available height
  const totalBlockH = LABEL_H + LABEL_GAP + bandH;
  const availableH = ch - usedLegendH;
  const startY = Math.max(LABEL_H + LABEL_GAP, Math.round((availableH - totalBlockH) / 2));
  const labelBaselineY = startY - LABEL_GAP - 2;
  const bandY = startY;
  const cellW = (cw - 2 * MARGIN_X) / nPeriods;
  const legendY = ch - usedLegendH + 2;

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
          border: `1.5px solid ${lerpColor(colorLow, colorHigh, hoveredValue != null ? normalize(hoveredValue, maxVal, scaleMode) : 0)}`,
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
        <defs>
          <linearGradient id="ar-legend-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={colorLow} />
            <stop offset="100%" stopColor={colorHigh} />
          </linearGradient>
        </defs>

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
          const t = val != null ? normalize(val, maxVal, scaleMode) : -1;
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
              onClick={(e) => {
                if (val != null && onClick) {
                  const rd = rowMap.get(p.key);
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (onClick as any)({
                    value: rd?.rawDate ?? null,
                    column: cols[dateIdx],
                    data: [
                      { col: cols[dateIdx], value: rd?.rawDate ?? null },
                      { col: cols[valueIdx], value: rd?.rawValue ?? null },
                    ],
                    dimensions: [{ value: rd?.rawDate ?? null, column: cols[dateIdx] }],
                    event: e.nativeEvent,
                    origin: { row: rd?.row ?? [], cols },
                  });
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

        {/* Color legend */}
        {legendVisible && (() => {
          const legendW = Math.floor((cw - 2 * MARGIN_X) / 2);
          const legendX = Math.round((cw - legendW) / 2);
          const titleY = legendY + LEGEND_TITLE_H - 2;
          const barY = legendY + (hasTitle ? LEGEND_TITLE_H + 2 : 0);
          const valY = barY + LEGEND_BAR_H + LEGEND_GAP + LEGEND_TEXT_H - 2;
          return (
            <g>
              {hasTitle && (
                <text
                  x={cw / 2}
                  y={titleY}
                  fontSize={10} fill={labelColor} fontFamily="sans-serif" textAnchor="middle" fontWeight="600"
                >
                  {legendTitle}
                </text>
              )}
              <rect x={legendX} y={barY} width={legendW} height={LEGEND_BAR_H} fill="url(#ar-legend-grad)" rx={3} />
              <text x={legendX} y={valY} fontSize={10} fill={labelColor} fontFamily="sans-serif" textAnchor="start">
                {formatValue(minVal)}{scaleMode === "log" ? " (log)" : ""}
              </text>
              <text x={cw / 2} y={valY} fontSize={10} fill={labelColor} fontFamily="sans-serif" textAnchor="middle">
                {formatValue((minVal + maxVal) / 2)}
              </text>
              <text x={legendX + legendW} y={valY} fontSize={10} fill={labelColor} fontFamily="sans-serif" textAnchor="end">
                {formatValue(maxVal)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
