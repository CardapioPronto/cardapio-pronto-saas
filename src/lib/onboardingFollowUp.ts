/**
 * Rotina de acompanhamento dos primeiros 7 dias (Bloco M8).
 * Funcoes puras: nao acessam Supabase nem o DOM.
 */

export type FollowUpTaskId =
  | "d0-ativacao"
  | "d1-cardapio"
  | "d2-pedido-teste"
  | "d3-equipe"
  | "d5-canais"
  | "d7-revisao";

export type FollowUpTaskStatus = "done" | "today" | "late" | "upcoming";

export interface FollowUpSignals {
  /** Dados basicos do restaurante preenchidos. */
  profileCompleted: boolean;
  /** Ao menos um produto disponivel cadastrado. */
  hasProducts: boolean;
  /** Cardapio publico ativo com slug. */
  publicMenuActive: boolean;
  /** Ja existe pedido registrado (teste ou real). */
  hasAnyOrder: boolean;
  /** Equipe treinada / etapa marcada manualmente. */
  teamTrained: boolean;
  /** Algum canal extra ligado: WhatsApp, iFood ou pagamento online. */
  extraChannelReady: boolean;
  /** Pedido criado nos ultimos dias (operacao real rodando). */
  hasRecentOrders: boolean;
}

export interface FollowUpTask {
  id: FollowUpTaskId;
  day: number;
  title: string;
  description: string;
  action: string;
  href: string;
  done: boolean;
  status: FollowUpTaskStatus;
  dueDate: Date;
}

export interface FollowUpPlan {
  /** Dias completos desde a criacao da conta (0 = dia de hoje). */
  dayIndex: number;
  tasks: FollowUpTask[];
  completed: number;
  total: number;
  progressPercent: number;
  currentTask: FollowUpTask | null;
  lateTasks: FollowUpTask[];
  /** Passou dos 7 dias de acompanhamento. */
  windowClosed: boolean;
  summary: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TASK_DEFINITIONS: Array<{
  id: FollowUpTaskId;
  day: number;
  title: string;
  description: string;
  action: string;
  href: string;
  done: (signals: FollowUpSignals) => boolean;
}> = [
  {
    id: "d0-ativacao",
    day: 0,
    title: "Dia 0 — Ativar a conta",
    description: "Completar dados do restaurante, horarios e contato.",
    action: "Abrir configuracoes",
    href: "/configuracoes",
    done: (s) => s.profileCompleted,
  },
  {
    id: "d1-cardapio",
    day: 1,
    title: "Dia 1 — Subir o cardapio",
    description: "Cadastrar categorias e produtos ou usar importacao/setup rapido.",
    action: "Abrir produtos",
    href: "/produtos",
    done: (s) => s.hasProducts,
  },
  {
    id: "d2-pedido-teste",
    day: 2,
    title: "Dia 2 — Publicar e testar",
    description: "Ativar o cardapio publico e fazer um pedido de teste ponta a ponta.",
    action: "Abrir cardapio digital",
    href: "/cardapio-digital",
    done: (s) => s.publicMenuActive && s.hasAnyOrder,
  },
  {
    id: "d3-equipe",
    day: 3,
    title: "Dia 3 — Treinar a equipe",
    description: "Cadastrar funcionarios, permissoes e rodar PDV e cozinha com o time.",
    action: "Abrir equipe",
    href: "/funcionarios",
    done: (s) => s.teamTrained,
  },
  {
    id: "d5-canais",
    day: 5,
    title: "Dia 5 — Ligar canais de venda",
    description: "Conectar WhatsApp, pagamento online ou iFood conforme o plano.",
    action: "Abrir atendimento",
    href: "/atendimento",
    done: (s) => s.extraChannelReady,
  },
  {
    id: "d7-revisao",
    day: 7,
    title: "Dia 7 — Revisao da primeira semana",
    description: "Conferir pedidos reais, relatorios e ajustar o que travou a operacao.",
    action: "Abrir relatorios",
    href: "/relatorios",
    done: (s) => s.hasRecentOrders,
  },
];

export function daysSince(createdAt: Date | string, now: Date = new Date()): number {
  const start = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  if (Number.isNaN(start.getTime())) return 0;
  const diff = Math.floor((now.getTime() - start.getTime()) / MS_PER_DAY);
  return diff < 0 ? 0 : diff;
}

export function buildFirstWeekFollowUp(
  createdAt: Date | string,
  signals: FollowUpSignals,
  now: Date = new Date(),
): FollowUpPlan {
  const start = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const validStart = Number.isNaN(start.getTime()) ? now : start;
  const dayIndex = daysSince(validStart, now);

  const tasks: FollowUpTask[] = TASK_DEFINITIONS.map((definition) => {
    const done = definition.done(signals);
    const dueDate = new Date(validStart.getTime() + definition.day * MS_PER_DAY);

    let status: FollowUpTaskStatus;
    if (done) status = "done";
    else if (definition.day > dayIndex) status = "upcoming";
    else if (definition.day === dayIndex) status = "today";
    else status = "late";

    return {
      id: definition.id,
      day: definition.day,
      title: definition.title,
      description: definition.description,
      action: definition.action,
      href: definition.href,
      done,
      status,
      dueDate,
    };
  });

  const completed = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const lateTasks = tasks.filter((task) => task.status === "late");
  const currentTask =
    tasks.find((task) => task.status === "late") ??
    tasks.find((task) => task.status === "today") ??
    tasks.find((task) => task.status === "upcoming") ??
    null;

  const windowClosed = dayIndex > 7;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

  let summary: string;
  if (completed === total) {
    summary = "Primeira semana concluida: operacao pronta para seguir sozinha.";
  } else if (lateTasks.length > 0) {
    summary = `${lateTasks.length} etapa(s) atrasada(s) na primeira semana. Priorize: ${lateTasks[0].title}.`;
  } else if (windowClosed) {
    summary = "Janela de 7 dias encerrada com etapas pendentes. Agende um acompanhamento com o cliente.";
  } else {
    summary = `Dia ${dayIndex} de acompanhamento. Proximo passo: ${currentTask?.title ?? "revisao final"}.`;
  }

  return {
    dayIndex,
    tasks,
    completed,
    total,
    progressPercent,
    currentTask,
    lateTasks,
    windowClosed,
    summary,
  };
}
