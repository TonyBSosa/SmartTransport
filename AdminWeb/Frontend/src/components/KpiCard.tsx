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
  default: "glassmorphism hover:shadow-[0_8px_32px_rgba(0,86,210,0.08)]",
  success: "glassmorphism hover:shadow-[0_8px_32px_rgba(16,185,129,0.08)]",
  danger: "glassmorphism hover:shadow-[0_8px_32px_rgba(239,68,68,0.08)]",
  warning: "glassmorphism hover:shadow-[0_8px_32px_rgba(245,158,11,0.08)]",
};

const iconWrapperStyles = {
  default: "text-blue-600 bg-gradient-to-br from-blue-100 to-indigo-100",
  success: "text-emerald-600 bg-gradient-to-br from-emerald-100 to-teal-100",
  danger: "text-red-600 bg-gradient-to-br from-red-100 to-rose-100",
  warning: "text-amber-600 bg-gradient-to-br from-amber-100 to-orange-100",
};

export default function KpiCard({ titulo, valor, icono, variante = "default", subtexto, className = "" }: KpiCardProps) {
  return (
    <div className={`${variantStyles[variante]} rounded-2xl p-6 transition-all duration-300 ease-out group animate-scale-in ${className}`}>
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
