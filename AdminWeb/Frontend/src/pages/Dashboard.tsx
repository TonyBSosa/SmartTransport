import { useEffect, useMemo, useState } from "react";
import {
  CalendarCheck, Users, UserX, XCircle, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import KpiCard from "@/components/KpiCard";
import AlertaCard from "@/components/AlertaCard";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import {
  buildPlanificacionTransporte,
  getEventosAsistencia,
  getReservas,
  type EventoAsistenciaFirestore,
  type PlanificacionTransporte,
  type ReservaFirestore,
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

  const reservasAgendadas = useMemo(
    () => reservasFiltradas.filter((reserva) => reserva.estado === "Agendada" || reserva.estado === "Activa"),
    [reservasFiltradas]
  );
  const cancelaciones = useMemo(
    () => reservasFiltradas.filter((reserva) => reserva.estado.toLowerCase().includes("cancel")).length,
    [reservasFiltradas]
  );
  const fechaMasReciente = useMemo(() => {
    return [...new Set(eventosFiltrados.map((evento) => evento.fecha).filter(Boolean))].sort().at(-1) ?? "";
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
    <div className="space-y-6">
      <h1 className="text-xl font-display font-semibold">Dashboard Principal</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard titulo="Reservas hoy" valor={loading ? "..." : reservasAgendadas.length} icono={<CalendarCheck className="h-4 w-4" />} />
        <KpiCard titulo="Asistencias" valor={loading ? "..." : asistenciasHoy} icono={<Users className="h-4 w-4" />} variante="success" />
        <KpiCard titulo="No asistencias" valor={loading ? "..." : noAsistenciasHoy} icono={<UserX className="h-4 w-4" />} variante="danger" />
        <KpiCard titulo="Cancelaciones" valor={loading ? "..." : cancelaciones} icono={<XCircle className="h-4 w-4" />} variante="warning" />
        <KpiCard titulo="Tasa asistencia" valor={loading ? "..." : `${tasaAsistencia}%`} icono={<TrendingUp className="h-4 w-4" />} variante="success" />
        <KpiCard titulo="Tasa inasistencia" valor={loading ? "..." : `${tasaInasistencia}%`} icono={<TrendingDown className="h-4 w-4" />} variante="danger" />
      </div>

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          Cargando datos reales desde Firestore...
        </div>
      ) : sinDatos ? (
        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          No hay datos disponibles para el origen seleccionado.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-medium mb-4">Inasistencias por día</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={inasistenciasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                    <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-sm font-medium mb-4">Demanda por zona</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={demandaPorZona} dataKey="cantidad" nameKey="zona" cx="50%" cy="50%" outerRadius={70} label={({ zona }) => zona}>
                        {demandaPorZona.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-sm font-medium mb-4">Tendencia semanal de inasistencias</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={tendenciaSemanal}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                      <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="inasistencias" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-medium mb-4">Demanda por horario</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={demandaPorHorario}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                    <XAxis dataKey="horario" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-5">
                <h3 className="text-sm font-medium mb-4">Alertas</h3>
                <div className="space-y-3">
                  {alertas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay alertas relevantes por el momento.</p>
                  ) : (
                    alertas.map((alerta, index) => (
                      <AlertaCard key={index} mensaje={alerta.mensaje} severidad={alerta.severidad} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Planificación de transporte</h3>
              <span className="text-xs text-muted-foreground">{planificacion.length} combinaciones zona/hora/día</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Zona</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hora</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Día</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Demanda</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Buses necesarios</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {planificacion.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No hay suficientes reservas para generar planificación de transporte.
                      </td>
                    </tr>
                  ) : (
                    planificacion.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{item.zona}</td>
                        <td className="px-4 py-3">{item.hora}</td>
                        <td className="px-4 py-3">{item.dia}</td>
                        <td className="px-4 py-3">{item.demanda}</td>
                        <td className="px-4 py-3">{item.busesNecesarios}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.estado === "Saturado"
                              ? "bg-destructive/10 text-destructive"
                              : item.estado === "Subutilizado"
                                ? "bg-warning/10 text-warning"
                                : "bg-success/10 text-success"
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
        </div>
      )}
    </div>
  );
}


