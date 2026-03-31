# AGENTS.md

## Panorama rapido
- Stack real: un solo proceso `server.ts` corre Express + API + Vite middleware en dev.
- Puerto real local: `3005` (`npm run dev` ejecuta `tsx server.ts`).
- Frontend React en `src/` consume rutas relativas `/api/*` (sin proxy Vite en dev).
- Persistencia: SQLite `warzone.db` via `better-sqlite3`; esquema y migraciones en `src/server/db.ts` (`initDb()`).

## Arquitectura actual (como funciona hoy)
- `server.ts` centraliza boot, endpoints, IA (`/api/analyze`), guardado de partidas y leaderboards.
- `src/server/db.ts` es el unico boundary de schema: crea tablas y migra columnas legacy phone -> google_id.
- `src/App.tsx` controla sesion (`localStorage: axion_user`), roles y vistas (`user`, `admin-torneo`, `SUPER_ADMIN`).
- `src/main.tsx` integra Google OAuth con `GOOGLE_CLIENT_ID` hardcodeado.
- `SuperAdmin` es UI visual/launcher; operacion real de ligas/torneos vive en `AdminTorneo` + API.

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

## Convenciones del proyecto
- Idioma mixto ES/EN en UI/logs/codigo; mantener consistencia por archivo.
- SQL inline con `db.prepare(...).run/get/all`; no ORM ni capa repository.
- Errores API simples: `{ error: string }` y `500` local por endpoint.
- Se prioriza robustez de payload de imagen: cliente reduce imagen y server acepta JSON hasta `50mb`.

## Workflows de desarrollo y despliegue
- Instalar: `npm install`.
- Dev full-stack: `npm run dev`.
- Verificar tipos/build: `npm run lint`, `npm run build`.
- Deploy actual: `deploy.sh` (build + `pm2 restart axion-bot` con `tsx server.ts`).

## Riesgos/deuda real detectada
- `test-api.js` apunta a `localhost:3000`; backend corre en `3005`.
- `EscanearPartida.tsx` guarda `POST /api/matches` sin `submitted_by` ni `competition_id`; backend cae a defaults (`admin-google-id`, `competition_id=1`).
- `GET /api/matches` devuelve `mode='Resurgimiento'` y `position='1st'` fijos; no refleja todos los datos analizados.
- `SuperAdmin.tsx` muestra metricas mostly estaticas (no conectadas a API real).
- `src/server/whatsapp.ts` y `src/server/gemini.ts` existen como flujo alterno/experimental no expuesto por rutas Express principales.

## Referencias clave para cambios futuros
- API y reglas de negocio: `server.ts`
- Esquema/migracion: `src/server/db.ts`
- Orquestacion UI y roles: `src/App.tsx`
- Operacion de ligas/torneos: `src/components/AdminTorneo.tsx`
- Escaneo IA y guardado: `src/components/EscanearPartida.tsx`, `src/services/gemini.ts`
