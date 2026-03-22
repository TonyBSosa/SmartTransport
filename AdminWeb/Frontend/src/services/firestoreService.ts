import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ReservaFirestore {
  id: string;
  synthetic: boolean;
  nombre: string;
  telefono: string;
  direccion: string;
  puntoReferencia: string;
  zona: string;
  diasSemana: string[];
  horarioEntrada: string;
  horarioSalida: string;
  tipoTransporte: string;
  observaciones: string;
  estado: string;
  motivoSolicitud: string;
  fechaCreacion: unknown;
  ultimaActualizacion: unknown;
}

export interface EventoAsistenciaFirestore {
  id: string;
  synthetic: boolean;
  reservaId: string;
  fecha: string;
  estadoAsistencia: string;
  registradoPor: string;
  timestamp: unknown;
}

export interface PlanificacionTransporte {
  id: string;
  zona: string;
  hora: string;
  dia: string;
  demanda: number;
  busesNecesarios: number;
  estado: "Saturado" | "Óptimo" | "Subutilizado";
  alerta: "Agregar bus" | "Reducir capacidad" | "";
}

export interface RutaSugerida {
  id: string;
  zona: string;
  dia: string;
  hora: string;
  cantidadPasajeros: number;
}

const CAPACIDAD_BUS = 10;
const MINIMO_PASAJEROS_RUTA = 5;

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    const converted = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getStartOfCurrentWeek(reference = new Date()) {
  const current = new Date(reference);
  current.setHours(0, 0, 0, 0);

  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diffToMonday);

  return current;
}

function isReservaFromCurrentWeek(reserva: ReservaFirestore, referenceDate = new Date()) {
  const fechaCreacion = toDate(reserva.fechaCreacion);
  if (!fechaCreacion) return false;

  const startOfWeek = getStartOfCurrentWeek(referenceDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  return fechaCreacion >= startOfWeek && fechaCreacion < endOfWeek;
}

export function buildPlanificacionTransporte(reservas: ReservaFirestore[]): PlanificacionTransporte[] {
  const grouped = new Map<string, PlanificacionTransporte>();

  reservas.forEach((reserva) => {
    const dias = reserva.diasSemana.length > 0 ? reserva.diasSemana : ["Sin día"];
    const hora = reserva.horarioEntrada || "Sin hora";
    const zona = reserva.zona || "Sin zona";

    dias.forEach((dia) => {
      const key = `${zona}__${hora}__${dia}`;
      const current = grouped.get(key);

      if (current) {
        current.demanda += 1;
        current.busesNecesarios = Math.ceil(current.demanda / CAPACIDAD_BUS);
      } else {
        grouped.set(key, {
          id: key,
          zona,
          hora,
          dia,
          demanda: 1,
          busesNecesarios: 1,
          estado: "Óptimo",
          alerta: "",
        });
      }
    });
  });

  return Array.from(grouped.values())
    .map((item) => {
      const estado: PlanificacionTransporte["estado"] =
        item.demanda > CAPACIDAD_BUS
          ? "Saturado"
          : item.demanda === CAPACIDAD_BUS || item.demanda >= CAPACIDAD_BUS / 2
            ? "Óptimo"
            : "Subutilizado";

      const alerta =
        estado === "Saturado"
          ? "Agregar bus"
          : estado === "Subutilizado"
            ? "Reducir capacidad"
            : "";

      return {
        ...item,
        estado,
        alerta,
      };
    })
    .sort((a, b) =>
      a.zona.localeCompare(b.zona) ||
      a.hora.localeCompare(b.hora) ||
      a.dia.localeCompare(b.dia)
    );
}

export function buildRutasSugeridas(reservas: ReservaFirestore[]): RutaSugerida[] {
  const grouped = new Map<string, RutaSugerida>();

  reservas
    .filter((reserva) => {
      const estado = reserva.estado.toLowerCase();
      return (
        isReservaFromCurrentWeek(reserva) &&
        (estado === "agendada" || estado === "activa")
      );
    })
    .forEach((reserva) => {
      const dias = reserva.diasSemana.length > 0 ? reserva.diasSemana : [];
      const zona = reserva.zona || "Sin zona";
      const hora = reserva.horarioEntrada || "Sin hora";

      dias.forEach((dia) => {
        const key = `${zona}__${dia}__${hora}`;
        const current = grouped.get(key);

        if (current) {
          current.cantidadPasajeros += 1;
          return;
        }

        grouped.set(key, {
          id: key,
          zona,
          dia,
          hora,
          cantidadPasajeros: 1,
        });
      });
    });

  return Array.from(grouped.values())
    .filter((item) => item.cantidadPasajeros >= MINIMO_PASAJEROS_RUTA)
    .sort((a, b) =>
      b.cantidadPasajeros - a.cantidadPasajeros ||
      a.zona.localeCompare(b.zona) ||
      a.dia.localeCompare(b.dia) ||
      a.hora.localeCompare(b.hora)
    );
}

export async function getReservas(): Promise<ReservaFirestore[]> {
  const snapshot = await getDocs(collection(db, "reservas"));

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      synthetic: data.synthetic === true,
      nombre: String(data.nombre ?? ""),
      telefono: String(data.telefono ?? ""),
      direccion: String(data.direccion ?? ""),
      puntoReferencia: String(data.puntoReferencia ?? ""),
      zona: String(data.zona ?? ""),
      diasSemana: Array.isArray(data.diasSemana) ? data.diasSemana.map(String) : [],
      horarioEntrada: String(data.horarioEntrada ?? ""),
      horarioSalida: String(data.horarioSalida ?? ""),
      tipoTransporte: String(data.tipoTransporte ?? ""),
      observaciones: String(data.observaciones ?? ""),
      estado: String(data.estado ?? "Sin estado"),
      motivoSolicitud: String(data.motivoSolicitud ?? ""),
      fechaCreacion: data.fechaCreacion ?? null,
      ultimaActualizacion: data.ultimaActualizacion ?? null,
    };
  });
}

export async function getEventosAsistencia(): Promise<EventoAsistenciaFirestore[]> {
  const snapshot = await getDocs(collection(db, "eventos_asistencia"));

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      synthetic: data.synthetic === true,
      reservaId: String(data.reservaId ?? ""),
      fecha: String(data.fecha ?? ""),
      estadoAsistencia: String(data.estadoAsistencia ?? data.estado ?? ""),
      registradoPor: String(data.registradoPor ?? ""),
      timestamp: data.timestamp ?? null,
    };
  });
}

export async function getPlanificacionTransporte(): Promise<PlanificacionTransporte[]> {
  const reservas = await getReservas();
  return buildPlanificacionTransporte(reservas);
}

