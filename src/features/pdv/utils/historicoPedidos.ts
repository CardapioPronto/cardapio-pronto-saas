import { HistoricoPedidosFiltros, HistoricoPeriodoFiltro } from "../types";

export const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const getDateRangeByPeriod = (periodo: HistoricoPeriodoFiltro) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (periodo === "ontem") {
    start.setDate(today.getDate() - 1);
    end.setDate(today.getDate() - 1);
  }

  if (periodo === "7dias") {
    start.setDate(today.getDate() - 6);
  }

  if (periodo === "mes") {
    start.setDate(1);
  }

  return {
    dataInicio: formatDateInput(start),
    dataFim: formatDateInput(end),
  };
};

export const getInitialHistoricoFiltros = (): HistoricoPedidosFiltros => ({
  periodo: "hoje",
  ...getDateRangeByPeriod("hoje"),
  status: "todos",
  pagina: 1,
  itensPorPagina: 20,
});

export const toStartOfDayIso = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
};

export const toEndOfDayIso = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
};
