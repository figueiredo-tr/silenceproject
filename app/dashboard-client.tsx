"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, LogOut, Repeat, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  RANK_INFO,
  rankForXp,
  rankProgress,
  type DailyLog,
  type Mission,
  type Profile,
} from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

type Props = {
  userId: string;
  profile: Profile;
  missions: Mission[];
  todayLogs: DailyLog[];
};

type MissionState = Mission & {
  achieved: number;
  completed: boolean;
};

export default function DashboardClient({ userId, profile, missions, todayLogs }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [totalXp, setTotalXp] = useState(profile.total_xp);
  const [currentStreak, setCurrentStreak] = useState(profile.current_streak);
  const [longestStreak, setLongestStreak] = useState(profile.longest_streak);
  const [warningsCount] = useState(profile.warnings_count);

  const [missionState, setMissionState] = useState<MissionState[]>(() =>
    missions.map((m) => {
      const log = todayLogs.find((l) => l.mission_key === m.key);
      return {
        ...m,
        achieved: log?.achieved ?? 0,
        completed: log?.completed ?? false,
      };
    })
  );

  const { current, next, progressPct } = rankProgress(totalXp);

  // Missões diárias (sem frequência semanal) são as únicas que contam pra
  // "dia concluído", streak e advertências. As de corrida (3x/semana e
  // 1x/semana) rendem XP normalmente, mas não travam nem quebram o dia.
  const dailyMissions = missionState.filter((m) => !m.weekly_frequency);
  const weeklyMissions = missionState.filter((m) => m.weekly_frequency);

  const completedCount = dailyMissions.filter((m) => m.completed).length;
  const allCompleted = dailyMissions.length > 0 && completedCount === dailyMissions.length;

  async function toggleMission(mission: MissionState) {
    const willComplete = !mission.completed;
    const newAchieved = willComplete ? mission.target : 0;
    const newXpEarned = willComplete ? mission.xp_value : 0;
    const xpDelta = newXpEarned - (mission.completed ? mission.xp_value : 0);

    // otimista: atualiza a tela antes de esperar a resposta do servidor
    setMissionState((prev) =>
      prev.map((m) =>
        m.key === mission.key
          ? { ...m, achieved: newAchieved, completed: willComplete }
          : m
      )
    );
    setTotalXp((v) => Math.max(0, v + xpDelta));

    startTransition(async () => {
      const today = todayStr();

      await supabase.from("daily_logs").upsert(
        {
          profile_id: userId,
          log_date: today,
          mission_key: mission.key,
          target: mission.target,
          achieved: newAchieved,
          completed: willComplete,
          xp_earned: newXpEarned,
        },
        { onConflict: "profile_id,log_date,mission_key" }
      );

      await supabase.from("xp_events").insert({
        profile_id: userId,
        event_date: today,
        delta: xpDelta,
        reason: willComplete ? "missao_cumprida" : "ajuste_manual",
      });

      const newTotalXp = Math.max(0, totalXp + xpDelta);
      const newRank = rankForXp(newTotalXp);

      const isWeeklyMission = Boolean(mission.weekly_frequency);
      const dailyMissionsAfterToggle = missionState.filter(
        (m) => !m.weekly_frequency
      );
      const willAllComplete =
        dailyMissionsAfterToggle.length > 0 &&
        dailyMissionsAfterToggle.filter((m) =>
          !isWeeklyMission && m.key === mission.key ? willComplete : m.completed
        ).length === dailyMissionsAfterToggle.length;

      let updatedStreak = currentStreak;
      let updatedLongest = longestStreak;
      let updatedLastLogDate = profile.last_log_date;

      if (willAllComplete && profile.last_log_date !== today) {
        updatedStreak =
          profile.last_log_date === yesterdayStr() ? currentStreak + 1 : 1;
        updatedLongest = Math.max(longestStreak, updatedStreak);
        updatedLastLogDate = today;
        setCurrentStreak(updatedStreak);
        setLongestStreak(updatedLongest);
      }

      await supabase
        .from("profiles")
        .update({
          total_xp: newTotalXp,
          rank: newRank,
          current_streak: updatedStreak,
          longest_streak: updatedLongest,
          last_log_date: updatedLastLogDate,
        })
        .eq("id", userId);
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ---------------- Cabeçalho / status do sistema ---------------- */}
      <header className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--cyan)] uppercase mb-1 pulse-slow">
            Sistema Online
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-700 tracking-wide text-glow uppercase">
            Projeto Silêncio
          </h1>
        </div>
        <div className="text-right font-mono text-xs text-[var(--text-dim)] flex flex-col items-end gap-2">
          <div>
            <p>OPERADOR: <span className="text-[var(--text-primary)]">{profile.codename}</span></p>
            <p>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-[var(--text-dim)] hover:text-[var(--red)] transition-colors uppercase tracking-wide"
          >
            <LogOut size={12} /> Sair
          </button>
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
              {totalXp.toLocaleString("pt-BR")}
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
        <StatCard icon={<Flame size={16} />} label="Streak atual" value={`${currentStreak}d`} accent="cyan" />
        <StatCard icon={<TrendingUp size={16} />} label="Recorde streak" value={`${longestStreak}d`} accent="dim" />
        <StatCard
          icon={<ShieldAlert size={16} />}
          label="Advertências"
          value={`${warningsCount}`}
          accent={warningsCount > 0 ? "red" : "dim"}
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
            {completedCount}/{dailyMissions.length} concluídas
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {dailyMissions.map((m) => (
            <MissionRow key={m.key} mission={m} onToggle={toggleMission} disabled={isPending} />
          ))}
        </div>

        {allCompleted && (
          <p className="mt-3 font-mono text-xs text-[var(--cyan)] tracking-wide">
            ✓ Todas as missões cumpridas. Operação concluída com sucesso.
          </p>
        )}
      </section>

      {/* ---------------- Missões semanais (corrida) ---------------- */}
      {weeklyMissions.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-600 uppercase tracking-wide flex items-center gap-2">
              <Repeat size={18} className="text-[var(--amber)]" />
              Missões Semanais
            </h2>
            <span className="font-mono text-xs text-[var(--text-dim)]">
              não afetam a streak diária
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {weeklyMissions.map((m) => (
              <MissionRow key={m.key} mission={m} onToggle={toggleMission} disabled={isPending} />
            ))}
          </div>
        </section>
      )}
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
  onToggle,
  disabled,
}: {
  mission: MissionState;
  onToggle: (mission: MissionState) => void;
  disabled: boolean;
}) {
  const pct = Math.min(100, (mission.achieved / mission.target) * 100);
  const done = mission.completed;

  return (
    <div
      className={`border rounded-sm p-3.5 flex items-center gap-4 transition-colors ${
        done
          ? "border-[var(--cyan-dim)] bg-[var(--bg-panel-raised)]"
          : "border-[var(--line)] bg-[var(--bg-panel)]"
      }`}
    >
      <button
        onClick={() => onToggle(mission)}
        disabled={disabled}
        className={`shrink-0 w-6 h-6 rounded-sm border flex items-center justify-center transition-colors disabled:opacity-50 ${
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
            {mission.weekly_frequency && (
              <span className="ml-2 font-mono text-[10px] text-[var(--text-dim)] uppercase">
                {mission.weekly_frequency}x / semana
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
        +{mission.xp_value}xp
      </span>
    </div>
  );
}
