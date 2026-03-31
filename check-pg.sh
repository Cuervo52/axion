#!/bin/bash

# Script de verificación rápida de PostgreSQL
# Uso: chmod +x check-pg.sh && ./check-pg.sh

echo "🔍 Verificando PostgreSQL Setup"
echo "================================"
echo ""

# 1. Verificar .env
echo "1️⃣ Verificando .env..."
if [ -f .env ]; then
  if grep -q "DATABASE_URL=" .env; then
    DB_URL=$(grep "DATABASE_URL=" .env | cut -d'=' -f2-)
    echo "   ✅ DATABASE_URL encontrada"
    echo "   → $DB_URL" | sed 's/:.*@/:***@/'
  else
    echo "   ❌ DATABASE_URL NO encontrada en .env"
  fi

  if grep -q "DB_CORE_PG=1" .env; then
    echo "   ✅ DB_CORE_PG=1 configurado"
  else
    echo "   ❌ DB_CORE_PG NO está en 1"
  fi
else
  echo "   ❌ .env NO existe. Copia desde .env.example"
fi
echo ""

# 2. Verificar dependencias
echo "2️⃣ Verificando dependencias..."
if npm list pg > /dev/null 2>&1; then
  echo "   ✅ pg package instalado"
else
  echo "   ❌ pg package NO instalado. Ejecuta: npm install"
fi

if npm list better-sqlite3 > /dev/null 2>&1; then
  echo "   ✅ better-sqlite3 instalado"
else
  echo "   ⚠️ better-sqlite3 NO instalado (OK si solo usas PostgreSQL)"
fi
echo ""

# 3. Verificar conexión a PostgreSQL
echo "3️⃣ Verificando conexión a PostgreSQL..."
if [ -f .env ]; then
  export $(grep DATABASE_URL .env | xargs)

  if command -v psql &> /dev/null; then
    # Extraer credenciales
    DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:/]*\).*|\1|p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's|postgresql://\([^:]*\).*|\1|p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')

    echo "   Host: $DB_HOST"
    echo "   Port: $DB_PORT"
    echo "   User: $DB_USER"
    echo "   DB: $DB_NAME"

    # Probar conexión (sin interactividad)
    if timeout 5 psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
      echo "   ✅ Conexión a PostgreSQL exitosa"
    else
      echo "   ❌ NO se pudo conectar a PostgreSQL"
      echo "      Verifica:"
      echo "      - PostgreSQL está corriendo en $DB_HOST:$DB_PORT"
      echo "      - Credenciales en .env son correctas"
      echo "      - Firewall permite conexión"
    fi
  else
    echo "   ⚠️ psql NO instalado. Para probar: npm run dev"
  fi
else
  echo "   ❌ .env NO encontrado"
fi
echo ""

# 4. Verificar archivos clave
echo "4️⃣ Verificando archivos clave..."
files=("src/server/dbAdapter.ts" "scripts/pg-schema.sql" "server.ts")
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file NO encontrado"
  fi
done
echo ""

# 5. Resumen
echo "5️⃣ Resumen:"
echo "   Si todo está ✅, puedes ejecutar:"
echo "   $ npm run dev"
echo ""
echo "   Si algo está ❌, sigue las instrucciones en MIGRATION_GUIDE.md"

