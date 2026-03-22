import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface AlertaCardProps {
  mensaje: string;
  severidad: "alta" | "media" | "baja";
}

const severidadConfig = {
  alta: {
    icon: AlertTriangle,
    className: "bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-300/60 text-red-900",
    iconClass: "text-red-600 bg-red-100"
  },
  media: {
    icon: AlertCircle,
    className: "bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-300/60 text-amber-900",
    iconClass: "text-amber-600 bg-amber-100"
  },
  baja: {
    icon: Info,
    className: "bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-300/60 text-blue-900",
    iconClass: "text-blue-600 bg-blue-100"
  },
};

export default function AlertaCard({ mensaje, severidad }: AlertaCardProps) {
  const config = severidadConfig[severidad];
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl ${config.className} shadow-sm hover:shadow-md transition-all duration-200 group`}>
      <div className={`p-2 rounded-lg ${config.iconClass} flex-shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm block">{mensaje}</span>
      </div>
    </div>
  );
}
