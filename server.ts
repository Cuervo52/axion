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

  const makeInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const parseRules = (rules: any) => {
    if (!rules) return {} as any;
    if (typeof rules === 'object') return rules;
    try {
      return JSON.parse(rules);
    } catch {
      return {} as any;
    }
  };

  const normalizeLeagueMode = (value: any): 'RANDOM' | 'FIXED_SQUAD' => {
    const raw = String(value || '').toUpperCase();
    return raw === 'FIXED_SQUAD' ? 'FIXED_SQUAD' : 'RANDOM';
  };

  const getProgressStats = (userId: string, whereSql = "", params: any[] = []) => {
    return db.prepare(`
      SELECT
        COALESCE(SUM(s.kills), 0) as kills,
        COALESCE(SUM(s.points), 0) as points,
        COALESCE(SUM(s.damage), 0) as damage,
        COALESCE(SUM(s.assists), 0) as assists,
        COUNT(DISTINCT s.match_id) as matches
      FROM stats s
      JOIN matches m ON m.match_id = s.match_id
      WHERE s.user_id = ?
      ${whereSql}
    `).get(userId, ...params);
  };

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
      console.log(`[AUTH] Login attempt for email: ${email}, google_id: ${google_id}`);
      // Buscar por google_id O por email (para atrapar la semilla del admin)
      let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(google_id, email) as any;

      if (!user) {
        console.log(`[AUTH] User not found, creating new record for ${email}`);
        // Registro nuevo
        const role = email === 'cristhianamador@gmail.com' ? 'SUPER_ADMIN' : 'PLAYER';
        db.prepare('INSERT INTO users (google_id, email, gamertag, role, avatar_url) VALUES (?, ?, ?, ?, ?)')
          .run(google_id, email, gamertag, role, avatar_url);
        user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(google_id);
      } else {
        console.log(`[AUTH] User found: ${user.gamertag} (Role: ${user.role})`);
        // ...
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

  // API: Crear Liga
  app.post("/api/leagues", (req, res) => {
    const { name, admin_id, rules, start_date, end_date, invite_code, league_mode } = req.body;
    if (!name) return res.status(400).json({ error: "League name is required" });

    try {
      const mode = normalizeLeagueMode(league_mode || parseRules(rules)?.league_mode);
      const normalizedRules = {
        ...parseRules(rules),
        league_mode: mode,
      };

      const code = (invite_code || makeInviteCode()).toUpperCase();
      const result = db.prepare(`
        INSERT INTO competitions (name, type, status, admin_id, invite_code, rules, start_date, end_date, counts_for_league)
        VALUES (?, 'LIGA', 'OPEN', ?, ?, ?, ?, ?, 1)
      `).run(name, admin_id || null, code, JSON.stringify(normalizedRules), start_date || null, end_date || null);

      res.json({
        id: result.lastInsertRowid,
        name,
        type: 'LIGA',
        invite_code: code,
        league_mode: mode,
      });
    } catch (e) {
      console.error('Error creating league:', e);
      res.status(500).json({ error: "Failed to create league" });
    }
  });

  // API: Listar Ligas
  app.get("/api/leagues", (req, res) => {
    try {
      const rows = db.prepare(`
        SELECT id, name, status, invite_code, admin_id, rules, start_date, end_date
        FROM competitions
        WHERE type = 'LIGA'
        ORDER BY id DESC
      `).all();
      res.json((rows as any[]).map((row) => {
        const parsed = parseRules((row as any).rules);
        return {
          ...(row as any),
          league_mode: normalizeLeagueMode(parsed?.league_mode),
        };
      }));
    } catch (e) {
      res.status(500).json({ error: "Failed to list leagues" });
    }
  });

  // API: Crear Torneo (relampago o tradicional)
  app.post("/api/tournaments", (req, res) => {
    const {
      name,
      type,
      admin_id,
      parent_league_id,
      counts_for_league,
      rules,
      start_date,
      end_date,
      invite_code,
    } = req.body;

    if (!name) return res.status(400).json({ error: "Tournament name is required" });

    const normalizedType = type === 'LIGA' ? 'LIGA' : 'TORNEO';
    const leagueId = parent_league_id ? Number(parent_league_id) : null;
    const counts = counts_for_league ? 1 : 0;

    try {
      let inheritedRules = parseRules(rules);
      if (leagueId) {
        const league = db.prepare("SELECT id, rules FROM competitions WHERE id = ? AND type = 'LIGA'").get(leagueId) as any;
        if (!league) return res.status(404).json({ error: "Parent league not found" });

        const leagueRules = parseRules(league.rules);
        inheritedRules = {
          ...leagueRules,
          ...inheritedRules,
          league_mode: normalizeLeagueMode(inheritedRules?.league_mode || leagueRules?.league_mode),
        };
      }

      const code = (invite_code || makeInviteCode()).toUpperCase();
      const result = db.prepare(`
        INSERT INTO competitions (
          name, type, status, admin_id, invite_code, parent_league_id, counts_for_league, rules, start_date, end_date
        ) VALUES (?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        normalizedType,
        admin_id || null,
        code,
        leagueId,
        normalizedType === 'TORNEO' ? counts : 1,
        Object.keys(inheritedRules).length > 0 ? JSON.stringify(inheritedRules) : null,
        start_date || null,
        end_date || null
      );

      res.json({
        id: result.lastInsertRowid,
        name,
        type: normalizedType,
        parent_league_id: leagueId,
        counts_for_league: normalizedType === 'TORNEO' ? Boolean(counts) : true,
        invite_code: code,
      });
    } catch (e) {
      console.error('Error creating tournament:', e);
      res.status(500).json({ error: "Failed to create tournament" });
    }
  });

  // API: Listar Torneos (filtrable por liga)
  app.get("/api/tournaments", (req, res) => {
    const leagueId = req.query.league_id ? Number(req.query.league_id) : null;
    try {
      const rows = leagueId
        ? db.prepare(`
            SELECT id, name, status, admin_id, parent_league_id, counts_for_league, start_date, end_date
            FROM competitions
            WHERE type = 'TORNEO' AND parent_league_id = ?
            ORDER BY id DESC
          `).all(leagueId)
        : db.prepare(`
            SELECT id, name, status, admin_id, parent_league_id, counts_for_league, start_date, end_date
            FROM competitions
            WHERE type = 'TORNEO'
            ORDER BY id DESC
          `).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to list tournaments" });
    }
  });

  // API: Torneos de una liga
  app.get("/api/leagues/:league_id/tournaments", (req, res) => {
    const leagueId = Number(req.params.league_id);
    try {
      const rows = db.prepare(`
        SELECT id, name, status, counts_for_league, start_date, end_date
        FROM competitions
        WHERE type = 'TORNEO' AND parent_league_id = ?
        ORDER BY id DESC
      `).all(leagueId);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch league tournaments" });
    }
  });

  // API: Agregar organizador a torneo
  app.post("/api/tournaments/:id/organizers", (req, res) => {
    const competitionId = Number(req.params.id);
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: "user_id is required" });

    try {
      db.prepare(`
        INSERT OR IGNORE INTO tournament_organizers (competition_id, user_id)
        VALUES (?, ?)
      `).run(competitionId, user_id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to add organizer" });
    }
  });

  // API: Listar organizadores de torneo
  app.get("/api/tournaments/:id/organizers", (req, res) => {
    const competitionId = Number(req.params.id);
    try {
      const rows = db.prepare(`
        SELECT u.google_id, u.gamertag, u.email, u.avatar_url
        FROM tournament_organizers t
        JOIN users u ON t.user_id = u.google_id
        WHERE t.competition_id = ?
      `).all(competitionId);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: "Failed to list organizers" });
    }
  });

  // API: Draft de squads para un torneo/liga
  app.post("/api/tournaments/draft", (req, res) => {
    const competitionId = Number(req.body.competition_id);
    const squadSize = Number(req.body.squad_size) || 4;

    if (!competitionId) return res.status(400).json({ error: "competition_id is required" });
    if (![2, 3, 4].includes(squadSize)) return res.status(400).json({ error: "squad_size must be 2, 3, or 4" });

    try {
      const competition = db.prepare(`
        SELECT id, type, parent_league_id
        FROM competitions
        WHERE id = ?
      `).get(competitionId) as any;

      if (!competition) return res.status(404).json({ error: "Competition not found" });

      let leagueMode: 'RANDOM' | 'FIXED_SQUAD' = 'RANDOM';
      if (competition.parent_league_id) {
        const league = db.prepare(`
          SELECT rules
          FROM competitions
          WHERE id = ? AND type = 'LIGA'
        `).get(competition.parent_league_id) as any;
        const leagueRules = parseRules(league?.rules);
        leagueMode = normalizeLeagueMode(leagueRules?.league_mode);
      }

      if (leagueMode === 'FIXED_SQUAD' && competition.parent_league_id) {
        const previousTournament = db.prepare(`
          SELECT c.id
          FROM competitions c
          WHERE c.type = 'TORNEO'
            AND c.parent_league_id = ?
            AND c.id <> ?
            AND EXISTS (
              SELECT 1 FROM squads s
              JOIN squad_members sm ON sm.squad_id = s.id AND sm.status = 'ACTIVE'
              WHERE s.competition_id = c.id
            )
          ORDER BY c.id DESC
          LIMIT 1
        `).get(competition.parent_league_id, competitionId) as any;

        if (previousTournament?.id) {
          const cloneResult = db.transaction(() => {
            const sourceSquads = db.prepare(`
              SELECT id, name, max_members
              FROM squads
              WHERE competition_id = ?
              ORDER BY id ASC
            `).all(previousTournament.id) as any[];

            let squadsCreated = 0;
            let playersAssigned = 0;

            for (const source of sourceSquads) {
              const sourceMembers = db.prepare(`
                SELECT sm.user_id
                FROM squad_members sm
                WHERE sm.squad_id = ? AND sm.status = 'ACTIVE'
                ORDER BY sm.joined_at ASC
              `).all(source.id) as Array<{ user_id: string }>;

              if (sourceMembers.length === 0) continue;

              const leaderId = sourceMembers[0].user_id;
              const newSquad = db.prepare(`
                INSERT INTO squads (competition_id, name, leader_id, max_members)
                VALUES (?, ?, ?, ?)
              `).run(competitionId, source.name, leaderId, source.max_members || squadSize);

              const newSquadId = newSquad.lastInsertRowid;

              for (const member of sourceMembers) {
                db.prepare(`
                  INSERT OR IGNORE INTO squad_members (squad_id, user_id, status)
                  VALUES (?, ?, 'ACTIVE')
                `).run(newSquadId, member.user_id);
                playersAssigned++;
              }

              squadsCreated++;
            }

            return { squadsCreated, playersAssigned };
          });

          const result = cloneResult();
          return res.json({
            success: true,
            mode: 'FIXED_SQUAD',
            source_tournament_id: previousTournament.id,
            squads_created: result.squadsCreated,
            players_assigned: result.playersAssigned,
          });
        }
      }

      const users = db.prepare(`
        SELECT u.google_id
        FROM users u
        WHERE u.google_id NOT IN (
          SELECT sm.user_id
          FROM squad_members sm
          JOIN squads s ON s.id = sm.squad_id
          WHERE s.competition_id = ? AND sm.status = 'ACTIVE'
        )
      `).all(competitionId) as Array<{ google_id: string }>;

      const shuffled = [...users].sort(() => Math.random() - 0.5);

      const draftResult = db.transaction(() => {
        let squadsCreated = 0;
        let playersAssigned = 0;

        for (let i = 0; i < shuffled.length; i += squadSize) {
          const chunk = shuffled.slice(i, i + squadSize);
          if (chunk.length === 0) continue;

          const leaderId = chunk[0].google_id;
          const squadName = `Auto Squad ${squadsCreated + 1}`;

          const squad = db.prepare(`
            INSERT INTO squads (competition_id, name, leader_id, max_members)
            VALUES (?, ?, ?, ?)
          `).run(competitionId, squadName, leaderId, squadSize);

          const squadId = squad.lastInsertRowid;

          for (const player of chunk) {
            db.prepare(`
              INSERT OR IGNORE INTO squad_members (squad_id, user_id, status)
              VALUES (?, ?, 'ACTIVE')
            `).run(squadId, player.google_id);
            playersAssigned++;
          }

          squadsCreated++;
        }

        return { squadsCreated, playersAssigned };
      });

      const result = draftResult();
      res.json({
        success: true,
        mode: leagueMode,
        squads_created: result.squadsCreated,
        players_assigned: result.playersAssigned,
      });
    } catch (e) {
      console.error('Draft error:', e);
      res.status(500).json({ error: "Failed to execute draft" });
    }
  });

  // API: Resetear squads de un torneo
  app.post("/api/tournaments/:id/reset-squads", (req, res) => {
    const competitionId = Number(req.params.id);
    if (!competitionId) return res.status(400).json({ error: "competition_id inválido" });

    try {
      const resetTx = db.transaction(() => {
        const squads = db.prepare('SELECT id FROM squads WHERE competition_id = ?').all(competitionId) as Array<{ id: number }>;
        for (const squad of squads) {
          db.prepare('DELETE FROM squad_members WHERE squad_id = ?').run(squad.id);
        }
        db.prepare('DELETE FROM squads WHERE competition_id = ?').run(competitionId);
        return squads.length;
      });

      const removedSquads = resetTx();
      res.json({ success: true, removed_squads: removedSquads });
    } catch (e) {
      console.error('Error resetting squads:', e);
      res.status(500).json({ error: 'Failed to reset squads' });
    }
  });

  // API: Resumen operativo real para Admin Torneo (sin mock data)
  app.get("/api/admin/overview", (req, res) => {
    const leagueId = req.query.league_id ? Number(req.query.league_id) : null;
    const tournamentId = req.query.tournament_id ? Number(req.query.tournament_id) : null;

    try {
      const league = leagueId
        ? db.prepare(`
            SELECT id, name, status, rules, start_date, end_date
            FROM competitions
            WHERE id = ? AND type = 'LIGA'
          `).get(leagueId)
        : null;

      const tournament = tournamentId
        ? db.prepare(`
            SELECT id, name, status, rules, parent_league_id, start_date, end_date
            FROM competitions
            WHERE id = ? AND type = 'TORNEO'
          `).get(tournamentId) as any
        : null;

      const parseRules = (raw: any) => {
        if (!raw) return {} as any;
        if (typeof raw === 'object') return raw;
        try {
          return JSON.parse(raw);
        } catch {
          return {} as any;
        }
      };

      const leagueMode = (() => {
        const rules = parseRules((league as any)?.rules);
        return String(rules.league_mode || 'RANDOM').toUpperCase() === 'FIXED_SQUAD' ? 'FIXED_SQUAD' : 'RANDOM';
      })();

      const targetMatches = Number(parseRules(tournament?.rules).matches_per_series || 0);

      const leaguesCount = Number((db.prepare("SELECT COUNT(*) as c FROM competitions WHERE type = 'LIGA'").get() as any)?.c || 0);
      const tournamentsCount = Number((db.prepare("SELECT COUNT(*) as c FROM competitions WHERE type = 'TORNEO'").get() as any)?.c || 0);
      const playersCount = Number((db.prepare("SELECT COUNT(*) as c FROM users").get() as any)?.c || 0);

      const squadsInTournament = tournamentId
        ? Number((db.prepare('SELECT COUNT(*) as c FROM squads WHERE competition_id = ?').get(tournamentId) as any)?.c || 0)
        : 0;

      const matchesInTournament = tournamentId
        ? Number((db.prepare('SELECT COUNT(*) as c FROM matches WHERE competition_id = ?').get(tournamentId) as any)?.c || 0)
        : 0;

      const killsToday = Number((db.prepare(`
        SELECT COALESCE(SUM(s.kills), 0) as total
        FROM stats s
        JOIN matches m ON m.match_id = s.match_id
        WHERE DATE(m.processed_at) = DATE('now', 'localtime')
      `).get() as any)?.total || 0);

      const avgDamageTournament = tournamentId
        ? Number((db.prepare(`
            SELECT COALESCE(ROUND(AVG(s.damage), 0), 0) as avg_damage
            FROM stats s
            JOIN matches m ON m.match_id = s.match_id
            WHERE m.competition_id = ?
          `).get(tournamentId) as any)?.avg_damage || 0)
        : 0;

      const recentActivity = db.prepare(`
        SELECT
          m.match_id,
          m.processed_at,
          COALESCE(u.gamertag, m.submitted_by, 'Sistema') as submitted_by,
          COALESCE(SUM(s.kills), 0) as total_kills,
          COALESCE(SUM(s.points), 0) as total_points
        FROM matches m
        LEFT JOIN users u ON u.google_id = m.submitted_by
        LEFT JOIN stats s ON s.match_id = m.match_id
        WHERE (? IS NULL OR m.competition_id = ?)
        GROUP BY m.match_id, m.processed_at, submitted_by
        ORDER BY m.processed_at DESC
        LIMIT 8
      `).all(tournamentId, tournamentId);

      res.json({
        league: league
          ? {
              id: (league as any).id,
              name: (league as any).name,
              status: (league as any).status,
              league_mode: leagueMode,
              start_date: (league as any).start_date,
              end_date: (league as any).end_date,
            }
          : null,
        tournament: tournament
          ? {
              id: tournament.id,
              name: tournament.name,
              status: tournament.status,
              parent_league_id: tournament.parent_league_id,
              start_date: tournament.start_date,
              end_date: tournament.end_date,
              target_matches: targetMatches,
            }
          : null,
        stats: {
          leagues_count: leaguesCount,
          tournaments_count: tournamentsCount,
          players_count: playersCount,
          squads_in_tournament: squadsInTournament,
          matches_in_tournament: matchesInTournament,
          kills_today: killsToday,
          avg_damage_tournament: avgDamageTournament,
        },
        recent_activity: recentActivity,
      });
    } catch (e) {
      console.error('Error in /api/admin/overview:', e);
      res.status(500).json({ error: 'Failed to fetch admin overview' });
    }
  });

  // API: Progreso individual global
  app.get("/api/progress/overall/:user_id", (req, res) => {
    const userId = req.params.user_id;
    try {
      const progress = getProgressStats(userId);
      res.json({ scope: 'overall', user_id: userId, ...progress });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch overall progress" });
    }
  });

  // API: Progreso individual por liga (incluye torneos que cuentan)
  app.get("/api/progress/league/:league_id/:user_id", (req, res) => {
    const leagueId = Number(req.params.league_id);
    const userId = req.params.user_id;
    try {
      const progress = getProgressStats(
        userId,
        `
          AND (
            m.competition_id = ?
            OR m.competition_id IN (
              SELECT id FROM competitions
              WHERE type = 'TORNEO' AND parent_league_id = ? AND counts_for_league = 1
            )
          )
        `,
        [leagueId, leagueId]
      );
      res.json({ scope: 'league', league_id: leagueId, user_id: userId, ...progress });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch league progress" });
    }
  });

  // API: Progreso individual por torneo
  app.get("/api/progress/tournament/:tournament_id/:user_id", (req, res) => {
    const tournamentId = Number(req.params.tournament_id);
    const userId = req.params.user_id;
    try {
      const progress = getProgressStats(userId, ' AND m.competition_id = ?', [tournamentId]);
      res.json({ scope: 'tournament', tournament_id: tournamentId, user_id: userId, ...progress });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch tournament progress" });
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
    const { matchId, position, mode, totalKills, totalScore, totalDamage, members, submitted_by, competition_id } = req.body;

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
        `).run(matchId, Number(competition_id) || 1, userId, 'APPROVED');

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
          JOIN users u ON sm.user_id = u.google_id
          LEFT JOIN stats s ON u.google_id = s.user_id
          WHERE sm.squad_id = ? AND sm.status = 'ACTIVE'
          GROUP BY u.google_id
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

  // API: Detalle de jugadores por partida
  app.get("/api/matches/:match_id/members", (req, res) => {
    const { match_id } = req.params;
    try {
      const members = db.prepare(`
        SELECT
          u.gamertag,
          COALESCE(s.kills, 0) as kills,
          COALESCE(s.damage, 0) as damage,
          COALESCE(s.points, 0) as score
        FROM stats s
        JOIN users u ON u.google_id = s.user_id
        WHERE s.match_id = ?
        ORDER BY s.points DESC, s.kills DESC
      `).all(match_id);
      res.json(members);
    } catch (error) {
      console.error('Error in /api/matches/:match_id/members:', error);
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
