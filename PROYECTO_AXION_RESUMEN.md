# AXION - Resumen Completo del Proyecto

## 1. Visión General
**AXION** es una plataforma de eSports de última generación diseñada específicamente para la comunidad de **Call of Duty: Warzone**. Su propósito principal es automatizar la recolección de estadísticas de partidas mediante Inteligencia Artificial, eliminando la carga administrativa de los organizadores de torneos y brindando a los jugadores una experiencia profesional y competitiva.

- **Nombre del Proyecto:** AXION
- **Cliente:** ZAMA Consultores
- **Estado Actual:** Beta v1.0.2 (Desarrollo Activo)
- **Objetivo:** Ser el motor central de torneos de Warzone con soberanía de datos y automatización total.

---

## 2. Arquitectura del Sistema
El proyecto sigue una arquitectura **Full-Stack** moderna optimizada para el rendimiento y la escalabilidad en entornos de contenedores.

### Frontend (SPA)
- **Framework:** React 19 + Vite.
- **Estilo:** Tailwind CSS v4 (Sovereign Minimal 2026).
- **Animaciones:** Framer Motion (Motion/React).
- **Iconografía:** Lucide React.
- **UX/UI:** Diseño "Bento Grid", modo oscuro nativo (#050505), y componentes responsivos optimizados para móviles.

### Backend (Servidor de API)
- **Entorno:** Node.js con Express.
- **Lenguaje:** TypeScript (vía `tsx`).
- **Base de Datos:** SQLite (`better-sqlite3`) para persistencia local rápida y eficiente.
- **Integración IA:** Google Gemini API (Modelo `gemini-2.5-flash-image`) para OCR avanzado.

---

## 3. Funcionalidades Principales

### A. Escaneo de Partidas (Core IA)
La joya de la corona de AXION. Permite a los usuarios subir capturas de pantalla de sus resultados de Warzone.
- **Procesamiento:** La imagen se redimensiona y comprime en el cliente antes de ser enviada para optimizar el ancho de banda.
- **Extracción:** La IA identifica:
  - Posición final (1st, 2nd, etc.).
  - Modo de juego (Resurgimiento, Battle Royale).
  - Gamertags de los miembros del equipo.
  - Estadísticas individuales: Bajas (Kills), Daño y Puntuación.
- **Validación:** Sistema de auditoría para prevenir fraudes.

### B. Leaderboards Dinámicos
- **Individual:** Ranking de jugadores basado en puntos acumulados, kills y daño.
- **Equipos (Squads):** Ranking grupal que suma el desempeño de todos los miembros activos.
- **Matriz de Stats:** Vista estilo Excel para que los administradores vean el progreso histórico de cada jugador.

### C. Gestión de Torneos (Admin Panels)
- **Organizador:** Herramientas para crear torneos, gestionar inscripciones y validar partidas.
- **Super Admin:** Control total sobre la infraestructura, usuarios y configuraciones globales.

### D. Integración de Mensajería (WhatsApp)
- **SABUESO:** Agente encargado de recibir capturas vía WhatsApp y procesarlas automáticamente (Mockup implementado).

---

## 4. Modelo de Datos (Esquema DB)
La base de datos `warzone.db` utiliza un esquema relacional para garantizar la integridad:

- **`users`**: Almacena teléfonos, gamertags y roles (PLAYER, ADMIN, SUPERADMIN).
- **`squads`**: Definición de equipos.
- **`squad_members`**: Relación muchos-a-muchos entre usuarios y equipos.
- **`matches`**: Registro de cada partida procesada.
- **`stats`**: Estadísticas granulares por jugador por partida.
- **`competitions`**: Definición de torneos y sus reglas.

---

## 5. Desafíos Técnicos Superados
- **Payload Too Large (413):** Se resolvió implementando compresión de imágenes en el frontend y aumentando los límites de Express a 50MB.
- **Soberanía de Datos:** Implementación de una base de datos local que no depende de servicios externos de terceros para el almacenamiento de stats.
- **Precisión OCR:** Refinamiento de prompts para Gemini que entienden el contexto específico de Warzone en español (BAJAS vs ELIMINACIONES).

---

## 6. Roadmap y Próximos Pasos
1. **Notificaciones en Tiempo Real:** Implementar sockets para actualizaciones de leaderboard instantáneas.
2. **Automatización de Brackets:** Generación automática de llaves de torneo.
3. **App Móvil Nativa:** Posible migración a React Native o PWA avanzada.
4. **Análisis Predictivo:** IA que sugiere mejoras a los jugadores basadas en su histórico de daño y posicionamiento.

---

**Generado el:** 4 de Marzo de 2026
**Autor:** AXION Core Intelligence
