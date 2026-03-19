import { Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import type { DataSourceMode } from "@/utils/dataSourceFilter";

export default function DataSourceFilter() {
  const { mode, setMode } = useDataSourceFilter();

  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
        <Database className="h-4 w-4" />
        <span>Origen</span>
      </div>
      <Select value={mode} onValueChange={(value) => setMode(value as DataSourceMode)}>
        <SelectTrigger className="w-[170px] h-9 text-sm bg-background">
          <SelectValue placeholder="Origen de datos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="reales">Solo reales</SelectItem>
          <SelectItem value="sinteticos">Solo sintéticos</SelectItem>
          <SelectItem value="todos">Todos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
