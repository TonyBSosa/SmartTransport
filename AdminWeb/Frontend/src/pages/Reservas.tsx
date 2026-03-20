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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display mb-2">Gestión de Reservas</h1>
            <p className="text-blue-100 text-lg">Administra todas las reservas de transporte del sistema</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
            <div className="text-sm text-blue-100 font-medium">Total de reservas</div>
            <div className="text-3xl font-bold">{loading ? "..." : filtradas.length}</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Filtros avanzados</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="pl-10 h-11 text-sm border-gray-300 focus:border-blue-500 focus:ring-blue-500/30 rounded-lg"
              />
            </div>
            <Select value={filtroZona} onValueChange={setFiltroZona}>
              <SelectTrigger className="w-40 h-11 text-sm border-gray-300 rounded-lg"><SelectValue placeholder="Zona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las zonas</SelectItem>
                {zonas.map((zona) => <SelectItem key={zona} value={zona}>{zona}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-40 h-11 text-sm border-gray-300 rounded-lg"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estados.map((estado) => <SelectItem key={estado} value={estado}>{estado}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroDia} onValueChange={setFiltroDia}>
              <SelectTrigger className="w-40 h-11 text-sm border-gray-300 rounded-lg"><SelectValue placeholder="Día" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los días</SelectItem>
                {diasSemana.map((dia) => <SelectItem key={dia} value={dia}>{dia}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm font-semibold text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              {loading ? "Cargando..." : `${filtradas.length} resultados`}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100">
                <th className="text-left px-6 py-4 font-bold text-gray-900">Nombre</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Teléfono</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Zona</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Días</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Entrada</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Salida</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Transporte</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Estado</th>
                <th className="text-left px-6 py-4 font-bold text-gray-900">Creación</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-600 font-semibold">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                      Cargando reservas desde Firestore...
                    </div>
                  </td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-gray-600 font-semibold">No hay reservas disponibles</p>
                    <p className="text-sm text-gray-500">para los filtros seleccionados</p>
                  </td>
                </tr>
              ) : (
                filtradas.map((reserva) => (
                  <tr key={reserva.id} className="border-b border-gray-200 last:border-0 hover:bg-blue-50 transition-all duration-200">
                    <td className="px-6 py-4 font-semibold text-gray-900">{reserva.nombre || "Sin nombre"}</td>
                    <td className="px-6 py-4 text-gray-700 font-mono">{reserva.telefono || "Sin teléfono"}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{reserva.zona || "Sin zona"}</td>
                    <td className="px-6 py-4 text-gray-700 text-xs">{reserva.diasSemana.join(", ") || "Sin días"}</td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{reserva.horarioEntrada || "—"}</td>
                    <td className="px-6 py-4 text-gray-700 font-semibold">{reserva.horarioSalida || "—"}</td>
                    <td className="px-6 py-4 text-gray-700">{reserva.tipoTransporte || "—"}</td>
                    <td className="px-6 py-4"><StatusBadge estado={reserva.estado} /></td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{formatFecha(reserva.fechaCreacion)}</td>
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

