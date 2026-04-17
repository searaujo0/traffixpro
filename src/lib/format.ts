export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const brlPrecise = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

export const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

export const dateBR = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};
