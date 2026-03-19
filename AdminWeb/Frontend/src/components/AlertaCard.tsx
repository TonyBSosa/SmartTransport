import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface AlertaCardProps {
  mensaje: string;
  severidad: "alta" | "media" | "baja";
}

const severidadConfig = {
  alta: { icon: AlertTriangle, className: "text-destructive bg-destructive/10 border-destructive/20" },
  media: { icon: AlertCircle, className: "text-warning bg-warning/10 border-warning/20" },
  baja: { icon: Info, className: "text-primary bg-primary/10 border-primary/20" },
};

export default function AlertaCard({ mensaje, severidad }: AlertaCardProps) {
  const config = severidadConfig[severidad];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-md border text-sm ${config.className}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{mensaje}</span>
    </div>
  );
}
