# 🗄️ Migración SQLite → PostgreSQL - Guía Completa

## 📋 Tabla de Contenidos
1. [Setup PostgreSQL en Contabo](#1-setup-postgresql-en-contabo)
2. [Configurar en IntelliJ Ultimate](#2-configurar-en-intellij-ultimate)
3. [Actualizar `.env` local](#3-actualizar-env-local)
4. [Migrar datos](#4-migrar-datos)
5. [Levantar sistema](#5-levantar-sistema)
6. [Verificar](#6-verificar)

---

## 1. Setup PostgreSQL en Contabo

### Opción A: Automática (recomendada)
```bash
# En tu VPS (conectado por SSH)
ssh root@144.126.147.252

# Descargar y ejecutar setup script
curl -sSL https://raw.githubusercontent.com/Cuervo52/axion/master/setup-pg.sh | bash

# O si clonaste el repo:
chmod +x /var/www/axion/setup-pg.sh
/var/www/axion/setup-pg.sh
```

### Opción B: Manual (si la automática no funciona)
```bash
# SSH al VPS
ssh root@144.126.147.252

# Instalar PostgreSQL
sudo apt update && sudo apt install -y postgresql postgresql-contrib

# Crear usuario y BD
sudo -u postgres psql <<EOF
CREATE USER axion_user WITH PASSWORD 'tu_contraseña_segura';
CREATE DATABASE axion_db OWNER axion_user;
GRANT ALL PRIVILEGES ON DATABASE axion_db TO axion_user;
ALTER DATABASE axion_db OWNER TO axion_user;
\c axion_db
GRANT ALL ON SCHEMA public TO axion_user;
EOF

# Permitir conexiones remotas
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf

# Agregar regla de acceso
echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf

# Reiniciar
sudo systemctl restart postgresql
```

---

## 2. Configurar en IntelliJ Ultimate

### 2.1 Instalar Driver
- **File → Settings → Plugins**
- Busca `Database Tools and SQL`
- Click **Install** si no está (normalmente ya viene)

### 2.2 Nueva Conexión PostgreSQL
1. **View → Tool Windows → Database** (o `Cmd+Shift+X`)
2. Click **+** → **Data Source** → **PostgreSQL**
3. Completa:
   ```
   Host: 144.126.147.252  (o localhost si usas SSH port-forward)
   Port: 5432
   User: axion_user
   Password: tu_contraseña_segura
   Database: axion_db
   ```
4. **Test Connection** → Debe decir "Success ✅"
5. Click **OK**

### 2.3 Explorar la BD
- En el panel **Database**, expande: `PostgreSQL → axion_db → Schemas → public → Tables`
- Deberías ver tablas vacías (lisas para migración)

---

## 3. Actualizar `.env` Local

### En `/almacen/dev/axion/.env`
```bash
# Copiar desde .env.example
cp .env.example .env

# Editar .env con tus valores
nano .env
```

### Valores a configurar:
```env
GOOGLE_CLIENT_ID=your_client_id_here
GEMINI_API_KEY=your_gemini_key_here

# ⭐ IMPORTANTE PARA PostgreSQL:
DATABASE_URL=postgresql://axion_user:tu_contraseña_segura@144.126.147.252:5432/axion_db
DB_CORE_PG=1
PGSSL_NO_VERIFY=1
```

---

## 4. Migrar Datos

### 4.1 Prueba de conexión
```bash
cd /almacen/dev/axion

# Instalar dependencias (si no están)
npm install

# Verificar que PostgreSQL está accesible
node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query('SELECT 1')"
# Debe decir: true
```

### 4.2 Ejecutar migración
```bash
# Ejecuta el script de migración (SQLite → PostgreSQL)
npm run migrate:pg
```

Esto hará:
1. Lee `warzone.db` (SQLite)
2. Ejecuta `scripts/pg-schema.sql` en PostgreSQL
3. Copia todos los datos
4. Verifica integridad de FKs

### 4.3 Verificar migración
```bash
npm run verify:pg
```

Debe mostrar counts iguales en ambas BDs:
```
SQLite - Users: 10, Competitions: 5, Matches: 42
PostgreSQL - Users: 10, Competitions: 5, Matches: 42
✅ Datos coinciden!
```

---

## 5. Levantar Sistema

### Terminal 1: Port-forward SSH (si usas Contabo)
```bash
ssh -i ~/.ssh/contabo -L 5432:localhost:5432 root@144.126.147.252

# Ahora PostgreSQL estará en localhost:5432 localmente
```

### Terminal 2: Backend
```bash
cd /almacen/dev/axion
npm run dev

# Deberá decir:
# 🔵 Usando PostgreSQL como core
# ✅ PostgreSQL schema inicializado
# Servidor Warzone Bot corriendo en http://localhost:3005
```

### Terminal 3: Verificar en navegador
```
http://localhost:3005
```

---

## 6. Verificar

### Test Health Endpoint
```bash
curl http://localhost:3005/api/health
# Respuesta: {"status":"ok"}
```

### En IntelliJ Database Console
1. **View → Tool Windows → Database**
2. Right-click `PostgreSQL → axion_db`
3. **New → Query Console**
4. Escribe:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT * FROM competitions;
   SELECT COUNT(*) FROM stats;
   ```
5. Click **Execute** (Ctrl+Enter)

---

## 🔄 Switching Back to SQLite (si algo falla)

Si necesitas volver a SQLite rápidamente:
```bash
# En .env, comenta PostgreSQL:
# DATABASE_URL=postgresql://...
# DB_CORE_PG=1

# Guarda y levanta:
npm run dev

# Sistema usará warzone.db automáticamente
```

---

## ❌ Troubleshooting

### Error: `ECONNREFUSED 144.126.147.252:5432`
```bash
# Verifica que PostgreSQL está corriendo en Contabo
ssh root@144.126.147.252
sudo systemctl status postgresql

# Si no está, inicia:
sudo systemctl start postgresql
```

### Error: `password authentication failed`
- Verifica `DATABASE_URL` en `.env`
- Recuerda que `@` en contraseña necesita URL encoding: `@` → `%40`

### IntelliJ no ve la BD en el árbol
- Click el botón **Refresh** en Database panel
- Verifica que **DB_CORE_PG=1** y **DATABASE_URL** están en `.env`

### Schema vacío en PostgreSQL
```bash
# Ejecuta manualmente el schema:
psql -h 144.126.147.252 -U axion_user -d axion_db < scripts/pg-schema.sql
```

---

## ✅ Checklist Completo

- [ ] PostgreSQL instalado en Contabo
- [ ] Usuario `axion_user` creado
- [ ] Base de datos `axion_db` existe
- [ ] Acceso remoto habilitado en `postgresql.conf`
- [ ] Regla de acceso en `pg_hba.conf`
- [ ] Conexión probada desde IntelliJ ✅
- [ ] `.env` configurado con `DATABASE_URL`
- [ ] `DB_CORE_PG=1` en `.env`
- [ ] `npm install` ejecutado
- [ ] `npm run migrate:pg` completó exitosamente
- [ ] `npm run verify:pg` muestra counts iguales
- [ ] `npm run dev` levanta con `🔵 PostgreSQL como core`
- [ ] `http://localhost:3005/api/health` retorna `{"status":"ok"}`
- [ ] IntelliJ muestra datos en las tablas

---

## 🎯 Próximos Pasos

Una vez PostgreSQL esté funcionando:
1. **Refactor todas las queries** en `server.ts` para usar async/await
2. **Crear índices** en tablas grandes (users, stats, matches)
3. **Backup automático** de PostgreSQL en Contabo
4. **Replicación** a otra BD para redundancia
5. **Monitoreo** de performance con `pg_stat_statements`

---

## 📞 Soporte

Si algo falla, revisa:
1. **Logs del backend**: `npm run dev` en Terminal 2
2. **Logs de PostgreSQL**: `sudo tail -50 /var/log/postgresql/postgresql-*.log`
3. **IntelliJ Database Tab**: Verifica conexión
4. **Archivo `.env`**: Asegúrate de no tener espacios extras

