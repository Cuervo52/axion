#!/bin/bash
# Script de Despliegue para Axion
echo "🚀 Iniciando despliegue de Axion..."

# 1. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 2. Construir el Frontend
echo "🏗️ Construyendo el frontend..."
export NODE_ENV=production
npm run build

# 3. Reiniciar el proceso con PM2
echo "🔄 Reiniciando servidor..."
pm2 restart axion-bot || pm2 start server.ts --interpreter ./node_modules/.bin/tsx --name axion-bot

echo "✅ ¡Despliegue completado! Revisa https://axion.axisvia.com"
