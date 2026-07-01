import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnnualRibbon } from "./AnnualRibbon";
import type { Settings } from "./types";

type GranularityKey = "hour" | "day" | "week" | "month" | "quarter" | "year";

function generateMockRows(granularity: GranularityKey): [string, number][] {
  const rows: [string, number][] = [];
  const year = 2024;

  if (granularity === "hour") {
    for (let h = 0; h < 48; h++) {
      const d = new Date(year, 0, 1 + Math.floor(h / 24), h % 24);
      const v = Math.round(Math.abs(Math.sin(h * 0.4) * 60 + Math.cos(h * 0.15) * 30 + 20));
      rows.push([d.toISOString(), v]);
    }
  } else if (granularity === "day") {
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const doy = m * 31 + d;
        const v = Math.round(Math.abs(Math.sin(doy * 0.17) * 80 + Math.cos(doy * 0.09) * 40 + 30));
        rows.push([`${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, v]);
      }
    }
  } else if (granularity === "week") {
    for (let w = 0; w < 52; w++) {
      const d = new Date(year, 0, 1 + w * 7);
      const v = Math.round(Math.abs(Math.sin(w * 0.25) * 70 + Math.cos(w * 0.12) * 40 + 30));
      rows.push([d.toISOString(), v]);
    }
  } else if (granularity === "month") {
    for (let y = 0; y < 2; y++) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(year - 1 + y, m, 1);
        const v = Math.round(Math.abs(Math.sin(m * 0.8 + y) * 120 + 100));
        rows.push([d.toISOString(), v]);
      }
    }
  } else if (granularity === "quarter") {
    for (let y = 0; y < 4; y++) {
      for (let q = 0; q < 4; q++) {
        const d = new Date(year - 3 + y, q * 3, 1);
        const v = Math.round(Math.abs(Math.sin(q * 1.5 + y * 0.7) * 300 + 400));
        rows.push([d.toISOString(), v]);
      }
    }
  } else {
    for (let y = 0; y < 10; y++) {
      const d = new Date(year - 9 + y, 0, 1);
      const v = Math.round(Math.abs(Math.sin(y * 0.6) * 500 + 800 + y * 120));
      rows.push([d.toISOString(), v]);
    }
  }

  return rows;
}

function App() {
  const [dark, setDark] = useState(false);
  const [granularity, setGranularity] = useState<GranularityKey>("day");
  const [width, setWidth] = useState(900);
  const [height, setHeight] = useState(100);
  const [bandHeight, setBandHeight] = useState(40);
  const [colorHigh, setColorHigh] = useState("#509EE3");

  const mockSeries = [{
    data: {
      cols: [
        { name: "jour", display_name: "Jour", base_type: "type/Date" },
        { name: "validations", display_name: "Validations", base_type: "type/Integer" },
      ],
      rows: generateMockRows(granularity),
    },
  }];

  const settings: Settings = { bandHeight, colorLow: "#ebedf0", colorHigh };

  const labelStyle = { color: dark ? "#ccc" : "#333", display: "flex", alignItems: "center", gap: 4 };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, background: dark ? "#111" : "#f5f5f5", minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <label style={labelStyle}>
          Granularity:&nbsp;
          <select value={granularity} onChange={e => setGranularity(e.target.value as GranularityKey)}>
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
          </select>
        </label>
        <label style={labelStyle}>
          Width:&nbsp;<input type="number" value={width} onChange={e => setWidth(+e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={labelStyle}>
          Height:&nbsp;<input type="number" value={height} onChange={e => setHeight(+e.target.value)} style={{ width: 70 }} />
        </label>
        <label style={labelStyle}>
          Band height:&nbsp;<input type="number" value={bandHeight} onChange={e => setBandHeight(+e.target.value)} style={{ width: 60 }} />
        </label>
        <label style={labelStyle}>
          High color:&nbsp;<input type="color" value={colorHigh} onChange={e => setColorHigh(e.target.value)} />
        </label>
        <label style={labelStyle}>
          <input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} />&nbsp;Dark
        </label>
      </div>

      <div style={{
        width,
        height,
        border: `1px solid ${dark ? "#333" : "#ddd"}`,
        borderRadius: 8,
        overflow: "hidden",
      }}>
        <AnnualRibbon
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          series={mockSeries as any}
          settings={settings}
          width={width}
          height={height}
          colorScheme={dark ? "dark" : "light"}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onClick={() => {}}
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onHover={() => {}}
        />
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
