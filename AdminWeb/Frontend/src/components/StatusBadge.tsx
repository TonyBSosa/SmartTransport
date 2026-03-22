const statusStyles: Record<string, string> = {
  "Activa": "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold",
  "Agendada": "bg-sky-100 text-sky-800 border border-sky-300 font-semibold",
  "Cancelada": "bg-red-100 text-red-800 border border-red-300 font-semibold",
  "Pendiente": "bg-amber-100 text-amber-800 border border-amber-300 font-semibold",
  "Modificación": "bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold",
  "Solicitud de modificación": "bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold",
  "Solicitud de cancelación": "bg-orange-100 text-orange-800 border border-orange-300 font-semibold",
  "Asistió": "bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold",
  "No asistió": "bg-red-100 text-red-800 border border-red-300 font-semibold",
};

export default function StatusBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusStyles[estado] ?? "bg-slate-100 text-slate-700 border border-slate-300"}`}>
      {estado}
    </span>
  );
}
