import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { initDb } from "./src/server/db";
import { handleWhatsAppMessage } from "./src/server/whatsapp";
import db from "./src/server/db";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Inicializar cliente de Gemini (Server-side)
// Limpiamos la clave de posibles comillas si vienen del .env
const rawKey = process.env.GEMINI_API_KEY || "";
const cleanKey = rawKey.startsWith('"') && rawKey.endsWith('"') ? rawKey.slice(1, -1) : rawKey;
const genAI = new GoogleGenerativeAI(cleanKey);

async function startServer() {
  const app = express();
  const PORT = 3005;

  // Log all requests
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
  });

  // Aumentar el límite de tamaño para JSON para soportar imágenes en base64
  // Usamos '50mb' como string explícito
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Debug: Log del tamaño del request para verificar
  app.use((req, res, next) => {
    if (req.method === 'POST') {
      const size = req.headers['content-length'];
      console.log(`[DEBUG] POST ${req.path} - Payload Size: ${size} bytes (${(Number(size) / 1024 / 1024).toFixed(2)} MB)`);
    }
    next();
  });

  // Inicializar DB
  initDb();

  // API: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Google Auth Login
  app.post("/api/auth/login", (req, res) => {
    const { google_id, email, gamertag, avatar_url } = req.body;
    try {
      // Buscar por google_id O por email (para atrapar la semilla del admin)
      let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(google_id, email) as any;

      if (!user) {
        // Registro nuevo
        const role = email === 'cristhianamador@gmail.com' ? 'SUPER_ADMIN' : 'PLAYER';
        db.prepare('INSERT INTO users (google_id, email, gamertag, role, avatar_url) VALUES (?, ?, ?, ?, ?)')
          .run(google_id, email, gamertag, role, avatar_url);
        user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
      } else {
        // Si la cuenta existe, pero el google_id es distinto (como el dummy "cristhian-admin-id"), lo actualizamos
        if (user.google_id !== google_id) {
          db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE email = ?').run(google_id, avatar_url, email);
          user.google_id = google_id;
          user.avatar_url = user.avatar_url || avatar_url; // Actualizar temp state
        }

        // Forzar rol de SUPER_ADMIN si es su correo
        if (email === 'cristhianamador@gmail.com' && user.role !== 'SUPER_ADMIN') {
          db.prepare("UPDATE users SET role = 'SUPER_ADMIN' WHERE email = ?").run(email);
          user.role = 'SUPER_ADMIN';
        }

        // Actualizar foto si venía vacío
        if (avatar_url && !user.avatar_url) {
          db.prepare('UPDATE users SET avatar_url = ? WHERE email = ?').run(avatar_url, email);
          user.avatar_url = avatar_url;
        }
      }
      res.json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // API: Actualizar Perfil
  app.post("/api/profile", (req, res) => {
    const { google_id, gamertag, avatar_url } = req.body;
    try {
      db.prepare('UPDATE users SET gamertag = ?, avatar_url = ? WHERE google_id = ?')
        .run(gamertag, avatar_url, google_id);

      const updatedUser = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile. Gamertag might be taken." });
    }
  });

  // API: Listar Usuarios Disponibles (sin squad activo)
  app.get("/api/users/available", (req, res) => {
    try {
      const users = db.prepare(`
        SELECT u.* FROM users u
        WHERE u.google_id NOT IN (
          SELECT user_id FROM squad_members WHERE status = 'ACTIVE'
        )
      `).all();
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch available users" });
    }
  });

  // API: Buscar Usuarios para Invitar (sin squad activo)
  app.get("/api/users/search", (req, res) => {
    const { q } = req.query;
    try {
      const users = db.prepare(`
        SELECT google_id, gamertag, avatar_url FROM users
        WHERE gamertag LIKE ? 
        AND google_id NOT IN (
          SELECT user_id FROM squad_members WHERE status = 'ACTIVE'
        )
        LIMIT 5
      `).all(`%${q}%`);
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  // API: Crear Squad
  app.post("/api/squads", (req, res) => {
    const { name, leader_id, competition_id } = req.body;
    try {
      const result = db.prepare('INSERT INTO squads (name, leader_id, competition_id) VALUES (?, ?, ?)')
        .run(name, leader_id, competition_id);

      const squadId = result.lastInsertRowid;

      // Auto-agregar al lider como ACTIVE
      db.prepare('INSERT INTO squad_members (squad_id, user_id, status) VALUES (?, ?, ?)')
        .run(squadId, leader_id, 'ACTIVE');

      res.json({ id: squadId, name, leader_id });
    } catch (e) {
      res.status(500).json({ error: "Failed to create squad" });
    }
  });

  // API: Invitar a Jugador
  app.post("/api/squads/invite", (req, res) => {
    const { squad_id, user_id } = req.body;
    try {
      db.prepare('INSERT INTO squad_members (squad_id, user_id, status) VALUES (?, ?, ?)')
        .run(squad_id, user_id, 'PENDING');
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "User already invited or in squad" });
    }
  });

  // API: Aceptar Invitación
  app.post("/api/squads/accept", (req, res) => {
    const { squad_id, user_id } = req.body;
    try {
      db.prepare('UPDATE squad_members SET status = "ACTIVE" WHERE squad_id = ? AND user_id = ?')
        .run(squad_id, user_id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  // API: Obtener Invitaciones Pendientes
  app.get("/api/users/:user_id/invitations", (req, res) => {
    const { user_id } = req.params;
    try {
      const invites = db.prepare(`
        SELECT s.name as squad_name, s.id as squad_id, u.gamertag as leader_name
        FROM squad_members sm
        JOIN squads s ON sm.squad_id = s.id
        JOIN users u ON s.leader_id = u.google_id
        WHERE sm.user_id = ? AND sm.status = 'PENDING'
      `).all(user_id);
      res.json(invites);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  // API: Obtener Squad Actual del Usuario
  app.get("/api/users/:user_id/squad", (req, res) => {
    const { user_id } = req.params;
    try {
      const squad = db.prepare(`
        SELECT s.*, sm.status 
        FROM squads s
        JOIN squad_members sm ON s.id = sm.squad_id
        WHERE sm.user_id = ? AND sm.status = 'ACTIVE'
      `).get(user_id);

      if (!squad) return res.json(null);

      const members = db.prepare(`
        SELECT u.gamertag, u.avatar_url, sm.status, sm.joined_at
        FROM squad_members sm
        JOIN users u ON sm.user_id = u.google_id
        WHERE sm.squad_id = ?
        ORDER BY sm.status DESC
      `).all(squad.id);

      res.json({ ...squad, members });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch squad info" });
    }
  });

  // API: Listar Usuarios (para Admin)
  app.get("/api/users", (req, res) => {
    try {
      const users = db.prepare('SELECT google_id, email, gamertag, role, created_at FROM users').all();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to list users" });
    }
  });

  // API: Promover Usuario a ADMIN
  app.post("/api/users/promote", (req, res) => {
    const { google_id, role } = req.body; // role: 'ADMIN' o 'PLAYER'
    try {
      db.prepare('UPDATE users SET role = ? WHERE google_id = ?').run(role, google_id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to promote user" });
    }
  });

  // API: Analizar Captura (Gemini)
  app.post("/api/analyze", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Limpiar base64
      const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

      const prompt = `
        Analiza esta captura de pantalla de resultados de Call of Duty: Warzone.
        Tu misión es extraer los datos con precisión forense para evitar fraudes.

        1. **Match ID (ID de Partida):**
           - Busca un número largo (ej. 2259633541685799289) ubicado en la esquina INFERIOR IZQUIERDA de la pantalla.
           - Es CRUCIAL extraer este número exactamente como aparece.

        2. **Posición:**
           - Si ves "VICTORIA", "WARZONE VICTORY" o "GANADORES", la posición es "1st".
           - Si ves "ACABADO" o un número grande al centro, esa es la posición.
           - Si no es visible, pon "N/A".

        Eres un experto auditor de Call of Duty: Warzone. 
        Tu tarea es extraer datos de una captura de pantalla que puede ser de dos tipos:
        1. **PANTALLA DE VICTORIA:** Se ve el equipo de pie con el texto "VICTORIA". Al fondo/abajo hay una fila con stats individuales (Bajas, Daño, etc.).
        2. **MARCADOR (SCOREBOARD):** Una tabla detallada con Gamertags, Puntuación, Bajas, Daño, etc.
        
        INSTRUCCIONES DE EXTRACCIÓN:
        - **Match ID:** Esquina INFERIOR IZQUIERDA (texto blanco pequeño). Obligatorio.
        - **Posición:** 
            - Si dice "VICTORIA", la posición es "1st".
            - Si es Marcadador, busca el número de posición (ej: 5, 12).
        - **Estadísticas:** Extrae Kills, Daño y Score (si está disponible) por cada jugador.
        
        INSTRUCCIONES DE AUDITORÍA (ANTIFRAUDE):
        - Verifica si los números han sido alterados.
        - Indica si la captura es sospechosa en 'isSuspicious'.
        
        IMPORTANTE: Devuelve únicamente un JSON válido.
      `;

      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              matchId: { type: SchemaType.STRING },
              position: { type: SchemaType.STRING },
              mode: { type: SchemaType.STRING },
              totalKills: { type: SchemaType.NUMBER },
              totalScore: { type: SchemaType.NUMBER },
              totalDamage: { type: SchemaType.NUMBER },
              isSuspicious: { type: SchemaType.BOOLEAN },
              auditNotes: { type: SchemaType.STRING },
              members: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    gamertag: { type: SchemaType.STRING },
                    kills: { type: SchemaType.NUMBER },
                    damage: { type: SchemaType.NUMBER },
                    score: { type: SchemaType.NUMBER },
                  },
                  required: ["gamertag", "kills", "damage", "score"],
                },
              },
            },
            required: ["matchId", "position", "totalKills", "totalScore", "totalDamage", "members"],
          },
        }
      });

      const result = await model.generateContent([
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: "image/png" } },
      ]);

      const response = await result.response;
      let responseText = response.text();

      // Limpiar bloques de código Markdown si existen
      responseText = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const parsedData = JSON.parse(responseText);

      res.json(parsedData);

    } catch (error: any) {
      console.error(">>> [ERROR] Error in /api/analyze:", error);
      // Fallback simple si la IA falla catastróficamente
      res.status(500).json({
        error: "Error al analizar la imagen",
        details: error.message,
        suggestion: "Intenta con una captura más nítida o verifica tu API Key."
      });
    }
  });

  // API: Guardar Partida Escaneada
  app.post("/api/matches", (req, res) => {
    const { matchId, position, mode, totalKills, totalScore, totalDamage, members, submitted_by } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: "No Match ID provided" });
    }

    const userId = submitted_by || 'admin-google-id';

    try {
      const insertMatchData = db.transaction(() => {
        // 1. Asegurar que la partida exista en la tabla 'matches'
        // Usamos INSERT OR IGNORE para que si ya existe (de otro squad), no falle
        db.prepare(`
          INSERT OR IGNORE INTO matches (match_id, competition_id, submitted_by, audit_status)
          VALUES (?, ?, ?, ?)
        `).run(matchId, 1, userId, 'APPROVED');

        let newlyAddedStats = 0;

        // 2. Procesar cada miembro del squad
        for (const member of members) {
          // Buscar usuario por Gamertag
          let user = db.prepare('SELECT google_id FROM users WHERE gamertag = ?').get(member.gamertag) as any;

          let targetUserId = user ? user.google_id : null;

          if (!targetUserId) {
            // Crear usuario temporal si no existe
            targetUserId = `temp-${member.gamertag.replace(/\s+/g, '').toLowerCase()}-${Date.now()}`;
            db.prepare('INSERT INTO users (google_id, email, gamertag, role) VALUES (?, ?, ?, ?)')
              .run(targetUserId, `${targetUserId}@temp.com`, member.gamertag, 'PLAYER');
          }

          // 3. UPSERT Stats individuales
          // Usamos INSERT ... ON CONFLICT para actualizar si el jugador ya existe 
          // (ej. subieron primero la pantalla de Victoria y luego el Marcador detallado).
          const result = db.prepare(`
            INSERT INTO stats (match_id, user_id, kills, points, damage)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(match_id, user_id) DO UPDATE SET
              kills = MAX(kills, excluded.kills),
              points = MAX(points, excluded.points),
              damage = MAX(damage, excluded.damage)
          `).run(matchId, targetUserId, member.kills, member.score, member.damage);

          newlyAddedStats++;
        }

        return { matchId, newlyAddedStats };
      });

      const { newlyAddedStats } = insertMatchData();

      if (newlyAddedStats === 0) {
        return res.status(409).json({
          error: "Los jugadores de esta captura ya han sido registrados para esta partida."
        });
      }

      res.json({ success: true, matchId, added: newlyAddedStats });

    } catch (error) {
      console.error("Error saving match:", error);
      res.status(500).json({ error: "Failed to save match data" });
    }
  });

  // API: Matriz de resultados (Excel Style)
  app.get("/api/stats/matrix", (req, res) => {
    try {
      const players = db.prepare('SELECT google_id, gamertag FROM users').all() as any[];
      const matrix = players.map(player => {
        const matches = db.prepare(`
          SELECT kills FROM stats 
          WHERE user_id = ? 
          ORDER BY id ASC 
          LIMIT 10
        `).all(player.google_id) as any[];

        const killsArray = matches.map(m => m.kills);
        const totalKills = killsArray.reduce((a, b) => a + b, 0);

        return {
          gamertag: player.gamertag,
          matches: killsArray,
          total_kills: totalKills,
          avg_kills: killsArray.length > 0 ? (totalKills / killsArray.length).toFixed(1) : "0.0"
        };
      });
      res.json(matrix);
    } catch (error) {
      console.error('Error in /api/stats/matrix:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Leaderboard para el Frontend
  app.get("/api/leaderboard", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT 
          u.gamertag, 
          SUM(s.kills) as kills, 
          SUM(s.points) as points,
          SUM(s.damage) as damage,
          SUM(s.assists) as assists,
          COUNT(DISTINCT s.match_id) as matches_played
        FROM users u
        LEFT JOIN stats s ON u.google_id = s.user_id
        GROUP BY u.google_id
        ORDER BY points DESC
      `).all();
      res.json(rows);
    } catch (error) {
      console.error('Error in /api/leaderboard:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Leaderboard Individual
  app.get("/api/leaderboard/individual", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT 
          u.gamertag, 
          COALESCE(sq.name, 'Sin Squad') as squad,
          COALESCE(SUM(s.kills), 0) as kills, 
          COALESCE(SUM(s.points), 0) as points,
          COUNT(DISTINCT s.match_id) as matches
        FROM users u
        LEFT JOIN squad_members sm ON u.google_id = sm.user_id AND sm.status = 'ACTIVE'
        LEFT JOIN squads sq ON sm.squad_id = sq.id
        LEFT JOIN stats s ON u.google_id = s.user_id
        GROUP BY u.google_id
        ORDER BY points DESC, kills DESC
      `).all();
      res.json(rows);
    } catch (error) {
      console.error('Error in /api/leaderboard/individual:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Leaderboard Equipos
  app.get("/api/leaderboard/equipos", (req, res) => {
    try {
      const squads = db.prepare(`
        SELECT 
          sq.id,
          sq.name,
          COALESCE(SUM(s.points), 0) as points,
          COALESCE(SUM(s.kills), 0) as kills,
          COUNT(DISTINCT s.match_id) as matches
        FROM squads sq
        LEFT JOIN squad_members sm ON sq.id = sm.squad_id AND sm.status = 'ACTIVE'
        LEFT JOIN stats s ON sm.user_id = s.user_id
        GROUP BY sq.id
        ORDER BY points DESC, kills DESC
      `).all() as any[];

      // Obtener miembros por squad
      const result = squads.map(squad => {
        const members = db.prepare(`
          SELECT 
            u.gamertag,
            COALESCE(SUM(s.kills), 0) as kills,
            COALESCE(SUM(s.points), 0) as points,
            COUNT(DISTINCT s.match_id) as matches
          FROM squad_members sm
          JOIN users u ON sm.user_phone = u.phone
          LEFT JOIN stats s ON u.phone = s.user_phone
          WHERE sm.squad_id = ? AND sm.status = 'ACTIVE'
          GROUP BY u.phone
          ORDER BY points DESC
        `).all(squad.id);

        return {
          ...squad,
          members
        };
      });

      res.json(result);
    } catch (error) {
      console.error('Error in /api/leaderboard/equipos:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // API: Partidas Recientes
  app.get("/api/matches", (req, res) => {
    try {
      const matches = db.prepare(`
        SELECT 
          m.match_id as id,
          COALESCE(sq.name, 'Squad Desconocido') as squad,
          m.processed_at as date,
          'Resurgimiento' as mode,
          '1st' as position,
          COALESCE(SUM(s.kills), 0) as totalKills,
          COALESCE(SUM(s.points), 0) as totalScore
        FROM matches m
        LEFT JOIN stats s ON m.match_id = s.match_id
        LEFT JOIN squad_members sm ON s.user_id = sm.user_id AND sm.status = 'ACTIVE'
        LEFT JOIN squads sq ON sm.squad_id = sq.id
        GROUP BY m.match_id
        ORDER BY m.processed_at DESC
        LIMIT 20
      `).all();
      res.json(matches);
    } catch (error) {
      console.error('Error in /api/matches:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  // Vite middleware para desarrollo
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  // Middleware de manejo de errores para payload size (MOVIDO AL FINAL)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[SERVER ERROR HANDLER]', err);

    // Catch PayloadTooLargeError specifically by name or status
    if (err.name === 'PayloadTooLargeError' || err.type === 'entity.too.large' || err.status === 413) {
      console.error(`[ERROR] Payload too large. Limit: ${err.limit}, Length: ${err.length}`);
      return res.status(413).json({
        error: 'Payload too large',
        details: `Request size exceeds limit`
      });
    }
    next(err);
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Warzone Bot corriendo en http://localhost:${PORT}`);
  });
}

startServer();
