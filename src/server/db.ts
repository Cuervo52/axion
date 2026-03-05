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
      gamertag TEXT NOT NULL UNIQUE, -- Formato: Nombre#1234
      avatar_url TEXT,
      phone TEXT,
      role TEXT DEFAULT 'PLAYER' CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'PLAYER')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ligas y Torneos
  db.exec(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('LIGA', 'TORNEO')),
      status TEXT DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ACTIVE', 'FINISHED')),
      admin_id TEXT,
      invite_code TEXT UNIQUE,
      rules TEXT,
      start_date DATETIME,
      end_date DATETIME,
      FOREIGN KEY (admin_id) REFERENCES users(google_id)
    )
  `);

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
