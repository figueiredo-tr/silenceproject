"use client";

import { useMemo, useState } from "react";
import { Flame, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { RANK_INFO, rankProgress, type MissionKey } from "@/lib/types";

// ------------------------------------------------------------------
// Dados de exemplo — serão substituídos pela leitura real do Supabase
// (profiles, missions, daily_logs) assim que o login estiver ativo.
// ------------------------------------------------------------------
const MOCK_PROFILE = {
  codename: "FIGUEIREDO",
  totalXp: 1180,
  currentStreak: 6,
  longestStreak: 14,
  warningsCount: 1,
};

type MissionState = {
  key: MissionKey;
  label: string;
  target: number;
  unit: string;
  achieved: number;
  xpValue: number;
  frequencyNote?: string;
};

const MOCK_MISSIONS: MissionState[] = [
  { key: "flexoes", label: "Flexões", target: 50, unit: "reps", achieved: 50, xpValue: 15 },
  { key: "abdominais", label: "Abdominais", target: 50, unit: "reps", achieved: 32, xpValue: 15 },
  { key: "barras", label: "Barras", target: 10, unit: "reps", achieved: 0, xpValue: 20 },
  { key: "salto", label: "Salto (3x 1.85m)", target: 3, unit: "saltos", achieved: 3, xpValue: 15 },
  {
    key: "corrida_livre",
    label: "Corrida livre",
    target: 3,
    unit: "km",
    achieved: 0,
    xpValue: 15,
    frequencyNote: "3x / semana",
  },
  {
    key: "corrida_12min",
    label: "Corrida cronometrada",
    target: 2.5,
    unit: "km / 12min",
    achieved: 0,
    xpValue: 20,
    frequencyNote: "1x / semana",
  },
];

export default function Dashboard() {
  const [missions, setMissions] = useState(MOCK_MISSIONS);

  const { current, next, progressPct } = useMemo(
    () => rankProgress(MOCK_PROFILE.totalXp),
    []
  );

  const completedCount = missions.filter((m) => m.achieved >= m.target).length;
  const allCompleted = completedCount === missions.length;

  function updateAchieved(key: MissionKey, value: number) {
    setMissions((prev) =>
      prev.map((m) => (m.key === key ? { ...m, achieved: Math.max(0, value) } : m))
    );
  }

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ---------------- Cabeçalho / status do sistema ---------------- */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--cyan)] uppercase mb-1 pulse-slow">
            Sistema Online
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-700 tracking-wide text-glow uppercase">
            Projeto Silêncio
          </h1>
        </div>
        <div className="text-right font-mono text-xs text-[var(--text-dim)]">
          <p>OPERADOR: <span className="text-[var(--text-primary)]">{MOCK_PROFILE.codename}</span></p>
          <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
      </header>

      {/* ---------------- Rank + XP ---------------- */}
      <section className="bracket-frame border border-[var(--line)] bg-[var(--bg-panel)] rounded-sm p-5 sm:p-6 mb-6">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-1">
              Patente atual
            </p>
            <p className="font-[family-name:var(--font-display)] text-2xl font-600 uppercase text-[var(--cyan)]">
              {RANK_INFO[current].label}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--text-dim)] uppercase mb-1">
              XP total
            </p>
            <p className="font-mono text-xl text-[var(--text-primary)]">
              {MOCK_PROFILE.totalXp.toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="h-2 bg-[var(--bg-panel-raised)] rounded-full overflow-hidden border border-[var(--line)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--cyan-dim)] to-[var(--cyan)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="font-mono text-[11px] text-[var(--text-dim)] mt-2">
          {next
            ? `${Math.round(progressPct)}% até ${RANK_INFO[next].label}`
            : "Patente máxima atingida"}
        </p>
      </section>

      {/* ---------------- Stats rápidas ---------------- */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<Flame size={16} />}
          label="Streak atual"
          value={`${MOCK_PROFILE.currentStreak}d`}
          accent="cyan"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="Recorde streak"
          value={`${MOCK_PROFILE.longestStreak}d`}
          accent="dim"
        />
        <StatCard
          icon={<ShieldAlert size={16} />}
          label="Advertências"
          value={`${MOCK_PROFILE.warningsCount}`}
          accent={MOCK_PROFILE.warningsCount > 0 ? "red" : "dim"}
        />
      </section>

      {/* ---------------- Missões do dia ---------------- */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-600 uppercase tracking-wide flex items-center gap-2">
            <Target size={18} className="text-[var(--cyan)]" />
            Ordem de Operação — Hoje
          </h2>
          <span className="font-mono text-xs text-[var(--text-dim)]">
            {completedCount}/{missions.length} concluídas
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {missions.map((m) => (
            <MissionRow key={m.key} mission={m} onChange={updateAchieved} />
          ))}
        </div>

        {allCompleted && (
          <p className="mt-3 font-mono text-xs text-[var(--cyan)] tracking-wide">
            ✓ Todas as missões cumpridas. Operação concluída com sucesso.
          </p>
        )}
      </section>

      <p className="text-center font-mono text-[10px] text-[var(--text-faint)] tracking-[0.2em] uppercase mt-10">
        — dados de exemplo · integração com Supabase no próximo passo —
      </p>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "cyan" | "dim" | "red";
}) {
  const color =
    accent === "cyan"
      ? "text-[var(--cyan)]"
      : accent === "red"
      ? "text-[var(--red)]"
      : "text-[var(--text-dim)]";

  return (
    <div className="border border-[var(--line)] bg-[var(--bg-panel)] rounded-sm p-3 sm:p-4 flex flex-col gap-2">
      <div className={`flex items-center gap-1.5 ${color}`}>
        {icon}
        <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          {label}
        </span>
      </div>
      <p className={`font-mono text-xl ${color}`}>{value}</p>
    </div>
  );
}

function MissionRow({
  mission,
  onChange,
}: {
  mission: MissionState;
  onChange: (key: MissionKey, value: number) => void;
}) {
  const pct = Math.min(100, (mission.achieved / mission.target) * 100);
  const done = mission.achieved >= mission.target;

  return (
    <div
      className={`border rounded-sm p-3.5 flex items-center gap-4 transition-colors ${
        done
          ? "border-[var(--cyan-dim)] bg-[var(--bg-panel-raised)]"
          : "border-[var(--line)] bg-[var(--bg-panel)]"
      }`}
    >
      <button
        onClick={() => onChange(mission.key, done ? 0 : mission.target)}
        className={`shrink-0 w-6 h-6 rounded-sm border flex items-center justify-center transition-colors ${
          done
            ? "border-[var(--cyan)] bg-[var(--cyan)]/15 text-[var(--cyan)]"
            : "border-[var(--line-bright)] text-transparent"
        }`}
        aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
      >
        ✓
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="font-medium text-sm truncate">
            {mission.label}
            {mission.frequencyNote && (
              <span className="ml-2 font-mono text-[10px] text-[var(--text-dim)] uppercase">
                {mission.frequencyNote}
              </span>
            )}
          </p>
          <span className="font-mono text-xs text-[var(--text-dim)] shrink-0">
            {mission.achieved}/{mission.target} {mission.unit}
          </span>
        </div>
        <div className="h-1 bg-[var(--bg)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              done ? "bg-[var(--cyan)]" : "bg-[var(--amber)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <span className="font-mono text-[11px] text-[var(--text-dim)] shrink-0">
        +{mission.xpValue}xp
      </span>
    </div>
  );
}
