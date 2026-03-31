# AGENTS.md - Guía para Agentes IA

## Panorama Rápido
- **Stack real**: Un solo proceso `server.ts` corre Express + API + Vite middleware en dev.
- **Puerto real local**: `3005` (`npm run dev` ejecuta `tsx server.ts`).
- **Frontend**: React en `src/` consume rutas relativas `/api/*`.
- **BD**: ⭐ **AGNÓSTICA** - SQLite (`warzone.db`) o PostgreSQL (Contabo) vía `dbAdapter.ts`.
- **Activación PostgreSQL**: `DB_CORE_PG=1` + `DATABASE_URL` en `.env`.
- **Capa DB**: `src/server/dbAdapter.ts` abstrae queries entre SQLite y PostgreSQL.

## Arquitectura Actual (Post-Migración)
- **DB Layer**: `src/server/dbAdapter.ts` es la capa agnóstica - determina SQLite o PostgreSQL según `.env`.
  - Si `DB_CORE_PG=1` → Usa pool PostgreSQL (Contabo vía `pg` npm)
  - Si no → Usa SQLite `warzone.db` (via `better-sqlite3`)
  - **Ventaja**: Queries se escriben UNA SOLA VEZ y funcionan en ambas BDs
- `server.ts` centraliza boot (inicializa BD según config), endpoints, IA (`/api/analyze`), guardado.
- `src/server/db.ts` define schema SQLite + migraciones legacy (phone → google_id).
- `scripts/pg-schema.sql` define schema PostgreSQL (idéntico a SQLite).
- `src/App.tsx` controla sesión (`localStorage: axion_user`), roles y vistas.
- `src/main.tsx` integra Google OAuth.
- `SuperAdmin` launcher; operación real en `AdminTorneo` + API.

## Modelo de negocio implementado
- Entidad unica `competitions` con tipos `LIGA` y `TORNEO`.
- Un torneo puede colgar de una liga (`parent_league_id`) y opcionalmente contar a la liga (`counts_for_league`).
- Modo de liga en `rules.league_mode`: `RANDOM` (squads nuevos) o `FIXED_SQUAD` (clona squads del torneo previo).
- Membresia por contexto en `competition_members` (rol por competencia: `ADMIN`, `ORGANIZER`, `PLAYER`).
- Progreso disponible en 3 scopes: global, por liga, por torneo (`/api/progress/*`).

## Flujos E2E clave
- Login: `GoogleLogin` -> `POST /api/auth/login` -> upsert user por `google_id/email`.
- Rol `SUPER_ADMIN` se fuerza por email fijo en backend: `cristhianamador@gmail.com`.
- Escaneo: `EscanearPartida.tsx` -> `src/services/gemini.ts` -> `POST /api/analyze` -> `POST /api/matches`.
- Join por invitacion: `?join=CODIGO` o input manual -> `POST /api/invites/:invite_code/join`.
- Guardado de stats usa transaccion + UPSERT (`ON CONFLICT(match_id, user_id)`) con `MAX(...)` para fusionar capturas parciales.
- Squads: crear, invitar, aceptar (`/api/squads*`), estado en `squad_members` (`PENDING`, `ACTIVE`, `LEFT`, `REJECTED`).

## Endpoints operativos importantes
- Salud: `GET /api/health`.
- Ligas/Torneos: `POST/GET /api/leagues`, `POST/GET /api/tournaments`, `POST /api/tournaments/draft`, `POST /api/tournaments/:id/reset-squads`.
- Invitaciones/membresias: `GET /api/invites/:invite_code`, `POST /api/invites/:invite_code/join`, `GET /api/users/:user_id/competitions`, `GET /api/competitions/:id/participants`.
- Admin operativo: `GET /api/admin/overview`.
- Progreso: `GET /api/progress/overall/:user_id`, `/league/:league_id/:user_id`, `/tournament/:tournament_id/:user_id`.
- Resultado/juego: `POST /api/analyze`, `POST /api/matches`, `GET /api/matches`, `GET /api/matches/:match_id/members`.

## Convenciones del Proyecto
- **Idioma**: Mixto ES/EN; mantener consistencia por archivo.
- **SQL Agnóstico**: 
  ```typescript
  import { getDbAdapter, withTransaction } from './src/server/dbAdapter';
  const adapter = getDbAdapter();
  const user = await adapter.get("SELECT * FROM users WHERE google_id = ?", [id]);
  const users = await adapter.all("SELECT * FROM users", []);
  await adapter.run("INSERT INTO users (...) VALUES (...)", [...]); 
  ```
- **Transacciones** (ambas BDs):
  ```typescript
  await withTransaction(async (adapter) => {
    await adapter.run("INSERT ...", [...]);
    await adapter.run("INSERT ...", [...]);
    // Auto-rollback si falla algo
  });
  ```
- **No ORM** ni capa repository - queries inline.
- **Errores API**: `{ error: string }` + `500` (local) o `400` (validación).
- **Payloads**: Max 50MB; cliente reduce imagen antes de enviar JSON.
- **Never** `db.prepare()` directo en backend - usar siempre `adapter`.

## Workflows de desarrollo y despliegue
- **Instalar**: `npm install`.
- **Dev local (SQLite default)**: `npm run dev`.
- **Dev con PostgreSQL (Contabo)**: Configurar `DATABASE_URL` y `DB_CORE_PG=1` en `.env`, luego `npm run dev`.
- **Migración datos**: `npm run migrate:pg` (SQLite → PostgreSQL).
- **Verificación**: `npm run verify:pg` (valida counts coincidan).
- **Verificar tipos/build**: `npm run lint`, `npm run build`.
- **Deploy**: `deploy.sh` (build + `pm2 restart axion-bot` con `tsx server.ts`).

## Riesgos/deuda real detectada
- `test-api.js` apunta a `localhost:3000`; backend corre en `3005`.
- `EscanearPartida.tsx` guarda `POST /api/matches` sin `submitted_by` ni `competition_id`; backend cae a defaults.
- `GET /api/matches` devuelve `mode='Resurgimiento'` y `position='1st'` fijos; no refleja datos reales.
- `SuperAdmin.tsx` muestra métricas mostly estáticas (no conectadas a API real).
- Sin índices en PostgreSQL en tablas grandes → queries lentas.
- `whatsapp.ts` experimental no expuesto por rutas Express.

## Referencias clave para cambios futuros
- **API y reglas**: `server.ts`
- **Esquema SQLite/migraciones**: `src/server/db.ts`
- **Esquema PostgreSQL**: `scripts/pg-schema.sql`
- **Capa agnóstica DB** (⭐ NUEVA): `src/server/dbAdapter.ts`
- **Orquestación UI**: `src/App.tsx`
- **Operación ligas/torneos**: `src/components/AdminTorneo.tsx`
- **Escaneo IA**: `src/components/EscanearPartida.tsx`, `src/services/gemini.ts`
- **Guía migración**: `MIGRATION_GUIDE.md`, `MIGRATION_SUMMARY.md`
- **Setup PostgreSQL**: `POSTGRES_SETUP_GUIDE.md`
- **Scripts**: `setup-pg.sh` (Contabo), `check-pg.sh` (verificación)
