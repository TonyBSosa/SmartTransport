const statusStyles: Record<string, string> = {
  "Activa": "bg-success/10 text-success",
  "Agendada": "bg-success/10 text-success",
  "Cancelada": "bg-destructive/10 text-destructive",
  "Pendiente": "bg-warning/10 text-warning",
  "Modificación": "bg-primary/10 text-primary",
  "Solicitud de modificación": "bg-primary/10 text-primary",
  "Solicitud de cancelación": "bg-warning/10 text-warning",
  "Asistió": "bg-success/10 text-success",
  "No asistió": "bg-destructive/10 text-destructive",
};

export default function StatusBadge({ estado }: { estado: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[estado] ?? "bg-muted text-muted-foreground"}`}>
      {estado}
    </span>
  );
}
