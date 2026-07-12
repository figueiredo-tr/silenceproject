export type Rank =
  | "RECRUTA"
  | "SOLDADO"
  | "OPERADOR_TATICO"
  | "OPERADOR_ESPECIAL"
  | "ELITE_GIR"
  | "OPERADOR_ROTA";

export const RANK_INFO: Record<
  Rank,
  { label: string; minXp: number; order: number }
> = {
  RECRUTA: { label: "Recruta", minXp: 0, order: 1 },
  SOLDADO: { label: "Soldado", minXp: 300, order: 2 },
  OPERADOR_TATICO: { label: "Operador Tático", minXp: 800, order: 3 },
  OPERADOR_ESPECIAL: { label: "Operador Especial", minXp: 1600, order: 4 },
  ELITE_GIR: { label: "Elite GIR", minXp: 2800, order: 5 },
  OPERADOR_ROTA: { label: "Operador ROTA", minXp: 4500, order: 6 },
};

export const RANK_ORDER: Rank[] = [
  "RECRUTA",
  "SOLDADO",
  "OPERADOR_TATICO",
  "OPERADOR_ESPECIAL",
  "ELITE_GIR",
  "OPERADOR_ROTA",
];

export interface Profile {
  id: string;
  codename: string;
  rank: Rank;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  warnings_count: number;
  last_log_date: string | null;
}

export type MissionKey =
  | "flexoes"
  | "abdominais"
  | "barras"
  | "salto"
  | "corrida_livre"
  | "corrida_12min";

export interface Mission {
  id: string;
  profile_id: string;
  key: MissionKey;
  label: string;
  target: number;
  unit: string;
  weekly_frequency: number | null;
  xp_value: number;
  active: boolean;
}

export interface DailyLog {
  id: string;
  profile_id: string;
  log_date: string;
  mission_key: MissionKey;
  target: number;
  achieved: number;
  completed: boolean;
  xp_earned: number;
}

/** Calcula o rank atual a partir do XP total acumulado */
export function rankForXp(totalXp: number): Rank {
  let current: Rank = "RECRUTA";
  for (const rank of RANK_ORDER) {
    if (totalXp >= RANK_INFO[rank].minXp) current = rank;
  }
  return current;
}

/** Retorna { current, next, progressPct } para a barra de progresso de rank */
export function rankProgress(totalXp: number) {
  const current = rankForXp(totalXp);
  const currentIndex = RANK_INFO[current].order - 1;
  const next = RANK_ORDER[currentIndex + 1] ?? null;

  if (!next) {
    return { current, next: null, progressPct: 100 };
  }

  const floor = RANK_INFO[current].minXp;
  const ceil = RANK_INFO[next].minXp;
  const progressPct = Math.min(
    100,
    Math.max(0, ((totalXp - floor) / (ceil - floor)) * 100)
  );

  return { current, next, progressPct };
}
