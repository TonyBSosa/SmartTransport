import { useEffect, useMemo, useState } from "react";
import { Users, UserX, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import KpiCard from "@/components/KpiCard";
import StatusBadge from "@/components/StatusBadge";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import {
  getEventosAsistencia,
  getReservas,
  type EventoAsistenciaFirestore,
  type ReservaFirestore,
} from "@/services/firestoreService";
import { filterBySynthetic } from "@/utils/dataSourceFilter";

function formatTimestamp(value: unknown): string {
  if (!value) return "Sin timestamp";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString("es-ES");
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("es-ES");
}

export default function Asistencia() {
  const { mode } = useDataSourceFilter();
  const [eventosAsistencia, setEventosAsistencia] = useState<EventoAsistenciaFirestore[]>([]);
  const [reservas, setReservas] = useState<ReservaFirestore[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");

  useEffect(() => {
    let active = true;

    Promise.all([getEventosAsistencia(), getReservas()])
      .then(([eventosData, reservasData]) => {
        if (active) {
          setEventosAsistencia(eventosData);
          setReservas(reservasData);
        }
      })
      .catch((error) => {
        console.error("Error cargando eventos de asistencia:", error);
        if (active) {
          setEventosAsistencia([]);
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

  const reservasFiltradas = useMemo(() => filterBySynthetic(reservas, mode), [mode, reservas]);
  const eventosFiltradosPorOrigen = useMemo(() => filterBySynthetic(eventosAsistencia, mode), [eventosAsistencia, mode]);

  const reservasPorId = useMemo(() => {
    return new Map(reservasFiltradas.map((reserva) => [reserva.id, reserva]));
  }, [reservasFiltradas]);

  const filtrados = useMemo(() => {
    if (filtroEstado === "todos") return eventosFiltradosPorOrigen;
    return eventosFiltradosPorOrigen.filter((evento) => evento.estadoAsistencia === filtroEstado);
  }, [eventosFiltradosPorOrigen, filtroEstado]);

  const totalAsistio = useMemo(
    () => eventosFiltradosPorOrigen.filter((evento) => evento.estadoAsistencia === "Asistió").length,
    [eventosFiltradosPorOrigen]
  );
  const totalNoAsistio = useMemo(
    () => eventosFiltradosPorOrigen.filter((evento) => evento.estadoAsistencia === "No asistió").length,
    [eventosFiltradosPorOrigen]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-semibold">Eventos de Asistencia</h1>

      <div className="grid grid-cols-3 gap-4">
        <KpiCard titulo="Total asistencias" valor={loading ? "..." : totalAsistio} icono={<Users className="h-4 w-4" />} variante="success" />
        <KpiCard titulo="Total no asistencias" valor={loading ? "..." : totalNoAsistio} icono={<UserX className="h-4 w-4" />} variante="danger" />
        <KpiCard titulo="Últimos eventos" valor={loading ? "..." : eventosFiltradosPorOrigen.length} icono={<Clock className="h-4 w-4" />} subtexto="Firestore" />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="Asistió">Asistió</SelectItem>
            <SelectItem value="No asistió">No asistió</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {loading ? "Cargando..." : `${filtrados.length} registros`}
        </span>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">ID Evento</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reserva</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empleado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Registrado por</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando eventos de asistencia desde Firestore...
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No hay eventos de asistencia registrados.
                  </td>
                </tr>
              ) : (
                filtrados.slice(0, 50).map((evento) => {
                  const reserva = reservasPorId.get(evento.reservaId);
                  const estado = evento.estadoAsistencia || "Sin estado";

                  return (
                    <tr key={evento.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{evento.id}</td>
                      <td className="px-4 py-3 font-mono text-xs">{evento.reservaId || "Sin reserva"}</td>
                      <td className="px-4 py-3 font-medium">{reserva?.nombre || "Sin nombre asociado"}</td>
                      <td className="px-4 py-3">{evento.fecha || "Sin fecha"}</td>
                      <td className="px-4 py-3"><StatusBadge estado={estado} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{evento.registradoPor || "Sin registro"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatTimestamp(evento.timestamp)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

