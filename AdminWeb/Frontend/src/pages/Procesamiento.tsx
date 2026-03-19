import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, CheckCircle2, Database, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDataSourceFilter } from "@/context/DataSourceFilterContext";
import {
  getEventosAsistencia,
  getReservas,
  type EventoAsistenciaFirestore,
  type ReservaFirestore,
} from "@/services/firestoreService";
import { filterBySynthetic } from "@/utils/dataSourceFilter";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatUltimaActualizacion(value: Date | null): string {
  if (!value) return "Sin datos";
  return value.toLocaleString("es-ES");
}

export default function Procesamiento() {
  const { mode } = useDataSourceFilter();
  const [procesando, setProcesando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reservas, setReservas] = useState<ReservaFirestore[]>([]);
  const [eventos, setEventos] = useState<EventoAsistenciaFirestore[]>([]);

  const cargarDatos = useCallback(async () => {
    setProcesando(true);

    try {
      const [reservasData, eventosData] = await Promise.all([
        getReservas(),
        getEventosAsistencia(),
      ]);

      setReservas(reservasData);
      setEventos(eventosData);
    } catch (error) {
      console.error("Error cargando procesamiento:", error);
      setReservas([]);
      setEventos([]);
    } finally {
      setProcesando(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const reservasFiltradas = useMemo(() => filterBySynthetic(reservas, mode), [mode, reservas]);
  const eventosFiltrados = useMemo(() => filterBySynthetic(eventos, mode), [eventos, mode]);

  const registrosProcesados = useMemo(() => {
    return reservasFiltradas.length + eventosFiltrados.length;
  }, [eventosFiltrados.length, reservasFiltradas.length]);

  const ultimaActualizacion = useMemo(() => {
    const fechas = [
      ...reservasFiltradas.flatMap((reserva) => [toDate(reserva.fechaCreacion), toDate(reserva.ultimaActualizacion)]),
      ...eventosFiltrados.map((evento) => toDate(evento.timestamp)),
    ].filter((value): value is Date => value instanceof Date);

    if (fechas.length === 0) return null;

    return fechas.reduce((latest, current) => (current > latest ? current : latest));
  }, [eventosFiltrados, reservasFiltradas]);

  const estadoProcesamiento = useMemo(() => {
    if (loading || procesando) return "En progreso...";
    if (registrosProcesados === 0) return "Sin datos";
    return "Conectado";
  }, [loading, procesando, registrosProcesados]);

  const estadoProcesamientoClass = useMemo(() => {
    if (estadoProcesamiento === "Conectado") return "text-success";
    if (estadoProcesamiento === "Sin datos") return "text-muted-foreground";
    return "text-warning";
  }, [estadoProcesamiento]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-display font-semibold">Procesamiento de Datos</h1>

      <div className="max-w-2xl space-y-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-2">Actualización de análisis</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Ejecuta el proceso de extracción, transformación y carga de datos desde la fuente operativa (Firebase Firestore).
          </p>
          <Button onClick={() => void cargarDatos()} disabled={procesando} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${procesando ? "animate-spin" : ""}`} />
            {procesando ? "Procesando..." : "Actualizar análisis"}
          </Button>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Estado del sistema</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Última actualización</p>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Cargando..." : formatUltimaActualizacion(ultimaActualizacion)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Registros procesados</p>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Cargando..." : registrosProcesados.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`h-4 w-4 ${estadoProcesamiento === "Conectado" ? "text-success" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-medium">Estado del procesamiento</p>
                <p className={`text-sm ${estadoProcesamientoClass}`}>{estadoProcesamiento}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Pipeline de datos</h3>
          <div className="space-y-3">
            {[
              { label: "Firebase Firestore", desc: "Fuente de datos operativos", icon: Database, status: registrosProcesados > 0 ? "Conectado" : "Sin datos" },
              { label: "Proceso ETL", desc: "Extracción, transformación y carga", icon: RefreshCw, status: estadoProcesamiento },
              { label: "Modelo predictivo", desc: "Análisis de riesgo de inasistencia", icon: FileText, status: registrosProcesados > 0 ? "Datos disponibles" : "Esperando datos" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-md bg-muted/50">
                <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


