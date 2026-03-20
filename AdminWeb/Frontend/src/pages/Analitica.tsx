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
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-display mb-2">Módulo Analítico</h1>
            <p className="text-orange-100 text-lg">Análisis profundo de datos operacionales e insights estratégicos</p>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
            <div className="text-sm text-orange-100 font-medium">Registros analizados</div>
            <div className="text-3xl font-bold">{loading ? "..." : reservasFiltradas.length + eventosFiltrados.length}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-orange-600 mx-auto mb-6"></div>
          <p className="text-gray-600 font-semibold text-lg">Cargando analítica desde Firestore...</p>
        </div>
      ) : reservasFiltradas.length === 0 && eventosFiltrados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600 font-semibold text-lg">No hay datos suficientes para generar analítica</p>
        </div>
      ) : (
        <>
          {/* Top Section */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Top usuarios con más inasistencias */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-100 rounded-xl">
                  <Users className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Top usuarios con inasistencias</h3>
                  <p className="text-sm text-gray-500">Top 5 más críticos</p>
                </div>
              </div>
              <div className="space-y-4">
                {topInasistencias.length === 0 ? (
                  <p className="text-center py-8 text-gray-500 font-semibold">No hay inasistencias registradas</p>
                ) : (
                  topInasistencias.map((usuario, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{index + 1}. {usuario.nombre}</p>
                        <p className="text-xs text-gray-600 font-medium">📍 Zona {usuario.zona}</p>
                      </div>
                      <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                        <span className="text-sm font-bold text-red-700">{usuario.inasistencias}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Demanda por zona */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Route className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Demanda por zona</h3>
                  <p className="text-sm text-gray-500">Distribución geográfica</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={demandaPorZona} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis dataKey="zona" type="category" tick={{ fontSize: 12, fill: '#6B7280' }} width={100} axisLine={{ stroke: '#E5E7EB' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                      padding: '12px'
                    }}
                  />
                  <Bar dataKey="cantidad" fill="url(#barGradient)" radius={[0, 8, 8, 0]} />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Middle Section */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Horarios pico */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Horarios pico</h3>
                  <p className="text-sm text-gray-500">Demanda por hora</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
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

            {/* Distribución de estados */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Distribución de estados</h3>
                  <p className="text-sm text-gray-500">Estados de reservas</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie 
                    data={distribucionEstados} 
                    dataKey="cantidad" 
                    nameKey="estado" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={90} 
                    label={({ estado }) => estado}
                  >
                    {distribucionEstados.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
          </div>

          {/* Recommendations Section */}
          <div>
            <h2 className="text-2xl font-bold font-display mb-6 text-gray-900">Recomendaciones Operativas</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {recomendaciones.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                  <p className="text-gray-600 font-semibold">Aún no hay datos suficientes para generar recomendaciones</p>
                </div>
              ) : (
                recomendaciones.map((recomendacion, index) => {
                  const Icon = iconMap[recomendacion.icono];

                  return (
                    <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-all duration-300 flex gap-4">
                      <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-gray-900 mb-2">{recomendacion.titulo}</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{recomendacion.descripcion}</p>
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


