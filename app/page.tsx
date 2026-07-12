import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";
import type { Mission, DailyLog, Profile } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: missions }, { data: todayLogs }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("missions")
        .select("*")
        .eq("profile_id", user.id)
        .eq("active", true),
      supabase
        .from("daily_logs")
        .select("*")
        .eq("profile_id", user.id)
        .eq("log_date", todayStr()),
    ]);

  return (
    <DashboardClient
      userId={user.id}
      profile={profile as Profile}
      missions={(missions ?? []) as Mission[]}
      todayLogs={(todayLogs ?? []) as DailyLog[]}
    />
  );
}
