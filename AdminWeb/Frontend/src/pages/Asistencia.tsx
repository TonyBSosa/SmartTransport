import { useEffect, useMemo, useState } from "react";
import { Users, UserX, Clock, ClipboardList } from "lucide-react";
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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display mb-2">Control de Asistencia</h1>
            <p className="text-purple-100 text-lg">Registra y monitorea la asistencia de empleados</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
            <div className="text-sm text-purple-100 font-medium">Eventos registrados</div>
            <div className="text-3xl font-bold">{loading ? "..." : eventosFiltradosPorOrigen.length}</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          titulo="Asistencias"
          valor={loading ? "..." : totalAsistio} 
          icono={<Users className="h-6 w-6" />} 
          variante="success"
        />
        <KpiCard 
          titulo="No asistencias"
          valor={loading ? "..." : totalNoAsistio} 
          icono={<UserX className="h-6 w-6" />} 
          variante="danger"
        />
        <KpiCard 
          titulo="Total de eventos"
          valor={loading ? "..." : eventosFiltradosPorOrigen.length} 
          icono={<Clock className="h-6 w-6" />}
          subtexto="En Firestore"
        />
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filtrar por estado</span>
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-56 h-11 text-sm border-gray-300 rounded-lg"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="Asistió">Asistió ✓</SelectItem>
              <SelectItem value="No asistió">No asistió ✗</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm font-semibold text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200 ml-auto">
            {loading ? "Cargando..." : `${filtrados.length} registros`}
          </span>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="text-left px-6 py-4 font-bold text-gray-900">Empleado</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Zona</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Fecha</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Estado</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Registrado por</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-600 font-semibold">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
                      Cargando eventos de asistencia...
                    </div>
                  </td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-gray-600 font-semibold">No hay eventos de asistencia</p>
                    <p className="text-sm text-gray-500">para los filtros seleccionados</p>
                  </td>
                </tr>
              ) : (
                filtrados.slice(0, 100).map((evento) => {
                  const reserva = reservasPorId.get(evento.reservaId);
                  const estado = evento.estadoAsistencia || "Sin estado";

                  return (
                    <tr key={evento.id} className="border-b border-gray-200 last:border-0 hover:bg-purple-50 transition-all duration-200">
                      <td className="px-6 py-4 font-semibold text-gray-900">{reserva?.nombre || "Sin nombre"}</td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{reserva?.zona || "Sin zona"}</td>
                      <td className="px-6 py-4 text-gray-700 font-semibold">{evento.fecha || "Sin fecha"}</td>
                      <td className="px-6 py-4"><StatusBadge estado={estado} /></td>
                      <td className="px-6 py-4 text-gray-700">{evento.registradoPor || "Sin registro"}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{formatTimestamp(evento.timestamp)}</td>
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

