# AGENTS.md

## Panorama rapido (AXION)
- Monorepo full-stack en TypeScript: un solo proceso `server.ts` levanta Express API y, en dev, inyecta middleware de Vite SPA.
- Entrada real en desarrollo: `npm run dev` -> `tsx server.ts` (puerto backend/app: `3005`, no `3000`).
- Frontend React vive en `src/` y consume rutas relativas `/api/*`; en dev no hay proxy en `vite.config.ts`, porque Express hospeda Vite.
- Persistencia local con SQLite (`warzone.db`) usando `better-sqlite3`; el esquema se crea/migra en `src/server/db.ts` via `initDb()`.

## Arquitectura y limites
- API + boot: `server.ts` (auth Google, squads, leaderboard, analisis IA, guardado de partidas).
- DB boundary: `src/server/db.ts` centraliza DDL y migracion defensiva de `users` (si falta `google_id`).
- IA server-side activa: `/api/analyze` en `server.ts` usa `@google/generative-ai` + schema JSON estricto.
- IA alternativa/legacy: `src/server/gemini.ts` usa `@google/genai`; hoy se consume desde `src/server/whatsapp.ts` (flujo no cableado en Express).
- UI principal: `src/App.tsx`; login Google en cliente (`src/main.tsx`) y persistencia de sesion en `localStorage` (`axion_user`).

## Flujos clave end-to-end
- Escaneo de partida: `src/components/EscanearPartida.tsx` -> `src/services/gemini.ts` -> `POST /api/analyze` -> `POST /api/matches`.
- Guardado de stats usa transaccion + UPSERT en `server.ts` (`ON CONFLICT(match_id, user_id)` con `MAX(...)` para merges de capturas parciales).
- Onboarding/auth: `GoogleLogin` -> `POST /api/auth/login`; rol `SUPER_ADMIN` se fuerza por email hardcodeado en backend.
- Squads/invitaciones: `App.tsx` llama `/api/squads*` y `/api/users/:id/{squad,invitations}`; status en `squad_members` (`PENDING`, `ACTIVE`, etc.).

## Convenciones del proyecto (observadas)
- Idioma mixto ES/EN en codigo, logs y respuestas; mantener consistencia local del archivo tocado.
- SQL inline con `db.prepare(...).run/get/all`; no ORM.
- Respuestas API en JSON simple (`{ error: ... }`), manejo de errores mostly local por endpoint/componente.
- Se prioriza resiliencia operacional: limite JSON `50mb` en Express + compresion/redimension de imagen en cliente.

## Workflows de desarrollo utiles
- Instalar deps: `npm install`
- Desarrollo full-stack: `npm run dev`
- Build produccion: `npm run build` (TypeScript + Vite)
- Validacion de tipos: `npm run lint` (`tsc --noEmit`)
- Deploy operativo actual: `deploy.sh` (build + `pm2 restart axion-bot`)

## Integraciones y variables
- Requiere `GEMINI_API_KEY` (`.env.example`); sin clave, los flujos IA fallan.
- `APP_URL` se usa en respuestas de WhatsApp para links de invitacion.
- OAuth client esta hardcodeado en `src/main.tsx` (`GOOGLE_CLIENT_ID`).

## Riesgos/inconsistencias a conocer antes de editar
- `test-api.js` prueba `http://localhost:3000`, pero el servidor real corre en `3005`.
- `src/components/AdminTorneo.tsx` llama `/api/tournaments*`; esos endpoints no existen en `server.ts` actual.
- `src/components/Individual.tsx` y `src/components/Partidas.tsx` usan mock data (no consumen backend).
- `src/server/whatsapp.ts` referencia columnas no alineadas con schema actual (`admin_phone`, `user_phone`); tratarlo como experimental.
