import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import { getReservas, type ReservaFirestore } from "@/services/firestoreService";
import { filterBySynthetic } from "@/utils/dataSourceFilter";

function formatFecha(value: unknown): string {
  if (!value) return "Sin fecha";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("es-ES");
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Sin fecha" : date.toLocaleDateString("es-ES");
}

export default function Reservas() {
  const { mode } = useDataSourceFilter();
  const [reservas, setReservas] = useState<ReservaFirestore[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroZona, setFiltroZona] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroDia, setFiltroDia] = useState("todos");

  useEffect(() => {
    let active = true;

    getReservas()
      .then((data) => {
        if (active) {
          setReservas(data);
        }
      })
      .catch((error) => {
        console.error("Error cargando reservas:", error);
        if (active) {
          setReservas([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const reservasFiltradasPorOrigen = useMemo(() => filterBySynthetic(reservas, mode), [mode, reservas]);

  const zonas = useMemo(
    () => Array.from(new Set(reservasFiltradasPorOrigen.map((reserva) => reserva.zona).filter(Boolean))).sort(),
    [reservasFiltradasPorOrigen]
  );
  const estados = useMemo(
    () => Array.from(new Set(reservasFiltradasPorOrigen.map((reserva) => reserva.estado).filter(Boolean))).sort(),
    [reservasFiltradasPorOrigen]
  );
  const diasSemana = useMemo(
    () => Array.from(new Set(reservasFiltradasPorOrigen.flatMap((reserva) => reserva.diasSemana))).sort(),
    [reservasFiltradasPorOrigen]
  );

  const filtradas = useMemo(() => {
    return reservasFiltradasPorOrigen.filter((reserva) => {
      const matchBusqueda =
        !busqueda ||
        reserva.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        reserva.telefono.includes(busqueda);
      const matchZona = filtroZona === "todas" || reserva.zona === filtroZona;
      const matchEstado = filtroEstado === "todos" || reserva.estado === filtroEstado;
      const matchDia = filtroDia === "todos" || reserva.diasSemana.includes(filtroDia);

      return matchBusqueda && matchZona && matchEstado && matchDia;
    });
  }, [busqueda, filtroDia, filtroEstado, filtroZona, reservasFiltradasPorOrigen]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-semibold">Módulo de Reservas</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={filtroZona} onValueChange={setFiltroZona}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder="Zona" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las zonas</SelectItem>
            {zonas.map((zona) => <SelectItem key={zona} value={zona}>{zona}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {estados.map((estado) => <SelectItem key={estado} value={estado}>{estado}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroDia} onValueChange={setFiltroDia}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue placeholder="Día" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los días</SelectItem>
            {diasSemana.map((dia) => <SelectItem key={dia} value={dia}>{dia}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {loading ? "Cargando..." : `${filtradas.length} resultados`}
        </span>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zona</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Días</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Entrada</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Salida</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Transporte</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Creación</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando reservas desde Firestore...
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                    No hay reservas disponibles para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filtradas.map((reserva) => (
                  <tr key={reserva.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{reserva.id}</td>
                    <td className="px-4 py-3 font-medium">{reserva.nombre || "Sin nombre"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{reserva.telefono || "Sin teléfono"}</td>
                    <td className="px-4 py-3">{reserva.zona || "Sin zona"}</td>
                    <td className="px-4 py-3 text-xs">{reserva.diasSemana.join(", ") || "Sin días"}</td>
                    <td className="px-4 py-3">{reserva.horarioEntrada || "—"}</td>
                    <td className="px-4 py-3">{reserva.horarioSalida || "—"}</td>
                    <td className="px-4 py-3">{reserva.tipoTransporte || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge estado={reserva.estado} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatFecha(reserva.fechaCreacion)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

