"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck } from "lucide-react";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(traduzErro(error.message));
        return;
      }
      router.push("/");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(traduzErro(error.message));
        return;
      }
      setNotice(
        "Cadastro iniciado. Se a confirmação por e-mail estiver ativa no Supabase, verifique sua caixa de entrada antes de entrar."
      );
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] tracking-[0.25em] text-[var(--cyan)] uppercase mb-1 pulse-slow">
            Acesso Restrito
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-700 tracking-wide text-glow uppercase">
            Projeto Silêncio
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bracket-frame border border-[var(--line)] bg-[var(--bg-panel)] rounded-sm p-6 flex flex-col gap-4"
        >
          <div className="flex items-center gap-2 text-[var(--text-dim)] font-mono text-[11px] uppercase tracking-wide mb-1">
            <ShieldCheck size={14} className="text-[var(--cyan)]" />
            {mode === "login" ? "Identificação do operador" : "Novo cadastro"}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--text-dim)] uppercase">
              E-mail
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[var(--bg-panel-raised)] border border-[var(--line)] rounded-sm px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--cyan-dim)] transition-colors"
              placeholder="operador@dominio.com"
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-[0.15em] text-[var(--text-dim)] uppercase">
              Senha
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-[var(--bg-panel-raised)] border border-[var(--line)] rounded-sm px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--cyan-dim)] transition-colors"
              placeholder="mínimo 6 caracteres"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && (
            <p className="font-mono text-[11px] text-[var(--red)] leading-relaxed">
              {error}
            </p>
          )}
          {notice && (
            <p className="font-mono text-[11px] text-[var(--amber)] leading-relaxed">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-[var(--cyan)]/15 border border-[var(--cyan-dim)] text-[var(--cyan)] font-mono text-xs uppercase tracking-[0.15em] rounded-sm py-2.5 hover:bg-[var(--cyan)]/25 transition-colors disabled:opacity-50"
          >
            {loading
              ? "Processando..."
              : mode === "login"
              ? "Entrar no sistema"
              : "Criar cadastro"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setNotice(null);
          }}
          className="w-full text-center mt-4 font-mono text-[11px] text-[var(--text-dim)] hover:text-[var(--cyan)] transition-colors uppercase tracking-wide"
        >
          {mode === "login"
            ? "Ainda não tem cadastro? Criar operador"
            : "Já é operador? Fazer login"}
        </button>
      </div>
    </main>
  );
}

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (msg.includes("User already registered")) {
    return "Já existe um cadastro com esse e-mail.";
  }
  if (msg.includes("Password should be at least")) {
    return "A senha precisa ter no mínimo 6 caracteres.";
  }
  return msg;
}
