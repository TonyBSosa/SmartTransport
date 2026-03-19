import { useEffect, useMemo, useState } from "react";
import { Route, Users, Clock, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import {
  getEventosAsistencia,
  getReservas,
  type EventoAsistenciaFirestore,
  type ReservaFirestore,
} from "@/services/firestoreService";
import { filterBySynthetic } from "@/utils/dataSourceFilter";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];
const iconMap = { route: Route, users: Users, clock: Clock, trending: TrendingUp };

function isNoAsistencia(estado: string): boolean {
  return estado === "No asistió";
}

export default function Analitica() {
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
        console.error("Error cargando analítica:", error);
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
  const reservasPorId = useMemo(() => new Map(reservasFiltradas.map((reserva) => [reserva.id, reserva])), [reservasFiltradas]);

  const topInasistencias = useMemo(() => {
    const grouped = eventosFiltrados.reduce<Record<string, { nombre: string; zona: string; inasistencias: number }>>((accumulator, evento) => {
      if (!isNoAsistencia(evento.estadoAsistencia)) return accumulator;
      const reserva = reservasPorId.get(evento.reservaId);
      const nombre = reserva?.nombre || "Usuario sin nombre";
      const zona = reserva?.zona || "Sin zona";
      const current = accumulator[nombre] ?? { nombre, zona, inasistencias: 0 };
      current.inasistencias += 1;
      accumulator[nombre] = current;
      return accumulator;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => b.inasistencias - a.inasistencias)
      .slice(0, 5);
  }, [eventosFiltrados, reservasPorId]);

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

  const distribucionEstados = useMemo(() => {
    const grouped = reservasFiltradas.reduce<Record<string, number>>((accumulator, reserva) => {
      if (reserva.estado) {
        accumulator[reserva.estado] = (accumulator[reserva.estado] ?? 0) + 1;
      }
      return accumulator;
    }, {});

    return Object.entries(grouped).map(([estado, cantidad]) => ({ estado, cantidad }));
  }, [reservasFiltradas]);

  const recomendaciones = useMemo(() => {
    const items: Array<{ titulo: string; descripcion: string; icono: keyof typeof iconMap }> = [];

    const zonaBaja = [...demandaPorZona].sort((a, b) => a.cantidad - b.cantidad)[0];
    if (zonaBaja) {
      items.push({
        titulo: "Revisar demanda por zona",
        descripcion: `La zona ${zonaBaja.zona} reporta ${zonaBaja.cantidad} reservas. Conviene validar si la cobertura actual sigue siendo adecuada.`,
        icono: "route",
      });
    }

    const reincidente = topInasistencias[0];
    if (reincidente) {
      items.push({
        titulo: "Seguimiento a reincidencias",
        descripcion: `${reincidente.nombre} acumula ${reincidente.inasistencias} no asistencias. Se recomienda seguimiento operativo con su área.`,
        icono: "users",
      });
    }

    const horarioPico = [...demandaPorHorario].sort((a, b) => b.cantidad - a.cantidad)[0];
    if (horarioPico) {
      items.push({
        titulo: "Horario de mayor demanda",
        descripcion: `El horario ${horarioPico.horario} concentra ${horarioPico.cantidad} reservas. Puede requerir refuerzo operativo.`,
        icono: "clock",
      });
    }

    if (reservasFiltradas.length > 0) {
      items.push({
        titulo: "Monitoreo continuo",
        descripcion: "Con el panel conectado a Firestore, los indicadores ya reflejan el estado real de la operación y permiten decisiones más precisas.",
        icono: "trending",
      });
    }

    return items.slice(0, 4);
  }, [demandaPorHorario, demandaPorZona, reservasFiltradas.length, topInasistencias]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-semibold">Módulo Analítico</h1>

      {loading ? (
        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          Cargando analítica desde Firestore...
        </div>
      ) : reservasFiltradas.length === 0 && eventosFiltrados.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          No hay datos suficientes para generar analítica.
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium mb-4">Top usuarios con más inasistencias</h3>
              <div className="space-y-3">
                {topInasistencias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay inasistencias registradas.</p>
                ) : (
                  topInasistencias.map((usuario, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{usuario.nombre}</p>
                        <p className="text-xs text-muted-foreground">Zona {usuario.zona}</p>
                      </div>
                      <span className="text-sm font-display font-semibold text-destructive">{usuario.inasistencias}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium mb-4">Demanda por zona</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={demandaPorZona} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="zona" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium mb-4">Horarios pico</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={demandaPorHorario}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214,32%,91%)" />
                  <XAxis dataKey="horario" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <h3 className="text-sm font-medium mb-4">Distribución de estados</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={distribucionEstados} dataKey="cantidad" nameKey="estado" cx="50%" cy="50%" outerRadius={80} label={({ estado }) => estado}>
                    {distribucionEstados.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-display font-semibold mb-4">Recomendaciones operativas</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {recomendaciones.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
                  Aún no hay datos suficientes para generar recomendaciones.
                </div>
              ) : (
                recomendaciones.map((recomendacion, index) => {
                  const Icon = iconMap[recomendacion.icono];

                  return (
                    <div key={index} className="bg-card border border-border rounded-lg p-5 flex gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold mb-1">{recomendacion.titulo}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{recomendacion.descripcion}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


