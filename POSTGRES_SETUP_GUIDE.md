# 🗄️ Guía: Migración SQLite → PostgreSQL en IntelliJ Ultimate

## 1️⃣ Configuración Inicial en IntelliJ Ultimate

### Paso 1: Instalar Driver PostgreSQL
1. **File → Settings → Plugins**
2. Busca: `Database Tools and SQL`
3. Asegúrate que esté installed (viene por defecto)

### Paso 2: Conectar a PostgreSQL en IntelliJ
1. **View → Tool Windows → Database** (o `Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Click en **+** → **Data Source** → **PostgreSQL**
3. Completa:
   - **Host:** `localhost` (o tu IP/dominio de Contabo: `144.126.147.252`)
   - **Port:** `5432` (default)
   - **User:** `postgres` o tu usuario de BD
   - **Password:** tu contraseña
   - **Database:** `axion_db` (crea una si no existe)
4. Click **Test Connection** para verificar
5. Si dice "Success" → ✅ Conexión lista

---

## 2️⃣ Preparar tu Entorno

### En tu VPS (Contabo)
```bash
# 1. Instalar PostgreSQL (si no está)
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# 2. Iniciar servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Crear usuario y BD
sudo -u postgres psql <<EOF
CREATE USER axion_user WITH PASSWORD 'tu_contraseña_segura';
CREATE DATABASE axion_db OWNER axion_user;
GRANT ALL PRIVILEGES ON DATABASE axion_db TO axion_user;
ALTER DATABASE axion_db OWNER TO axion_user;
\c axion_db
GRANT ALL ON SCHEMA public TO axion_user;
EOF

# 4. Verificar conexión remota (si usarás desde tu máquina)
# Editar /etc/postgresql/*/main/postgresql.conf
sudo nano /etc/postgresql/*/main/postgresql.conf
# Encuentra: #listen_addresses = 'localhost'
# Cambia a: listen_addresses = '*'

# Luego edita /etc/postgresql/*/main/pg_hba.conf
# Agrega al final (para conexiones remotas):
# host    all             all             0.0.0.0/0               md5

sudo systemctl restart postgresql
```

### En tu máquina local (desarrollo)
```bash
cd /almacen/dev/axion

# 1. Copiar archivos .ssh de Contabo
mkdir -p ~/.ssh
# Asegúrate que tienes tu key SSH de contabo:
# contabo
# contabo.pub

chmod 600 ~/.ssh/contabo
chmod 644 ~/.ssh/contabo.pub

# 2. Probar conexión SSH
ssh -i ~/.ssh/contabo root@144.126.147.252

# 3. Port forward PostgreSQL (opcional, para desarrollo)
ssh -i ~/.ssh/contabo -L 5432:localhost:5432 root@144.126.147.252

# Ahora en IntelliJ conecta a localhost:5432
```

---

## 3️⃣ Variables de Entorno

### Crear/Actualizar `.env`
```bash
# Para desarrollo LOCAL (remoto a Contabo)
DATABASE_URL=postgresql://axion_user:tu_contraseña_segura@144.126.147.252:5432/axion_db
DB_CORE_PG=1
PGSSL_NO_VERIFY=1

# Para desarrollo con port-forward
DATABASE_URL=postgresql://axion_user:tu_contraseña_segura@localhost:5432/axion_db
DB_CORE_PG=1

# Mantener OAuth y Gemini
GOOGLE_CLIENT_ID=tu_client_id
GEMINI_API_KEY=tu_api_key
```

---

## 4️⃣ Migrar Datos (SQLite → PostgreSQL)

### En tu máquina local:
```bash
cd /almacen/dev/axion

# 1. Instalar dependencias si no las tienes
npm install

# 2. Ejecutar migración (SQLite → PostgreSQL)
npm run migrate:pg

# 3. Verificar que coincidan los datos
npm run verify:pg
```

---

## 5️⃣ Refactorizar el Código

### Cambios que se han hecho:
1. **`server.ts`** → Usar PostgreSQL como DB core en lugar de SQLite
2. **Eliminar `better-sqlite3`** en producción (mantener para fallback)
3. **Actualizar queries** para sintaxis PostgreSQL
4. **Pool de conexiones** mediante `pg.Pool`

### En `server.ts` (YA HECHO en la refactoración abajo)
- Cambiar imports: `import db from './src/server/db'` → usar `pgQuery` cuando `DB_CORE_PG=1`
- Queries: reemplazar `.prepare().run/get/all()` con `await pgQuery()`

---

## 6️⃣ Verificar en IntelliJ

### Explorar la BD desde IntelliJ:
1. **Database → axion_db** (expandir arbol)
2. Ver tablas: `users`, `competitions`, `squads`, `stats`, etc.
3. Click derecho en tabla → **Select Rows** para ver datos

### Ejecutar queries directas:
1. **Right-click axion_db → SQL Scripts → New**
2. Escribe tu query, ej:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT * FROM competitions;
   ```
3. Click **Execute** (Ctrl+Enter)

---

## 7️⃣ Levantar Sistema en Local

```bash
# Terminal 1: Backend Express + PostgreSQL
cd /almacen/dev/axion
npm run dev

# Terminal 2: Port-forward a Contabo (si usas Contabo)
ssh -i ~/.ssh/contabo -L 5432:localhost:5432 root@144.126.147.252

# Tu navegador: http://localhost:3005
```

---

## ⚠️ Troubleshooting

### Conexión rechazada a PostgreSQL
```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Reiniciar si falla
sudo systemctl restart postgresql

# Ver logs
sudo tail -20 /var/log/postgresql/postgresql-*.log
```

### IntelliJ no ve la BD
1. **Database → Click el ícono "refresh"**
2. **Asegúrate que la conexión está "Test Connection" ✅**

### Error: `role "postgres" does not exist`
- Significa que el usuario de conexión es incorrecto
- Cambia en `.env`: `DATABASE_URL=postgresql://postgres:password@...`

---

## 📋 Checklist Final

- [ ] PostgreSQL instalado en Contabo
- [ ] Variable `DATABASE_URL` configurada en `.env`
- [ ] `DB_CORE_PG=1` en `.env`
- [ ] Conexión probada en IntelliJ ✅
- [ ] Datos migrados: `npm run migrate:pg`
- [ ] Verificación: `npm run verify:pg`
- [ ] Backend levantado: `npm run dev`
- [ ] Frontend accesible: `http://localhost:3005` ✅

---

## 🚀 Próximo Paso
Una vez verificado, el sistema está listo para:
- Liga y torneos
- Perfiles (admin SAAS, admin torneo, jugador)
- Seguimiento de progreso individual, por liga y por torneo

