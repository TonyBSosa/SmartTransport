import { useEffect, useMemo, useState } from "react";
import {
  Bus, CalendarCheck, Users, UserX, XCircle, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import AlertaCard from "@/components/AlertaCard";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import {
  buildRutasSugeridas,
  buildPlanificacionTransporte,
  getEventosAsistencia,
  getReservas,
  type EventoAsistenciaFirestore,
  type PlanificacionTransporte,
  type ReservaFirestore,
  type RutaSugerida,
} from "@/services/firestoreService";
import { filterBySynthetic } from "@/utils/dataSourceFilter";

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

function isNoAsistencia(estado: string): boolean {
  return estado === "No asistió";
}

function isAsistencia(estado: string): boolean {
  return estado === "Asistió";
}

function formatDiaCorto(fecha: string): string {
  const date = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fecha;
  return new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(date).replace(".", "");
}

function getWeekLabel(fecha: string): string {
  const date = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Sem ?";
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const diffDays = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  const week = Math.ceil((diffDays + firstDay.getDay() + 1) / 7);
  return `Sem ${week}`;
}

export default function Dashboard() {
  const { mode } = useDataSourceFilter();
  const [reservas, setReservas] = useState<ReservaFirestore[]>([]);
  const [eventos, setEventos] = useState<EventoAsistenciaFirestore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([getReservas(), getEventosAsistencia()])
      .then(([reservasData, eventosData]) => {
        if (active) {
          setReservas(reservasData);
          setEventos(eventosData);
        }
      })
      .catch((error) => {
        console.error("Error cargando dashboard:", error);
        if (active) {
          setReservas([]);
          setEventos([]);
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
  const eventosFiltrados = useMemo(() => filterBySynthetic(eventos, mode), [eventos, mode]);
  const planificacion = useMemo<PlanificacionTransporte[]>(
    () => buildPlanificacionTransporte(reservasFiltradas),
    [reservasFiltradas]
  );
  const rutasSugeridas = useMemo<RutaSugerida[]>(
    () => buildRutasSugeridas(reservasFiltradas),
    [reservasFiltradas]
  );

  const reservasAgendadas = useMemo(
    () => reservasFiltradas.filter((reserva) => reserva.estado === "Agendada" || reserva.estado === "Activa"),
    [reservasFiltradas]
  );
  const cancelaciones = useMemo(
    () => reservasFiltradas.filter((reserva) => reserva.estado.toLowerCase().includes("cancel")).length,
    [reservasFiltradas]
  );
  const fechaMasReciente = useMemo(() => {
    const fechas = [...new Set(eventosFiltrados.map((evento) => evento.fecha).filter(Boolean))].sort();
    return fechas[fechas.length - 1] ?? "";
  }, [eventosFiltrados]);
  const asistenciasHoy = useMemo(
    () => eventosFiltrados.filter((evento) => evento.fecha === fechaMasReciente && isAsistencia(evento.estadoAsistencia)).length,
    [eventosFiltrados, fechaMasReciente]
  );
  const noAsistenciasHoy = useMemo(
    () => eventosFiltrados.filter((evento) => evento.fecha === fechaMasReciente && isNoAsistencia(evento.estadoAsistencia)).length,
    [eventosFiltrados, fechaMasReciente]
  );
  const tasaAsistencia = asistenciasHoy + noAsistenciasHoy > 0
    ? Math.round((asistenciasHoy / (asistenciasHoy + noAsistenciasHoy)) * 100)
    : 0;
  const tasaInasistencia = asistenciasHoy + noAsistenciasHoy > 0 ? 100 - tasaAsistencia : 0;

  const inasistenciasPorDia = useMemo(() => {
    const grouped = eventosFiltrados.reduce<Record<string, number>>((accumulator, evento) => {
      if (evento.fecha && isNoAsistencia(evento.estadoAsistencia)) {
        accumulator[evento.fecha] = (accumulator[evento.fecha] ?? 0) + 1;
      }
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([fecha, cantidad]) => ({
        dia: formatDiaCorto(fecha),
        cantidad,
      }));
  }, [eventosFiltrados]);

  const demandaPorZona = useMemo(() => {
    const grouped = reservasFiltradas.reduce<Record<string, number>>((accumulator, reserva) => {
      if (reserva.zona) {
        accumulator[reserva.zona] = (accumulator[reserva.zona] ?? 0) + 1;
      }
      return accumulator;
    }, {});

    return Object.entries(grouped).map(([zona, cantidad]) => ({ zona, cantidad }));
  }, [reservasFiltradas]);

  const demandaPorHorario = useMemo(() => {
    const grouped = reservasFiltradas.reduce<Record<string, number>>((accumulator, reserva) => {
      if (reserva.horarioEntrada) {
        accumulator[reserva.horarioEntrada] = (accumulator[reserva.horarioEntrada] ?? 0) + 1;
      }
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([horario, cantidad]) => ({ horario, cantidad }));
  }, [reservasFiltradas]);

  const tendenciaSemanal = useMemo(() => {
    const grouped = eventosFiltrados.reduce<Record<string, number>>((accumulator, evento) => {
      if (evento.fecha && isNoAsistencia(evento.estadoAsistencia)) {
        const label = getWeekLabel(evento.fecha);
        accumulator[label] = (accumulator[label] ?? 0) + 1;
      }
      return accumulator;
    }, {});

    return Object.entries(grouped)
      .slice(-4)
      .map(([semana, inasistencias]) => ({ semana, inasistencias }));
  }, [eventosFiltrados]);

  const alertas = useMemo(() => {
    const reservasPorId = new Map(reservasFiltradas.map((reserva) => [reserva.id, reserva]));
    const noAsistenciasPorPersona = eventosFiltrados.reduce<Record<string, { nombre: string; cantidad: number }>>((accumulator, evento) => {
      if (!isNoAsistencia(evento.estadoAsistencia)) return accumulator;
      const nombre = reservasPorId.get(evento.reservaId)?.nombre || "Usuario sin nombre";
      const current = accumulator[nombre] ?? { nombre, cantidad: 0 };
      current.cantidad += 1;
      accumulator[nombre] = current;
      return accumulator;
    }, {});

    const alertasDerivadas: Array<{ mensaje: string; severidad: "alta" | "media" | "baja" }> = [];

    Object.values(noAsistenciasPorPersona)
      .filter((item) => item.cantidad >= 3)
      .slice(0, 2)
      .forEach((item) => {
        alertasDerivadas.push({
          mensaje: `${item.nombre} acumula ${item.cantidad} inasistencias registradas.`,
          severidad: "alta",
        });
      });

    demandaPorZona
      .filter((item) => item.cantidad <= 2)
      .slice(0, 1)
      .forEach((item) => {
        alertasDerivadas.push({
          mensaje: `La zona ${item.zona} tiene baja demanda con ${item.cantidad} reservas.`,
          severidad: "media",
        });
      });

    const solicitudesPendientes = reservasFiltradas.filter((reserva) => reserva.estado.toLowerCase().includes("solicitud")).length;
    if (solicitudesPendientes > 0) {
      alertasDerivadas.push({
        mensaje: `${solicitudesPendientes} reservas tienen solicitudes pendientes de revisión.`,
        severidad: "baja",
      });
    }

    planificacion
      .filter((item) => item.alerta)
      .slice(0, 3)
      .forEach((item) => {
        alertasDerivadas.push({
          mensaje: `${item.alerta} en ${item.zona} a las ${item.hora} (${item.dia}) por demanda ${item.demanda}.`,
          severidad: item.estado === "Saturado" ? "alta" : "media",
        });
      });

    return alertasDerivadas;
  }, [demandaPorZona, eventosFiltrados, planificacion, reservasFiltradas]);

  const sinDatos = !loading && reservasFiltradas.length === 0 && eventosFiltrados.length === 0 && planificacion.length === 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#0056D2] via-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-[0_12px_40px_-12px_rgba(0,86,210,0.5)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display mb-2">Dashboard Principal</h1>
            <p className="text-blue-100 text-lg">Monitorea el rendimiento de tu sistema de transporte en tiempo real</p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="glassmorphism rounded-xl px-4 py-3 text-white">
              <div className="text-sm font-medium opacity-90">Última actualización</div>
              <div className="text-lg font-semibold">{new Date().toLocaleDateString('es-ES')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
        <KpiCard
          titulo="Reservas hoy"
          valor={loading ? "..." : reservasAgendadas.length}
          icono={<CalendarCheck className="h-6 w-6" />}
          variante="default"
        />
        <KpiCard
          titulo="Asistencias"
          valor={loading ? "..." : asistenciasHoy}
          icono={<Users className="h-6 w-6" />}
          variante="success"
        />
        <KpiCard
          titulo="No asistencias"
          valor={loading ? "..." : noAsistenciasHoy}
          icono={<UserX className="h-6 w-6" />}
          variante="danger"
        />
        <KpiCard
          titulo="Cancelaciones"
          valor={loading ? "..." : cancelaciones}
          icono={<XCircle className="h-6 w-6" />}
          variante="warning"
        />
        <KpiCard
          titulo="Tasa asistencia"
          valor={loading ? "..." : `${tasaAsistencia}%`}
          icono={<TrendingUp className="h-6 w-6" />}
          variante="success"
        />
        <KpiCard
          titulo="Tasa inasistencia"
          valor={loading ? "..." : `${tasaInasistencia}%`}
          icono={<TrendingDown className="h-6 w-6" />}
          variante="danger"
        />
      </div>

      {loading ? (
        <div className="premium-card p-12 text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-primary mx-auto mb-6"></div>
          <p className="text-gray-600 font-semibold text-lg">Cargando datos reales desde Firestore...</p>
        </div>
      ) : sinDatos ? (
        <div className="premium-card p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-600 font-semibold text-lg">No hay datos disponibles para el origen seleccionado.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Charts Section */}
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Inasistencias por día */}
              <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <CalendarCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Inasistencias por día</h3>
                    <p className="text-sm text-gray-500">Últimos 7 días</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={inasistenciasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="cantidad" fill="url(#blueGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Two charts side by side */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Demanda por zona */}
                <div className="premium-card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Demanda por zona</h3>
                      <p className="text-sm text-gray-500">Distribución general</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={demandaPorZona}
                        dataKey="cantidad"
                        nameKey="zona"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ zona }) => zona}
                        labelLine={false}
                      >
                        {demandaPorZona.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid #E5E7EB',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                          padding: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Tendencia semanal */}
                <div className="premium-card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 rounded-xl">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Tendencia semanal</h3>
                      <p className="text-sm text-gray-500">Últimas 4 semanas</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={tendenciaSemanal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                      <XAxis dataKey="semana" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.98)',
                          border: '1px solid #E5E7EB',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                          padding: '12px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="inasistencias"
                        stroke="#EF4444"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#EF4444' }}
                        activeDot={{ r: 7, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Demanda por horario */}
              <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Demanda por horario</h3>
                    <p className="text-sm text-gray-500">Entrada y salida</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={demandaPorHorario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="horario" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="cantidad" fill="url(#greenGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sidebar - Alertas */}
            <div className="space-y-6">
              <div className="premium-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <XCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Alertas</h3>
                    <p className="text-sm text-gray-500">{alertas.length} activas</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {alertas.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">✅</div>
                      <p className="text-gray-600 font-semibold">No hay alertas</p>
                      <p className="text-sm text-gray-500">Todo está funcionando bien</p>
                    </div>
                  ) : (
                    alertas.map((alerta, index) => (
                      <AlertaCard key={index} mensaje={alerta.mensaje} severidad={alerta.severidad} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Planificación Table */}
          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <CalendarCheck className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Planificación de transporte</h3>
                  <p className="text-sm text-gray-500">Optimización de rutas y horarios</p>
                </div>
              </div>
              <div className="bg-indigo-100 px-4 py-2 rounded-xl">
                <span className="text-sm font-semibold text-indigo-700">{planificacion.length} combinaciones</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100">
                    <th className="text-left px-4 py-4 font-bold text-gray-900">Zona</th>
                    <th className="text-left px-4 py-4 font-bold text-gray-900">Hora</th>
                    <th className="text-left px-4 py-4 font-bold text-gray-900">Día</th>
                    <th className="text-left px-4 py-4 font-bold text-gray-900">Demanda</th>
                    <th className="text-left px-4 py-4 font-bold text-gray-900">Buses</th>
                    <th className="text-left px-4 py-4 font-bold text-gray-900">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {planificacion.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="text-4xl mb-3">🚌</div>
                        <p className="text-gray-600 font-semibold">No hay suficientes reservas</p>
                        <p className="text-sm text-gray-500">para generar planificación de transporte</p>
                      </td>
                    </tr>
                  ) : (
                    planificacion.map((item, index) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 last:border-0 hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900">{item.zona}</td>
                        <td className="px-4 py-4 text-gray-700">{item.hora}</td>
                        <td className="px-4 py-4 text-gray-700">{item.dia}</td>
                        <td className="px-4 py-4 text-gray-700 font-semibold">{item.demanda}</td>
                        <td className="px-4 py-4 font-bold text-blue-600">{item.busesNecesarios}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${
                            item.estado === "Saturado"
                              ? "bg-red-100 text-red-800 border-red-300"
                              : item.estado === "Subutilizado"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                : "bg-green-100 text-green-800 border-green-300"
                          }`}>
                            {item.estado}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="premium-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-xl">
                  <Bus className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Rutas sugeridas</h3>
                  <p className="text-sm text-gray-500">Semana actual con demanda mínima de 5 pasajeros</p>
                </div>
              </div>
              <div className="bg-emerald-100 px-4 py-2 rounded-xl">
                <span className="text-sm font-semibold text-emerald-700">{rutasSugeridas.length} sugerencias</span>
              </div>
            </div>

            {rutasSugeridas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                <div className="text-4xl mb-3">🚌</div>
                <p className="text-gray-700 font-semibold">No hay rutas sugeridas para la semana actual</p>
                <p className="text-sm text-gray-500">
                  Se generan automáticamente cuando una combinación alcanza 5 pasajeros o más.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rutasSugeridas.map((ruta) => (
                  <div
                    key={ruta.id}
                    className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100">
                          <Bus className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ruta sugerida</p>
                          <p className="text-lg font-bold text-gray-900">{ruta.zona}</p>
                        </div>
                      </div>
                      <div className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                        {ruta.cantidadPasajeros} personas
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-xs font-medium text-gray-500">Día</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{ruta.dia}</p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3">
                        <p className="text-xs font-medium text-gray-500">Hora</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{ruta.hora}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


