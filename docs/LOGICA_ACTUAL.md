# Logica actual del sistema AXION

## 1) Big picture
- El proyecto corre como monorepo full-stack TS en un solo proceso: `server.ts`.
- Ese proceso levanta Express (API) y en desarrollo inyecta Vite middleware para servir la SPA React.
- Por eso el frontend y backend viven en el mismo origen/puerto (`3005`) y el cliente usa rutas relativas `/api/*`.
- Persistencia local en SQLite (`warzone.db`) con `better-sqlite3`.

## 2) Entradas y runtime
- Dev: `npm run dev` -> `tsx server.ts`.
- Build: `npm run build` (`tsc && vite build`).
- Produccion actual en VPS: PM2 ejecutando `server.ts` con interprete `tsx` (ver `deploy.sh`).
- Health check real: `GET /api/health`.

## 3) Modelo de datos operativo
### Tabla `users`
- PK: `google_id`.
- Campos clave: `email` (unique), `gamertag` (unique), `role` (`SUPER_ADMIN|ADMIN|PLAYER`), `avatar_url`.
- Migracion defensiva: si un schema viejo no tiene `google_id`, se reconstruye y backfill.

### Tabla `competitions`
- Guarda ligas y torneos en una sola tabla (`type: LIGA|TORNEO`).
- Relacion liga -> torneo por `parent_league_id`.
- `counts_for_league` decide si un torneo suma al acumulado de su liga.
- `rules` es JSON libre (ej. `league_mode`, `matches_per_series`).

### Tablas de equipo y juego
- `squads`: equipo por competencia.
- `squad_members`: estado del jugador en el squad (`PENDING|ACTIVE|LEFT|REJECTED`).
- `matches`: partida escaneada (`match_id`, `competition_id`, `submitted_by`, auditoria).
- `stats`: estadistica por jugador y partida con `UNIQUE(match_id, user_id)`.
- `tournament_organizers`: organizadores por torneo.
- `competition_members`: membresia por liga/torneo (rol por contexto y estado de participacion).

## 4) Flujos de negocio implementados hoy
## 4.1 Login y roles
- UI usa Google OAuth en `src/main.tsx`.
- `App.tsx` manda JWT decode a `POST /api/auth/login`.
- Backend busca usuario por `google_id` o `email`; si no existe, lo crea.
- Regla hardcoded: si email es `cristhianamador@gmail.com`, fuerza rol `SUPER_ADMIN`.
- Sesion cliente se guarda en `localStorage` bajo `axion_user`.

## 4.2 Ligas y torneos diarios
- Admin crea liga: `POST /api/leagues`.
- Admin crea torneo diario: `POST /api/tournaments` con `parent_league_id`.
- Si torneo tiene liga padre, hereda/mezcla reglas de la liga.
- Flag `counts_for_league` controla si ese torneo suma al progreso de liga.
- Al crear liga/torneo con `admin_id`, el creador queda como miembro `ADMIN` en `competition_members`.
- Nuevo flujo de ingreso: codigo/link por `invite_code` (`GET/POST /api/invites/:invite_code*`).

## 4.3 Draft de squads
- Endpoint: `POST /api/tournaments/draft`.
- Modo `RANDOM`: mezcla jugadores y arma squads de tamaño 2/3/4.
- El draft usa primero participantes activos de `competition_members`; si no hay, cae al pool global legacy.
- Modo `FIXED_SQUAD`: intenta clonar squads activos del torneo anterior de la misma liga.
- Reset operativo: `POST /api/tournaments/:id/reset-squads` borra squads y miembros del torneo.

## 4.4 Captura de pantalla -> puntos
- UI: `EscanearPartida.tsx` comprime/resize imagen y envia base64 a `/api/analyze`.
- IA server-side: Gemini (`@google/generative-ai`) con schema JSON estricto.
- Respuesta esperada: `matchId`, `position`, `totalKills`, `totalScore`, `totalDamage`, `members[]`.
- Guardado: `POST /api/matches` usa transaccion.
- En `stats`, el UPSERT usa `MAX(kills|points|damage)` para fusionar capturas parciales de la misma partida.

## 4.5 Leaderboards e historial
- Individual: `GET /api/leaderboard/individual`.
- Equipos: `GET /api/leaderboard/equipos`.
- Historial partidas: `GET /api/matches` + detalle por partida `GET /api/matches/:match_id/members`.
- Progreso por scope:
  - Global: `/api/progress/overall/:user_id`
  - Liga: `/api/progress/league/:league_id/:user_id`
  - Torneo: `/api/progress/tournament/:tournament_id/:user_id`

## 5) Vistas y responsabilidades UI
- `App.tsx` decide vista segun rol:
  - `SUPER_ADMIN`: ve `SuperAdmin` (dashboard visual + switch de vistas).
  - `ADMIN`: cae a `admin-torneo`.
  - `PLAYER`: vista usuario con tabs `equipos`, `individual`, `partidas`.
- `AdminTorneo.tsx` si esta conectado a endpoints reales (`/api/leagues`, `/api/tournaments`, `/api/admin/overview`, draft/reset).
- `App.tsx` muestra bloque de "Mis ligas y torneos", permite unirse por codigo y auto-join por URL `?join=CODIGO`.
- `AdminTorneo.tsx` incluye lobby operativo con participantes activos por torneo (polling simple).

## 6) Convenciones tecnicas observables
- SQL inline directo desde `server.ts`/`db.ts`.
- Respuesta de error simple `{ error: string }`.
- Sin framework de auth server-side aparte del login inicial por Google.
- Estilo mixto ES/EN en nombres, labels, logs.

## 7) Limitaciones y deuda actual (importante)
- `EscanearPartida.tsx` ya envia `submitted_by` y `competition_id` cuando estan disponibles.
- Si el usuario no tiene squad activo, `competition_id` puede seguir llegando vacio y backend cae a default `competition_id=1`.
- `GET /api/matches` actualmente fija `mode='Resurgimiento'` y `position='1st'` (no siempre representa la partida real).
- `SuperAdmin.tsx` usa metricas mayormente estaticas, no datos live del backend.
- Existen archivos legacy/experimentales (`src/server/whatsapp.ts`, `src/server/gemini.ts`) fuera del flujo principal Express.
- `test-api.js` usa puerto 3000, pero runtime real es 3005.

## 8) Variables e integraciones
- `GEMINI_API_KEY` necesaria para `/api/analyze`.
- `APP_URL` se usa en flujos de WhatsApp.
- `GOOGLE_CLIENT_ID` esta hardcodeado en `src/main.tsx`.

## 9) Migracion de datos a PostgreSQL (ya preparada)
- Script principal: `scripts/migrate-sqlite-to-pg.ts`.
- Esquema destino: `scripts/pg-schema.sql`.
- Verificacion de conteos: `scripts/verify-sqlite-pg-counts.ts`.
- Variables:
  - `DATABASE_URL=postgres://user:pass@host:5432/db`
  - `SQLITE_PATH=/ruta/warzone.db` (opcional)
  - `PGSSL_NO_VERIFY=1` (opcional para SSL no estricto)
  - `MIGRATION_BATCH_SIZE=500` (opcional)
- Comandos:
  - `npm run migrate:pg`
  - `npm run verify:pg`

## 10) Archivos que debes leer primero para tocar negocio
1. `server.ts`
2. `src/server/db.ts`
3. `src/App.tsx`
4. `src/components/AdminTorneo.tsx`
5. `src/components/EscanearPartida.tsx`
6. `src/components/Equipos.tsx`
7. `src/components/Individual.tsx`
8. `src/components/Partidas.tsx`

