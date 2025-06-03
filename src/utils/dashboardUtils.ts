
export const calcularPercentual = (anterior: number, atual: number) => {
  if (anterior === 0 && atual > 0) return "+100%";
  if (anterior === 0 && atual === 0) return "0%";
  const diff = ((atual - anterior) / anterior) * 100;
  const prefix = diff > 0 ? "+" : "";
  return `${prefix}${diff.toFixed(0)}%`;
};

export const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
