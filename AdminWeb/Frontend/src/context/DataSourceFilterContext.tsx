import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DataSourceMode } from "@/utils/dataSourceFilter";

type DataSourceFilterContextValue = {
  mode: DataSourceMode;
  setMode: (mode: DataSourceMode) => void;
};

const STORAGE_KEY = "smarttransport-data-source-mode";

const DataSourceFilterContext = createContext<DataSourceFilterContextValue | undefined>(undefined);

export function DataSourceFilterProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DataSourceMode>("reales");

  useEffect(() => {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    if (storedMode === "reales" || storedMode === "sinteticos" || storedMode === "todos") {
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo(() => ({ mode, setMode }), [mode]);

  return <DataSourceFilterContext.Provider value={value}>{children}</DataSourceFilterContext.Provider>;
}

export function useDataSourceFilter() {
  const context = useContext(DataSourceFilterContext);

  if (!context) {
    throw new Error("useDataSourceFilter debe usarse dentro de DataSourceFilterProvider");
  }

  return context;
}
