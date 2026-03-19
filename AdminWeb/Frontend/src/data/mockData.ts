export interface Reserva {
  id: string;
  nombre: string;
  telefono: string;
  zona: string;
  diasReservados: string[];
  horarioEntrada: string;
  horarioSalida: string;
  tipoTransporte: string;
  estado: "Activa" | "Cancelada" | "Pendiente" | "Modificación";
  fechaCreacion: string;
}

export interface EventoAsistencia {
  id: string;
  reservaId: string;
  nombreEmpleado: string;
  fecha: string;
  estado: "Asistió" | "No asistió";
  registradoPor: string;
  timestamp: string;
}

export const zonas = ["Norte", "Sur", "Este", "Oeste", "Centro"];
export const estados = ["Activa", "Cancelada", "Pendiente", "Modificación"];
export const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

const nombres = [
  "Carlos García", "María López", "Juan Hernández", "Ana Martínez", "Pedro Sánchez",
  "Laura Ramírez", "Diego Torres", "Sofía Morales", "Andrés Castillo", "Valentina Rojas",
  "Roberto Díaz", "Camila Vargas", "Fernando Reyes", "Isabella Cruz", "Miguel Flores",
  "Daniela Ortega", "Alejandro Ríos", "Gabriela Mendoza", "Javier Peña", "Natalia Guzmán",
];

export const reservas: Reserva[] = nombres.map((nombre, i) => ({
  id: `RES-${String(i + 1).padStart(3, "0")}`,
  nombre,
  telefono: `+52 ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)}`,
  zona: zonas[i % zonas.length],
  diasReservados: diasSemana.slice(0, 3 + (i % 3)),
  horarioEntrada: ["06:00", "07:00", "08:00", "09:00"][i % 4],
  horarioSalida: ["15:00", "16:00", "17:00", "18:00"][i % 4],
  tipoTransporte: i % 3 === 0 ? "Van" : i % 3 === 1 ? "Autobús" : "Camioneta",
  estado: (["Activa", "Activa", "Activa", "Cancelada", "Pendiente", "Modificación"] as Reserva["estado"][])[i % 6],
  fechaCreacion: `2026-03-${String(Math.max(1, 18 - i)).padStart(2, "0")}`,
}));

export const eventosAsistencia: EventoAsistencia[] = [];
for (let d = 0; d < 7; d++) {
  const fecha = `2026-03-${String(18 - d).padStart(2, "0")}`;
  reservas.filter(r => r.estado === "Activa").forEach((r, i) => {
    eventosAsistencia.push({
      id: `EVT-${String(eventosAsistencia.length + 1).padStart(4, "0")}`,
      reservaId: r.id,
      nombreEmpleado: r.nombre,
      fecha,
      estado: Math.random() > 0.2 ? "Asistió" : "No asistió",
      registradoPor: ["Op. Martínez", "Op. Rodríguez", "Op. Silva"][i % 3],
      timestamp: `${fecha}T${r.horarioEntrada}:00`,
    });
  });
}

export const kpis = {
  reservasHoy: reservas.filter(r => r.estado === "Activa").length,
  asistencias: eventosAsistencia.filter(e => e.fecha === "2026-03-18" && e.estado === "Asistió").length,
  noAsistencias: eventosAsistencia.filter(e => e.fecha === "2026-03-18" && e.estado === "No asistió").length,
  cancelaciones: reservas.filter(r => r.estado === "Cancelada").length,
  get tasaAsistencia() { return this.asistencias + this.noAsistencias > 0 ? Math.round((this.asistencias / (this.asistencias + this.noAsistencias)) * 100) : 0; },
  get tasaInasistencia() { return 100 - this.tasaAsistencia; },
};

export const inasistenciasPorDia = [
  { dia: "Lun", cantidad: 3 },
  { dia: "Mar", cantidad: 5 },
  { dia: "Mié", cantidad: 2 },
  { dia: "Jue", cantidad: 7 },
  { dia: "Vie", cantidad: 4 },
  { dia: "Sáb", cantidad: 1 },
  { dia: "Dom", cantidad: 0 },
];

export const demandaPorZona = zonas.map(z => ({
  zona: z,
  cantidad: reservas.filter(r => r.zona === z).length,
}));

export const demandaPorHorario = ["06:00", "07:00", "08:00", "09:00"].map(h => ({
  horario: h,
  cantidad: reservas.filter(r => r.horarioEntrada === h).length,
}));

export const tendenciaSemanal = [
  { semana: "Sem 1", inasistencias: 8 },
  { semana: "Sem 2", inasistencias: 12 },
  { semana: "Sem 3", inasistencias: 6 },
  { semana: "Sem 4", inasistencias: 15 },
];

export const alertas = [
  { tipo: "reincidente", mensaje: "Carlos García acumula 5 inasistencias este mes", severidad: "alta" as const },
  { tipo: "baja_demanda", mensaje: "La zona Oeste tiene solo 2 reservas activas", severidad: "media" as const },
  { tipo: "pendiente", mensaje: "3 solicitudes de cancelación pendientes de aprobación", severidad: "baja" as const },
  { tipo: "reincidente", mensaje: "Pedro Sánchez no se ha presentado en 3 días consecutivos", severidad: "alta" as const },
];

export const topInasistencias = [
  { nombre: "Carlos García", zona: "Norte", inasistencias: 5 },
  { nombre: "Pedro Sánchez", zona: "Sur", inasistencias: 4 },
  { nombre: "Laura Ramírez", zona: "Este", inasistencias: 3 },
  { nombre: "Diego Torres", zona: "Oeste", inasistencias: 3 },
  { nombre: "Fernando Reyes", zona: "Centro", inasistencias: 2 },
];

export const recomendaciones = [
  { titulo: "Consolidar zona Oeste", descripcion: "La zona Oeste presenta baja ocupación (2 reservas) y podría consolidarse con la zona Sur para optimizar recursos.", icono: "route" as const },
  { titulo: "Alerta de reincidencia", descripcion: "Existen 3 usuarios con alta reincidencia de inasistencia. Se recomienda contactar a sus supervisores directos.", icono: "users" as const },
  { titulo: "Concentración horaria", descripcion: "El 60% de la demanda se concentra en el horario de entrada 08:00. Considerar agregar unidades adicionales.", icono: "clock" as const },
  { titulo: "Optimización de rutas", descripcion: "Las rutas del sector Norte pueden reorganizarse para reducir tiempos de traslado en un 15% estimado.", icono: "trending" as const },
];
