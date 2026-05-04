import { usePermissions } from "@/hooks/usePermissions";
import { brl, brlPrecise } from "@/lib/format";

/**
 * Renderiza um valor em BRL respeitando a permissão.
 * Para social_media, esconde o valor (mostra "—").
 */
export function Money({
  value,
  precise = false,
  hidden = "—",
  className,
}: {
  value: number | null | undefined;
  precise?: boolean;
  hidden?: string;
  className?: string;
}) {
  const { canSeeMoney } = usePermissions();
  if (!canSeeMoney) return <span className={className}>{hidden}</span>;
  const v = typeof value === "number" ? value : 0;
  return <span className={className}>{precise ? brlPrecise(v) : brl(v)}</span>;
}
