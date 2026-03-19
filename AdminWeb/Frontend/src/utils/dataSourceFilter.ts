export type DataSourceMode = "reales" | "sinteticos" | "todos";

type SyntheticRecord = {
  synthetic?: boolean | null;
};

export function filterBySynthetic<T extends SyntheticRecord>(records: T[], mode: DataSourceMode): T[] {
  if (mode === "todos") return records;
  if (mode === "sinteticos") return records.filter((record) => record.synthetic === true);
  return records.filter((record) => record.synthetic !== true);
}
