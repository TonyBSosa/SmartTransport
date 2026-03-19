import { ReactNode } from "react";

interface KpiCardProps {
  titulo: string;
  valor: string | number;
  icono: ReactNode;
  variante?: "default" | "success" | "danger" | "warning";
  subtexto?: string;
}

const variantStyles = {
  default: "bg-card",
  success: "bg-card border-l-4 border-l-success",
  danger: "bg-card border-l-4 border-l-destructive",
  warning: "bg-card border-l-4 border-l-warning",
};

export default function KpiCard({ titulo, valor, icono, variante = "default", subtexto }: KpiCardProps) {
  return (
    <div className={`${variantStyles[variante]} rounded-lg border border-border p-5 shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{titulo}</span>
        <div className="text-muted-foreground">{icono}</div>
      </div>
      <p className="text-2xl font-display font-semibold text-foreground">{valor}</p>
      {subtexto && <p className="text-xs text-muted-foreground mt-1">{subtexto}</p>}
    </div>
  );
}
