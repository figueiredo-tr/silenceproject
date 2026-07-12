# Projeto Silêncio

Sistema tático de preparação física para o TAF da PPMG — RPG de progressão (XP, patentes,
streak, advertências) em cima de missões diárias de treino, misturando a estética de
sistema do Solo Leveling com a hierarquia de operações da ROTA/GIR.

## Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (auth + Postgres)
- Recharts (gráficos de evolução)
- lucide-react (ícones)

## Setup local

```bash
npm install
npm run dev
```

Abra http://localhost:3000

## Configurar o Supabase

1. No painel do Supabase, vá em **SQL Editor** e rode o conteúdo de `supabase/schema.sql`.
   Isso cria as tabelas (`profiles`, `missions`, `daily_logs`, `xp_events`, `warnings`,
   `rank_thresholds`), as políticas de RLS e o trigger que gera automaticamente o perfil
   + as 6 missões padrão quando um novo operador se cadastra.
2. Em **Authentication > Providers**, habilite o método de login que preferir (recomendo
   Email/senha pra começar; dá pra adicionar Google depois).
3. As variáveis de ambiente já estão em `.env.local` (não versionado):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Ao fazer o deploy na Vercel, adicione essas mesmas duas variáveis em
**Project Settings > Environment Variables**.

## Estado atual

- [x] Schema SQL completo (perfil, missões, logs, XP, streak, advertências, ranks)
- [x] Dashboard (HUD) com dados de exemplo — rank, XP, streak, missões do dia
- [ ] Autenticação (login/cadastro)
- [ ] Conectar o dashboard aos dados reais do Supabase
- [ ] Página de check-in das missões (salvar `daily_logs` + calcular XP/streak/penalidades)
- [ ] Página de progresso (gráficos com Recharts)
- [ ] Alertas por email (Resend) e WhatsApp (CallMeBot)

## Ranks

| Rank | XP mínimo |
|---|---|
| Recruta | 0 |
| Soldado | 300 |
| Operador Tático | 800 |
| Operador Especial | 1600 |
| Elite GIR | 2800 |
| Operador ROTA | 4500 |

Os valores de `xp_value` de cada missão e os limites de XP por rank estão em
`supabase/schema.sql` e `lib/types/index.ts` — ajuste livremente conforme a evolução.

## Missões padrão

| Missão | Meta | Frequência | XP |
|---|---|---|---|
| Flexões | 50 | diária | 15 |
| Abdominais | 50 | diária | 15 |
| Barras | 10 | diária | 20 |
| Salto | 3x 1.85m | diária | 15 |
| Corrida livre | 3km | 3x/semana | 15 |
| Corrida cronometrada | 2.500m/12min | 1x/semana | 20 |

Meta final de referência (TAF): 31 abdominais/1min, 16 flexões, 3 barras,
salto 1.80m, 2.400m em 12min.
