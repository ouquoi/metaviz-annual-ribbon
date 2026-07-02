import { type CreateCustomVisualization, defineConfig } from "@metabase/custom-viz";
import { TimeRibbon } from "./TimeRibbon";
import type { Settings } from "./types";
import { isNumericCol, isDateCol } from "./utils";

const createVisualization: CreateCustomVisualization<Settings> = ({ defineSetting }) => {
  return defineConfig<Settings>({
    id: "time-ribbon",
    getName: () => "Time Ribbon",
    minSize: { width: 4, height: 2 },
    defaultSize: { width: 12, height: 3 },

    checkRenderable(series) {
      if (!series || series.length === 0) throw new Error("Select a date column and a value column");
      const data = series[0]?.data;
      if (!data) throw new Error("Select a date column and a value column");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cols = data.cols as any[];
      if (!cols.some(c => isDateCol(c))) throw new Error("The query must return a date column");
      if (!cols.some(c => isNumericCol(c))) throw new Error("The query must return a numeric column");
    },

    settings: {
      // ── Data ──────────────────────────────────────────────────────────
      dateColumn: defineSetting({
        id: "dateColumn",
        title: "Date column",
        widget: "select",
        getSection() { return "Data"; },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getDefault(series: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return cols.find(c => isDateCol(c))?.name ?? "";
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getProps(series: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return { options: cols.filter(c => isDateCol(c)).map(c => ({ name: c.display_name || c.name, value: c.name })) };
        },
      }),
      valueColumn: defineSetting({
        id: "valueColumn",
        title: "Value column",
        widget: "select",
        getSection() { return "Data"; },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getDefault(series: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return cols.find(c => isNumericCol(c))?.name ?? "";
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getProps(series: any) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return { options: cols.filter(c => isNumericCol(c)).map(c => ({ name: c.display_name || c.name, value: c.name })) };
        },
      }),

      // ── Appearance ────────────────────────────────────────────────────
      bandHeight: defineSetting({
        id: "bandHeight",
        title: "Band height",
        widget: "number",
        getSection() { return "Appearance"; },
        getDefault() { return 40; },
      }),
      colorLow: defineSetting({
        id: "colorLow",
        title: "Color — low values",
        widget: "color",
        getSection() { return "Appearance"; },
        getDefault() { return "#ebedf0"; },
      }),
      colorHigh: defineSetting({
        id: "colorHigh",
        title: "Color — high values",
        widget: "color",
        getSection() { return "Appearance"; },
        getDefault() { return "#509EE3"; },
      }),
      scaleMode: defineSetting({
        id: "scaleMode",
        title: "Color scale",
        widget: "select",
        getSection() { return "Appearance"; },
        getDefault() { return "linear"; },
        getProps() {
          return { options: [{ name: "Linear", value: "linear" }, { name: "Logarithmic", value: "log" }] };
        },
      }),
      showLegend: defineSetting({
        id: "showLegend",
        title: "Show legend",
        widget: "toggle",
        getSection() { return "Appearance"; },
        getDefault() { return true; },
      }),
      legendTitle: defineSetting({
        id: "legendTitle",
        title: "Legend title",
        widget: "input",
        getSection() { return "Appearance"; },
        getDefault() { return ""; },
      }),
    },

    VisualizationComponent: TimeRibbon,
  });
};

export default createVisualization;
