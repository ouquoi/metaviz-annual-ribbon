import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AnnualRibbon } from "./AnnualRibbon";
import type { Settings } from "./types";

// Deterministic mock data for 2024 — 365 days with pseudo-random values
function generateMockRows(): [string, number][] {
  const rows: [string, number][] = [];
  const year = 2024;
  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      // Simple deterministic value: sine wave + day-of-year factor
      const doy = m * 31 + d;
      const v = Math.round(Math.abs(Math.sin(doy * 0.17) * 80 + Math.cos(doy * 0.09) * 40 + 30));
      rows.push([dateStr, v]);
    }
  }
  return rows;
}

const MOCK_SERIES = [
  {
    data: {
      cols: [
        { name: "jour", display_name: "Jour", base_type: "type/Date" },
        { name: "validations", display_name: "Validations", base_type: "type/Integer" },
      ],
      rows: generateMockRows(),
    },
  },
];

const MOCK_SETTINGS: Settings = {
  bandHeight: 40,
  colorLow: "#ebedf0",
  colorHigh: "#509EE3",
};

function App() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16, fontFamily: "sans-serif" }}>
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Annual Ribbon — Light</h3>
        <div style={{ width: 900, height: 100, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          <AnnualRibbon
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            series={MOCK_SERIES as any}
            settings={MOCK_SETTINGS}
            width={900}
            height={100}
            colorScheme="light"
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onClick={() => {}}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onHover={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Annual Ribbon — Dark</h3>
        <div style={{ width: 900, height: 100, border: "1px solid #555", borderRadius: 8, overflow: "hidden", backgroundColor: "#1c1c1c" }}>
          <AnnualRibbon
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            series={MOCK_SERIES as any}
            settings={{ ...MOCK_SETTINGS, colorHigh: "#44bd88" }}
            width={900}
            height={100}
            colorScheme="dark"
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onClick={() => {}}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onHover={() => {}}
          />
        </div>
      </div>
      <div>
        <h3 style={{ margin: "0 0 8px" }}>Annual Ribbon — Tall band</h3>
        <div style={{ width: 900, height: 140, border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
          <AnnualRibbon
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            series={MOCK_SERIES as any}
            settings={{ ...MOCK_SETTINGS, bandHeight: 80, colorHigh: "#e05353" }}
            width={900}
            height={140}
            colorScheme="light"
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onClick={() => {}}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onHover={() => {}}
          />
        </div>
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
