import Database from 'better-sqlite3';

const db = new Database('warzone.db');

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

export function initDb() {
  // Tabla de Usuarios evolucionada
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      google_id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      gamertag TEXT NOT NULL UNIQUE,
      avatar_url TEXT,
      phone TEXT,
      role TEXT DEFAULT 'PLAYER' CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'PLAYER')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migración: Asegurar que google_id existe si la tabla fue creada con el esquema viejo
  try {
    const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
    const columns = tableInfo.map(c => c.name);

    if (!columns.includes('google_id')) {
      console.log('Migrando tabla users: agregando google_id...');
      db.exec("ALTER TABLE users RENAME TO users_old");
      db.exec(`
        CREATE TABLE users (
          google_id TEXT PRIMARY KEY,
          email TEXT UNIQUE,
          gamertag TEXT NOT NULL UNIQUE,
          avatar_url TEXT,
          phone TEXT,
          role TEXT DEFAULT 'PLAYER' CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'PLAYER')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const oldTableInfo = db.prepare("PRAGMA table_info(users_old)").all() as any[];
      const oldColumns = oldTableInfo.map(c => c.name);

      if (oldColumns.includes('email')) {
        db.exec(`
          INSERT OR IGNORE INTO users (google_id, email, gamertag, role)
          SELECT COALESCE(email, 'temp-' || ROWID), email, gamertag, role FROM users_old
        `);
      } else {
        db.exec(`
          INSERT OR IGNORE INTO users (google_id, gamertag, role)
          SELECT 'temp-' || ROWID, gamertag, role FROM users_old
        `);
      }
    }
  } catch (e) {
    console.error("Error migrando usuarios:", e);
  }

  // Ligas y Torneos
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('LIGA', 'TORNEO')),
      status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ACTIVE', 'FINISHED')),
      admin_id TEXT,
      invite_code TEXT UNIQUE,
      parent_league_id INTEGER,
      counts_for_league INTEGER DEFAULT 0 CHECK(counts_for_league IN (0, 1)),
      rules TEXT,
      start_date DATETIME,
      end_date DATETIME,
      FOREIGN KEY (admin_id) REFERENCES users(google_id),
      FOREIGN KEY (parent_league_id) REFERENCES competitions(id)
    )
  `);

  // Migracion: extender competitions en instalaciones existentes
  try {
    const compInfo = db.prepare("PRAGMA table_info(competitions)").all() as any[];
    const compCols = compInfo.map(c => c.name);

    if (!compCols.includes('admin_id')) {
      db.exec("ALTER TABLE competitions ADD COLUMN admin_id TEXT");
    }

    if (!compCols.includes('parent_league_id')) {
      db.exec("ALTER TABLE competitions ADD COLUMN parent_league_id INTEGER");
    }
    if (!compCols.includes('counts_for_league')) {
      db.exec("ALTER TABLE competitions ADD COLUMN counts_for_league INTEGER DEFAULT 0 CHECK(counts_for_league IN (0, 1))");
    }

    // Backfill legacy admin_phone -> admin_id cuando exista mapeo por users.phone
    if (compCols.includes('admin_phone')) {
      db.exec(`
        UPDATE competitions
        SET admin_id = (
          SELECT u.google_id
          FROM users u
          WHERE u.phone = competitions.admin_phone
          LIMIT 1
        )
        WHERE admin_id IS NULL
      `);
    }
  } catch (e) {
    console.error("Error migrando competitions:", e);
  }

  // Tabla de Squads
  db.exec(`
    CREATE TABLE IF NOT EXISTS squads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER,
      name TEXT NOT NULL,
      leader_id TEXT NOT NULL,
      max_members INTEGER DEFAULT 4,
      FOREIGN KEY (competition_id) REFERENCES competitions(id),
      FOREIGN KEY (leader_id) REFERENCES users(google_id)
    )
  `);

  // Migracion: squads legacy con leader_phone -> leader_id
  try {
    const squadsInfo = db.prepare("PRAGMA table_info(squads)").all() as any[];
    const squadsCols = squadsInfo.map(c => c.name);

    if (squadsCols.includes('leader_phone') && !squadsCols.includes('leader_id')) {
      console.log('Migrando tabla squads: leader_phone -> leader_id...');
      db.exec('ALTER TABLE squads RENAME TO squads_old');

      db.exec(`
        CREATE TABLE squads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          competition_id INTEGER,
          name TEXT NOT NULL,
          leader_id TEXT NOT NULL,
          max_members INTEGER DEFAULT 4,
          FOREIGN KEY (competition_id) REFERENCES competitions(id),
          FOREIGN KEY (leader_id) REFERENCES users(google_id)
        )
      `);

      db.exec(`
        INSERT OR IGNORE INTO users (google_id, email, gamertag, role, phone)
        SELECT
          'legacy-leader-' || REPLACE(COALESCE(s.leader_phone, 'unknown'), '+', '') || '-' || s.id,
          'legacy-leader-' || REPLACE(COALESCE(s.leader_phone, 'unknown'), '+', '') || '-' || s.id || '@temp.com',
          'Leader-' || COALESCE(s.leader_phone, CAST(s.id AS TEXT)),
          'PLAYER',
          s.leader_phone
        FROM squads_old s
        LEFT JOIN users u ON u.phone = s.leader_phone
        WHERE u.google_id IS NULL
      `);

      db.exec(`
        INSERT OR IGNORE INTO squads (id, competition_id, name, leader_id, max_members)
        SELECT
          s.id,
          s.competition_id,
          s.name,
          COALESCE(
            u.google_id,
            'legacy-leader-' || REPLACE(COALESCE(s.leader_phone, 'unknown'), '+', '') || '-' || s.id
          ) AS mapped_leader_id,
          4
        FROM squads_old s
        LEFT JOIN users u ON u.phone = s.leader_phone
      `);
    }
  } catch (e) {
    console.error("Error migrando squads:", e);
  }

  // Miembros de Squad con Invitaciones
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_members (
      squad_id INTEGER,
      user_id TEXT,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIVE', 'LEFT', 'REJECTED')),
      PRIMARY KEY (squad_id, user_id),
      FOREIGN KEY (squad_id) REFERENCES squads(id),
      FOREIGN KEY (user_id) REFERENCES users(google_id)
    )
  `);

  // Migracion: squad_members legacy con user_phone -> user_id
  try {
    const squadMembersInfo = db.prepare("PRAGMA table_info(squad_members)").all() as any[];
    const squadMembersCols = squadMembersInfo.map(c => c.name);

    if (squadMembersCols.includes('user_phone') && !squadMembersCols.includes('user_id')) {
      console.log('Migrando tabla squad_members: user_phone -> user_id...');
      db.exec('ALTER TABLE squad_members RENAME TO squad_members_old');

      db.exec(`
        CREATE TABLE squad_members (
          squad_id INTEGER,
          user_id TEXT,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIVE', 'LEFT', 'REJECTED')),
          PRIMARY KEY (squad_id, user_id),
          FOREIGN KEY (squad_id) REFERENCES squads(id),
          FOREIGN KEY (user_id) REFERENCES users(google_id)
        )
      `);

      db.exec(`
        INSERT OR IGNORE INTO users (google_id, email, gamertag, role, phone)
        SELECT
          'legacy-' || REPLACE(COALESCE(sm.user_phone, 'unknown'), '+', '') || '-sq-' || sm.squad_id,
          'legacy-' || REPLACE(COALESCE(sm.user_phone, 'unknown'), '+', '') || '-sq-' || sm.squad_id || '@temp.com',
          'Legacy-' || COALESCE(sm.user_phone, CAST(sm.squad_id AS TEXT)),
          'PLAYER',
          sm.user_phone
        FROM squad_members_old sm
        LEFT JOIN users u ON u.phone = sm.user_phone
        WHERE u.google_id IS NULL
      `);

      db.exec(`
        INSERT OR IGNORE INTO squad_members (squad_id, user_id, joined_at, status)
        SELECT
          sm.squad_id,
          COALESCE(
            u.google_id,
            'legacy-' || REPLACE(COALESCE(sm.user_phone, 'unknown'), '+', '') || '-sq-' || sm.squad_id
          ) AS mapped_user_id,
          sm.joined_at,
          sm.status
        FROM squad_members_old sm
        LEFT JOIN users u ON u.phone = sm.user_phone
      `);
    }

    // Reparacion: si la FK quedo referenciando squads_old, reconstruir tabla
    const fkList = db.prepare("PRAGMA foreign_key_list(squad_members)").all() as any[];
    const referencesOldSquads = fkList.some((fk) => fk.table === 'squads_old');

    if (referencesOldSquads) {
      console.log('Reparando FK de squad_members -> squads...');
      db.exec('ALTER TABLE squad_members RENAME TO squad_members_tmp_fix');

      db.exec(`
        CREATE TABLE squad_members (
          squad_id INTEGER,
          user_id TEXT,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACTIVE', 'LEFT', 'REJECTED')),
          PRIMARY KEY (squad_id, user_id),
          FOREIGN KEY (squad_id) REFERENCES squads(id),
          FOREIGN KEY (user_id) REFERENCES users(google_id)
        )
      `);

      db.exec(`
        INSERT OR IGNORE INTO squad_members (squad_id, user_id, joined_at, status)
        SELECT squad_id, user_id, joined_at, status
        FROM squad_members_tmp_fix
      `);
    }
  } catch (e) {
    console.error("Error migrando squad_members:", e);
  }

  // Tabla de Partidas
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      match_id TEXT PRIMARY KEY,
      competition_id INTEGER,
      submitted_by TEXT,
      audit_status TEXT DEFAULT 'APPROVED' CHECK(audit_status IN ('APPROVED', 'PENDING', 'REJECTED')),
      audit_notes TEXT,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competition_id) REFERENCES competitions(id),
      FOREIGN KEY (submitted_by) REFERENCES users(google_id)
    )
  `);

  // Tabla de Estadísticas
  db.exec(`
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id TEXT,
      user_id TEXT,
      kills INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      damage INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      placement_points INTEGER DEFAULT 0,
      UNIQUE(match_id, user_id),
      FOREIGN KEY (match_id) REFERENCES matches(match_id),
      FOREIGN KEY (user_id) REFERENCES users(google_id)
    )
  `);

  // Migracion: stats legacy con user_phone -> user_id
  try {
    const statsInfo = db.prepare("PRAGMA table_info(stats)").all() as any[];
    const statsCols = statsInfo.map(c => c.name);

    if (statsCols.includes('user_phone') && !statsCols.includes('user_id')) {
      console.log('Migrando tabla stats: user_phone -> user_id...');
      db.exec('ALTER TABLE stats RENAME TO stats_old');

      db.exec(`
        CREATE TABLE stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          match_id TEXT,
          user_id TEXT,
          kills INTEGER DEFAULT 0,
          points INTEGER DEFAULT 0,
          damage INTEGER DEFAULT 0,
          assists INTEGER DEFAULT 0,
          placement_points INTEGER DEFAULT 0,
          UNIQUE(match_id, user_id),
          FOREIGN KEY (match_id) REFERENCES matches(match_id),
          FOREIGN KEY (user_id) REFERENCES users(google_id)
        )
      `);

      // Crear usuarios temporales para stats historicas sin mapeo por phone
      db.exec(`
        INSERT OR IGNORE INTO users (google_id, email, gamertag, role, phone)
        SELECT
          'legacy-' || REPLACE(COALESCE(s.user_phone, 'unknown'), '+', '') || '-' || s.id,
          'legacy-' || REPLACE(COALESCE(s.user_phone, 'unknown'), '+', '') || '-' || s.id || '@temp.com',
          'Legacy-' || COALESCE(s.user_phone, CAST(s.id AS TEXT)),
          'PLAYER',
          s.user_phone
        FROM stats_old s
        LEFT JOIN users u ON u.phone = s.user_phone
        WHERE u.google_id IS NULL
      `);

      db.exec(`
        INSERT OR IGNORE INTO stats (id, match_id, user_id, kills, points, damage, assists, placement_points)
        SELECT
          s.id,
          s.match_id,
          COALESCE(
            u.google_id,
            'legacy-' || REPLACE(COALESCE(s.user_phone, 'unknown'), '+', '') || '-' || s.id
          ) AS mapped_user_id,
          s.kills,
          s.points,
          s.damage,
          s.assists,
          s.placement_points
        FROM stats_old s
        LEFT JOIN users u ON u.phone = s.user_phone
      `);
    }
  } catch (e) {
    console.error("Error migrando stats:", e);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS tournament_organizers (
      competition_id INTEGER,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (competition_id, user_id),
      FOREIGN KEY (competition_id) REFERENCES competitions(id),
      FOREIGN KEY (user_id) REFERENCES users(google_id)
    )
  `);

  // Membresias por liga/torneo (join por link/codigo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS competition_members (
      competition_id INTEGER,
      user_id TEXT,
      role TEXT DEFAULT 'PLAYER' CHECK(role IN ('ADMIN', 'ORGANIZER', 'PLAYER')),
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'LEFT', 'BANNED')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (competition_id, user_id),
      FOREIGN KEY (competition_id) REFERENCES competitions(id),
      FOREIGN KEY (user_id) REFERENCES users(google_id)
    )
  `);

  // Competición Default
  const defaultComp = db.prepare("SELECT * FROM competitions WHERE id = 1").get();
  if (!defaultComp) {
    db.prepare(`
      INSERT INTO competitions (id, name, type, status, admin_id) 
      VALUES (1, 'Liga Beta', 'LIGA', 'ACTIVE', NULL)
    `).run();
  }

  console.log('Base de datos evolucionada (Avatar + Squad Invitations).');
}

export default db;
