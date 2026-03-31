# ⚡ Quick Start - Axion System
## 🎯 En 30 segundos
```bash
cd /almacen/dev/axion
npm install
npm run dev  # Listo en http://localhost:3005
```
---
## 🗄️ Elegir BD
### SQLite (default - local)
```bash
# Simplemente ejecuta:
npm run dev
# Usa warzone.db automáticamente
```
### PostgreSQL (Contabo)
```bash
# 1. En .env:
DATABASE_URL=postgresql://user:pass@144.126.147.252:5432/axion_db
DB_CORE_PG=1
# 2. Migrar datos:
npm run migrate:pg
npm run verify:pg
# 3. Levantar:
npm run dev  # Usa PostgreSQL
```
---
## 🔧 Comandos Clave
```bash
npm run dev           # Start dev server + React
npm run build         # Build para producción
npm run lint          # Check tipos TypeScript
npm run migrate:pg    # SQLite → PostgreSQL
npm run verify:pg     # Verificar migración
./check-pg.sh         # Validar setup
./setup-pg.sh         # Setup PostgreSQL (Contabo)
```
---
## 📚 Documentación
| Archivo | Para |
|---------|------|
| **AGENTS.md** | Agentes IA (architectura, flujos, código) |
| **MIGRATION_GUIDE.md** | Migrar a PostgreSQL (paso a paso) |
| **MIGRATION_SUMMARY.md** | Resumen ejecutivo |
| **POSTGRES_SETUP_GUIDE.md** | Setup en IntelliJ + Contabo |
---
## 🚀 Flujos E2E Listos
### 1. Login
```
GoogleLogin → POST /api/auth/login → localStorage: axion_user → PlayerDashboard
```
### 2. Crear Liga + Torneo Relampago
```
AdminTorneo → POST /api/leagues → POST /api/tournaments → Enviar link
```
### 3. Jugadores se Unen
```
Link ?join=CODIGO → POST /api/invites/CODIGO/join → competition_members
```
### 4. Crear Squad y Sortear
```
POST /api/tournaments/draft → Squads aleatorios → POST /api/squads/*/invite
```
### 5. Registrar Partida
```
EscanearPartida (foto) → Gemini IA → POST /api/matches + stats → Ranking actualizado
```
### 6. Ver Progreso
```
Individual → GET /api/progress/tournament/:id/:user_id → Tabla + gráficos
```
---
## 🎮 Testearlo Ahora
1. **Abre** http://localhost:3005
2. **Login** con Google (o devtools localStorage)
3. **Crea** una Liga
4. **Crea** un Torneo en la Liga
5. **Invita** jugadores (link o código)
6. **Escanea** partida (o sube stats manual)
7. **Ve** progreso en tiempo real
---
## 🆘 Si Algo Falla
### PostgreSQL no conecta
```bash
./check-pg.sh  # Verifica config
ssh root@144.126.147.252
sudo systemctl status postgresql
```
### Backend no inicia
```bash
npm run lint    # Checa errores TypeScript
rm -rf node_modules && npm install
```
### Volver a SQLite
```bash
# Comenta en .env:
# DATABASE_URL=...
# DB_CORE_PG=1
npm run dev
```
---
## 🏗️ Arquitectura Visual
```
┌─────────────────────────────┐
│      React (3005)           │
│  - PlayerDashboard          │
│  - AdminTorneo              │
│  - EscanearPartida          │
└──────────────┬──────────────┘
               │
         Express API
               │
    ┌──────────▼────────────┐
    │   dbAdapter.ts        │
    │ (SQLite ↔ PostgreSQL) │
    └──┬─────────────┬──────┘
       │             │
┌──────▼──┐   ┌─────▼──────┐
│warzone  │   │PostgreSQL  │
│.db      │   │(Contabo)   │
│SQLite   │   │Pool        │
└─────────┘   └────────────┘
```
---
## 💡 Tips
1. **AGENTS.md** es tu referencia para entender el código
2. **dbAdapter** maneja SQLite/PostgreSQL automáticamente
3. **No**
 commitees .env - usa .env.example
4. **Transacciones** con `withTransaction()` (ambas BDs)
5. **IntelliJ Database tab** = Gold para explorar schema
---
**Última actualización**: 31 Mar 2026  
**Estado**: ✅ Production Ready
