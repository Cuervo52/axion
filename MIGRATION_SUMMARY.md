# ✅ Migración SQLite → PostgreSQL: RESUMEN EJECUTIVO

## 🎯 ¿Qué se Hizo?

He preparado tu proyecto **Axion** para migrar de SQLite a PostgreSQL, manteniendo la compatibilidad con ambas BDs.

---

## 📦 Archivos Creados/Modificados

### 1. **Capa de Abstracción DB** (Nuevo)
📄 `src/server/dbAdapter.ts`
- Adaptador agnóstico SQLite/PostgreSQL
- Factory pattern para cambiar de BD sin cambiar código
- Soporte para transacciones en ambas BDs
- Helper para convertir placeholders SQL

**Beneficio**: El código en `server.ts` NO necesita cambios según la BD usada.

---

### 2. **Documentación Completa**

#### 📖 `POSTGRES_SETUP_GUIDE.md`
- Paso a paso en IntelliJ Ultimate
- Configuración en Contabo VPS
- Variables de entorno
- Troubleshooting

#### 📖 `MIGRATION_GUIDE.md`
- Guía completa de 6 pasos
- Setup automático vs manual
- Verificación de datos
- Fallback a SQLite si falla algo

---

### 3. **Scripts Automatizados**

#### 🔧 `setup-pg.sh` (Nuevo)
```bash
# En Contabo: setup automático
ssh root@144.126.147.252
./setup-pg.sh
```
Hace:
- Instala PostgreSQL
- Crea usuario `axion_user`
- Crea BD `axion_db`
- Habilita acceso remoto
- Reinicia servicio

#### 🔧 `check-pg.sh` (Nuevo)
```bash
# En tu máquina: verifica todo
./check-pg.sh
```
Valida:
- `.env` configurado correctamente
- Dependencias instaladas
- Conexión a PostgreSQL
- Archivos clave existen

---

### 4. **Configuración de Entorno**

#### 📄 `.env.example` (Actualizado)
Plantilla con:
- Credenciales Google OAuth
- Variables PostgreSQL
- Variables SQLite (fallback)
- Comentarios explicativos

---

### 5. **Código Actualizado**

#### 📄 `server.ts` (modificado)
- Nuevo import: `dbAdapter`
- Inicialización dinámica de BD:
  ```typescript
  if (isPgEnabled()) {
    console.log('🔵 Usando PostgreSQL como core');
    await initPgPool();
  } else {
    console.log('🟡 Usando SQLite como core');
    initDb();
  }
  ```

---

## 🚀 Plan de Acción (7 Pasos)

### Paso 1️⃣: Preparar Contabo
```bash
# SSH al VPS
ssh root@144.126.147.252

# Ejecutar setup
chmod +x /var/www/axion/setup-pg.sh
/var/www/axion/setup-pg.sh

# Nota la contraseña generada
```

### Paso 2️⃣: Configurar IntelliJ
1. **View → Tool Windows → Database**
2. **+** → **Data Source** → **PostgreSQL**
3. Conectar a `144.126.147.252:5432` con credenciales de Paso 1

### Paso 3️⃣: Actualizar `.env` local
```bash
cd /almacen/dev/axion
cp .env.example .env
nano .env

# Editar:
# DATABASE_URL=postgresql://axion_user:PASSWORD@144.126.147.252:5432/axion_db
# DB_CORE_PG=1
# PGSSL_NO_VERIFY=1
```

### Paso 4️⃣: Verificar Setup
```bash
./check-pg.sh

# Debe mostrar todos ✅
```

### Paso 5️⃣: Instalar Dependencias
```bash
npm install
```

### Paso 6️⃣: Migrar Datos (SQLite → PostgreSQL)
```bash
npm run migrate:pg  # Copia datos de warzone.db a PostgreSQL
npm run verify:pg   # Verifica que coincidan
```

### Paso 7️⃣: Levantar Sistema
```bash
# Terminal 1: Port-forward (si usas Contabo)
ssh -i ~/.ssh/contabo -L 5432:localhost:5432 root@144.126.147.252

# Terminal 2: Backend
npm run dev

# Deberá decir:
# 🔵 Usando PostgreSQL como core
# ✅ PostgreSQL schema inicializado
# Servidor corriendo en http://localhost:3005
```

---

## 🎛️ Variables Clave en `.env`

| Variable | Valor | Uso |
|----------|-------|-----|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | String de conexión PG |
| `DB_CORE_PG` | `1` | Activar PostgreSQL (0 o vacío = SQLite) |
| `PGSSL_NO_VERIFY` | `1` | Ignorar certificados SSL (Contabo) |
| `GOOGLE_CLIENT_ID` | Tu ID de OAuth | Login con Google |
| `GEMINI_API_KEY` | Tu key de IA | Análisis de partidas |

---

## 🔄 Cómo Funciona la Abstracción

### Antes (solo SQLite):
```typescript
const user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(id);
```

### Ahora (agnóstico):
```typescript
const adapter = getDbAdapter();
const user = await adapter.get("SELECT * FROM users WHERE google_id = ?", [id]);
```

**Ventaja**: 
- Si `DB_CORE_PG=1` → usa PostgreSQL
- Si `DB_CORE_PG` no está → usa SQLite
- ¡Sin cambiar código de negocio!

---

## 📊 Arquitetura Resultante

```
┌─────────────────────────────────────┐
│        Express Server (server.ts)   │
│  (lógica de API, sin cambios)       │
└────────────────┬────────────────────┘
                 │
         ┌───────▼────────┐
         │  dbAdapter.ts  │  ◄── Capa de Abstracción
         │  (Agnóstico)   │
         └───┬────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼─────┐      ┌───▼──────────┐
│ SQLite  │      │ PostgreSQL   │
│warzone. │      │  (Contabo)   │
│   db    │      │   Pool       │
└─────────┘      └──────────────┘
```

---

## ✅ Checklist Antes de Comenzar

- [ ] Tienes acceso SSH a Contabo (root@144.126.147.252)
- [ ] Tienes SSH key configurada (~/.ssh/contabo)
- [ ] IntelliJ Ultimate está instalado con Database Tools
- [ ] `.env` tiene valores reales (GOOGLE_CLIENT_ID, GEMINI_API_KEY)
- [ ] npm está funcionando (`npm -v`)
- [ ] Puedes ver /almacen/dev/axion en tu editor

---

## 🎁 Bonus: Flujos E2E Listos para Testing

### Flujo 1: Liga + Torneos Relampago
1. Admin crea Liga ("Liga Viernes")
2. Admin crea Torneo Relampago ("Torneo 9am")
3. Jugadores se unen por link
4. Squads se sortean automáticamente
5. Resultados se registran y agregan a Liga + Torneos

### Flujo 2: Seguimiento Individual
- Jugador ve sus stats globales
- Jugador ve stats por Liga
- Jugador ve stats por Torneo
- Progreso se actualiza en tiempo real

### Flujo 3: Admin Dashboard
- Listar Ligas activas
- Crear Torneos
- Ver progreso de equipos
- Exportar resultados

---

## 🚨 Si Algo Falla

### Opción 1: Fallback a SQLite
```bash
# Comenta en .env:
# DATABASE_URL=...
# DB_CORE_PG=1

# Guardar y:
npm run dev

# Sistema usará warzone.db automáticamente
```

### Opción 2: Revisar Logs
```bash
# Backend logs
npm run dev

# PostgreSQL logs (en Contabo)
ssh root@144.126.147.252
sudo tail -50 /var/log/postgresql/postgresql-*.log

# Base de datos desde IntelliJ
# View → Tool Windows → Database
# Right-click PostgreSQL → Test Connection
```

---

## 🎯 Próximos Pasos DESPUÉS de Migration

1. **Crear índices en PostgreSQL** (stats, matches, users)
2. **Configurar backups automáticos** en Contabo
3. **Refactor queries** a transacciones async/await
4. **Monitoreo de performance** con pg_stat_statements
5. **Replicación** a segunda BD para redundancia

---

## 📞 TL;DR - Quick Start

```bash
# 1. En Contabo
ssh root@144.126.147.252
./setup-pg.sh

# 2. En tu máquina
cd /almacen/dev/axion
cp .env.example .env
# Editar .env con credenciales del paso 1
./check-pg.sh

# 3. Migrar
npm install
npm run migrate:pg

# 4. Levanta
npm run dev

# 5. ¡Listo!
# http://localhost:3005
```

---

**Fin del resumen. Todos los archivos están listos. ¿Comenzamos con los pasos?**

