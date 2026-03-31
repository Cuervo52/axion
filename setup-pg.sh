#!/bin/bash

# Setup PostgreSQL en Contabo VPS
# Uso: chmod +x setup-pg.sh && ./setup-pg.sh

set -e

echo "🚀 Setup PostgreSQL para Axion"
echo "=============================="

# Variables (CAMBIAR SEGÚN NECESARIO)
PGUSER="axion_user"
PGPASS="${PGPASS:-axion_secure_password_123}"  # Cambiar!
PGDB="axion_db"
PGPORT="${PGPORT:-5432}"

# Detectar si estamos en el VPS
if [ "$HOSTNAME" != "vmi3015936" ] && [ -z "$FORCE_SETUP" ]; then
  echo "⚠️ Este script está diseñado para ejecutarse EN el VPS Contabo (vmi3015936)"
  echo "Si lo ejecutas localmente, configura la contraseña en .env"
  echo "Para forzar: FORCE_SETUP=1 ./setup-pg.sh"
  exit 1
fi

echo "📦 Instalando PostgreSQL..."
sudo apt update
sudo apt install -y postgresql postgresql-contrib

echo "✅ PostgreSQL instalado"
echo ""

echo "🔐 Creando usuario y BD..."
sudo -u postgres psql <<EOF
-- Crear usuario
CREATE USER $PGUSER WITH PASSWORD '$PGPASS';

-- Crear BD
CREATE DATABASE $PGDB OWNER $PGUSER;

-- Permisos
GRANT ALL PRIVILEGES ON DATABASE $PGDB TO $PGUSER;
ALTER DATABASE $PGDB OWNER TO $PGUSER;
\c $PGDB
GRANT ALL ON SCHEMA public TO $PGUSER;
EOF

echo "✅ Usuario '$PGUSER' y BD '$PGDB' creados"
echo ""

echo "🌐 Configurando acceso remoto..."
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf

# Añadir línea de acceso remoto si no existe
if ! sudo grep -q "^host.*all.*all.*0.0.0.0/0.*md5" /etc/postgresql/*/main/pg_hba.conf; then
  echo "host    all             all             0.0.0.0/0               md5" | sudo tee -a /etc/postgresql/*/main/pg_hba.conf > /dev/null
fi

echo "✅ Acceso remoto configurado"
echo ""

echo "🔄 Reiniciando PostgreSQL..."
sudo systemctl restart postgresql
sudo systemctl enable postgresql

echo "✅ PostgreSQL activo y habilitado en boot"
echo ""

echo "✅ Setup completado!"
echo ""
echo "📋 Credenciales:"
echo "   Usuario: $PGUSER"
echo "   Contraseña: $PGPASS"
echo "   Base de datos: $PGDB"
echo "   Puerto: $PGPORT"
echo ""
echo "🔗 CONNECTION STRING para .env:"
echo "   DATABASE_URL=postgresql://$PGUSER:$PGPASS@localhost:$PGPORT/$PGDB"
echo ""
echo "🧪 Probar conexión:"
echo "   psql -h localhost -U $PGUSER -d $PGDB"

