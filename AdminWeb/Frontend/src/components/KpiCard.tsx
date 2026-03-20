import { ReactNode } from "react";

interface KpiCardProps {
  titulo: string;
  valor: string | number;
  icono: ReactNode;
  variante?: "default" | "success" | "danger" | "warning";
  subtexto?: string;
  className?: string;
}

const variantStyles = {
  default: "bg-gradient-to-br from-white via-blue-50/30 to-indigo-50 border border-blue-100/50 hover:border-blue-200/70",
  success: "bg-gradient-to-br from-emerald-50 via-green-50/40 to-teal-50 border border-emerald-200/50 hover:border-emerald-300/70",
  danger: "bg-gradient-to-br from-rose-50 via-red-50/40 to-red-100 border border-red-200/50 hover:border-red-300/70",
  warning: "bg-gradient-to-br from-amber-50 via-yellow-50/40 to-orange-50 border border-amber-200/50 hover:border-amber-300/70",
};

const iconWrapperStyles = {
  default: "text-blue-600 bg-gradient-to-br from-blue-100 to-indigo-100",
  success: "text-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100",
  danger: "text-red-600 bg-gradient-to-br from-red-100 to-rose-100",
  warning: "text-amber-600 bg-gradient-to-br from-amber-100 to-orange-100",
};

export default function KpiCard({ titulo, valor, icono, variante = "default", subtexto, className = "" }: KpiCardProps) {
  return (
    <div className={`${variantStyles[variante]} rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 ease-out group ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700 truncate group-hover:text-gray-900 transition-colors">{titulo}</p>
          <div className="mt-3 mb-2">
            <p className="text-3xl lg:text-4xl font-display font-bold text-gray-900 leading-tight">{valor}</p>
          </div>
          {subtexto && (
            <p className="text-xs text-gray-600 font-medium opacity-75 group-hover:opacity-100 transition-opacity">{subtexto}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${iconWrapperStyles[variante]} shadow-md flex-shrink-0`}>
          {icono}
        </div>
      </div>
    </div>
  );
}
