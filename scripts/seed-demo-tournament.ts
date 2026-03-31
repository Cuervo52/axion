import Database from 'better-sqlite3';

const db = new Database('warzone.db');
db.pragma('foreign_keys = ON');

const leagueName = 'BCS';
const tournamentConfigs = [
  { name: 'jueves 12', status: 'ACTIVE', inviteCode: 'T12DEMO', dayBase: 20, tag: 'CUR' },
  { name: 'jueves 05', status: 'FINISHED', inviteCode: 'T05DEMO', dayBase: 13, tag: 'PA1' },
  { name: 'jueves 29', status: 'FINISHED', inviteCode: 'T29DEMO', dayBase: 6, tag: 'PA2' },
];

const demoPlayers = [
  { google_id: '112758813899045037117', email: 'cristhianamador@gmail.com', gamertag: 'ElCuervo52', role: 'SUPER_ADMIN' },
  { google_id: '103264898159122089248', email: 'cabodigital2000@gmail.com', gamertag: 'Ignacio Agundez', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-01', email: 'demo-bcs-player-01@axion.local', gamertag: 'RuloZone', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-02', email: 'demo-bcs-player-02@axion.local', gamertag: 'LunaKill', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-03', email: 'demo-bcs-player-03@axion.local', gamertag: 'BetoAim', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-04', email: 'demo-bcs-player-04@axion.local', gamertag: 'MajoRush', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-05', email: 'demo-bcs-player-05@axion.local', gamertag: 'TonaShot', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-06', email: 'demo-bcs-player-06@axion.local', gamertag: 'ValeZone', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-07', email: 'demo-bcs-player-07@axion.local', gamertag: 'AxelPing', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-08', email: 'demo-bcs-player-08@axion.local', gamertag: 'IrisDrop', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-09', email: 'demo-bcs-player-09@axion.local', gamertag: 'ZoeStorm', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-10', email: 'demo-bcs-player-10@axion.local', gamertag: 'MaraSnap', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-11', email: 'demo-bcs-player-11@axion.local', gamertag: 'KikeTap', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-12', email: 'demo-bcs-player-12@axion.local', gamertag: 'PakoFlex', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-13', email: 'demo-bcs-player-13@axion.local', gamertag: 'SantiLoot', role: 'PLAYER' },
  { google_id: 'demo-bcs-player-14', email: 'demo-bcs-player-14@axion.local', gamertag: 'MilaBurst', role: 'PLAYER' },
];

const squads = [
  { name: 'Ghost Pack', members: ['112758813899045037117', 'demo-bcs-player-01', 'demo-bcs-player-02', 'demo-bcs-player-03'] },
  { name: 'Solar Reapers', members: ['103264898159122089248', 'demo-bcs-player-04', 'demo-bcs-player-05', 'demo-bcs-player-06'] },
  { name: 'Black Tide', members: ['demo-bcs-player-07', 'demo-bcs-player-08', 'demo-bcs-player-09', 'demo-bcs-player-10'] },
  { name: 'Last Orbit', members: ['demo-bcs-player-11', 'demo-bcs-player-12', 'demo-bcs-player-13', 'demo-bcs-player-14'] },
];

const playerSkill = new Map([
  ['112758813899045037117', 10],
  ['103264898159122089248', 9],
  ['demo-bcs-player-01', 8],
  ['demo-bcs-player-02', 7],
  ['demo-bcs-player-03', 6],
  ['demo-bcs-player-04', 8],
  ['demo-bcs-player-05', 7],
  ['demo-bcs-player-06', 6],
  ['demo-bcs-player-07', 9],
  ['demo-bcs-player-08', 8],
  ['demo-bcs-player-09', 7],
  ['demo-bcs-player-10', 6],
  ['demo-bcs-player-11', 8],
  ['demo-bcs-player-12', 7],
  ['demo-bcs-player-13', 6],
  ['demo-bcs-player-14', 5],
]);

const placementSets = [
  [
    [0, 1, 2, 3],
    [1, 0, 3, 2],
    [2, 0, 1, 3],
    [0, 2, 1, 3],
    [1, 2, 0, 3],
  ],
  [
    [1, 0, 2, 3],
    [0, 1, 2, 3],
    [1, 2, 0, 3],
    [2, 0, 1, 3],
    [0, 1, 3, 2],
  ],
  [
    [2, 0, 1, 3],
    [2, 1, 0, 3],
    [1, 0, 2, 3],
    [0, 1, 2, 3],
    [1, 0, 2, 3],
  ],
];

const placementPoints = [520, 440, 360, 280];

const matchesFkList = db.prepare("PRAGMA foreign_key_list(matches)").all() as Array<{ table: string; to: string }>;
const badMatchesFk = matchesFkList.some((fk) => fk.table === 'users_old' || (fk.table === 'users' && fk.to === 'phone'));
if (badMatchesFk) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('ALTER TABLE matches RENAME TO matches_tmp_fix');
  db.exec(`
    CREATE TABLE matches (
      match_id TEXT PRIMARY KEY,
      competition_id INTEGER,
      submitted_by TEXT,
      mode TEXT,
      position TEXT,
      total_kills INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      total_damage INTEGER DEFAULT 0,
      audit_status TEXT DEFAULT 'APPROVED' CHECK(audit_status IN ('APPROVED', 'PENDING', 'REJECTED')),
      audit_notes TEXT,
      processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competition_id) REFERENCES competitions(id),
      FOREIGN KEY (submitted_by) REFERENCES users(google_id)
    )
  `);
  db.exec(`
    INSERT OR IGNORE INTO matches (
      match_id, competition_id, submitted_by, mode, position, total_kills, total_score, total_damage, audit_status, audit_notes, processed_at
    )
    SELECT
      match_id, competition_id, NULL, mode, position, COALESCE(total_kills, 0), COALESCE(total_score, 0), COALESCE(total_damage, 0), audit_status, audit_notes, processed_at
    FROM matches_tmp_fix
  `);
  db.exec('DROP TABLE matches_tmp_fix');
  db.exec('PRAGMA foreign_keys = ON');
}

const statsFkList = db.prepare("PRAGMA foreign_key_list(stats)").all() as Array<{ table: string }>;
const badStatsFk = statsFkList.some((fk) => fk.table === 'matches_tmp_fix' || fk.table === 'matches_old');
if (badStatsFk) {
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('ALTER TABLE stats RENAME TO stats_tmp_fix');
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
  db.exec(`
    INSERT OR IGNORE INTO stats (id, match_id, user_id, kills, points, damage, assists, placement_points)
    SELECT id, match_id, user_id, COALESCE(kills, 0), COALESCE(points, 0), COALESCE(damage, 0), COALESCE(assists, 0), COALESCE(placement_points, 0)
    FROM stats_tmp_fix
  `);
  db.exec('DROP TABLE stats_tmp_fix');
  db.exec('PRAGMA foreign_keys = ON');
}

const tx = db.transaction(() => {
  for (const player of demoPlayers) {
    db.prepare(`
      INSERT INTO users (google_id, email, gamertag, role)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(google_id) DO UPDATE SET
        email = excluded.email,
        gamertag = excluded.gamertag,
        role = excluded.role
    `).run(player.google_id, player.email, player.gamertag, player.role);
  }

  let league = db.prepare(`SELECT id FROM competitions WHERE name = ? AND type = 'LIGA' LIMIT 1`).get(leagueName) as { id: number } | undefined;
  if (!league) {
    const info = db.prepare(`
      INSERT INTO competitions (name, type, status, admin_id, invite_code, rules)
      VALUES (?, 'LIGA', 'ACTIVE', ?, ?, ?)
    `).run(leagueName, demoPlayers[0].google_id, 'BCSDEMO', JSON.stringify({ league_mode: 'RANDOM' }));
    league = { id: Number(info.lastInsertRowid) };
  }

  db.prepare(`UPDATE competitions SET status = 'ACTIVE', admin_id = ? WHERE id = ?`).run(demoPlayers[0].google_id, league.id);

  for (const player of demoPlayers) {
    const leagueRole = player.google_id === demoPlayers[0].google_id ? 'ADMIN' : 'PLAYER';
    db.prepare(`
      INSERT INTO competition_members (competition_id, user_id, role, status)
      VALUES (?, ?, ?, 'ACTIVE')
      ON CONFLICT(competition_id, user_id) DO UPDATE SET role = excluded.role, status = 'ACTIVE'
    `).run(league.id, player.google_id, leagueRole);
  }

  const summaries: Array<{ tournament: string; summary: any[] }> = [];

  tournamentConfigs.forEach((config, tournamentIndex) => {
    let tournament = db.prepare(`
      SELECT id FROM competitions
      WHERE name = ? AND type = 'TORNEO' AND parent_league_id = ?
      LIMIT 1
    `).get(config.name, league!.id) as { id: number } | undefined;

    if (!tournament) {
      const info = db.prepare(`
        INSERT INTO competitions (
          name, type, status, admin_id, invite_code, parent_league_id, counts_for_league, rules, start_date, end_date
        )
        VALUES (?, 'TORNEO', ?, ?, ?, ?, 1, ?, datetime('now', '-1 day'), datetime('now'))
      `).run(config.name, config.status, demoPlayers[0].google_id, config.inviteCode, league!.id, JSON.stringify({ matches_per_series: 5 }));
      tournament = { id: Number(info.lastInsertRowid) };
    }

    db.prepare(`
      UPDATE competitions
      SET
        status = ?,
        counts_for_league = 1,
        parent_league_id = ?,
        admin_id = ?,
        invite_code = ?,
        rules = ?,
        start_date = ?,
        end_date = ?
      WHERE id = ?
    `).run(
      config.status,
      league!.id,
      demoPlayers[0].google_id,
      config.inviteCode,
      JSON.stringify({ matches_per_series: 5 }),
      `2026-03-${String(config.dayBase).padStart(2, '0')} 19:30:00`,
      `2026-03-${String(config.dayBase + 1).padStart(2, '0')} 00:30:00`,
      tournament.id,
    );

    db.prepare(`
      DELETE FROM competition_members
      WHERE competition_id = ?
    `).run(tournament.id);

    for (const player of demoPlayers) {
      const role = player.google_id === demoPlayers[0].google_id ? 'ADMIN' : 'PLAYER';
      db.prepare(`
        INSERT INTO competition_members (competition_id, user_id, role, status)
        VALUES (?, ?, ?, 'ACTIVE')
      `).run(tournament.id, player.google_id, role);
    }

    const tournamentMatchIds = db.prepare(`SELECT match_id FROM matches WHERE competition_id = ?`).all(tournament.id) as Array<{ match_id: string }>;
    for (const row of tournamentMatchIds) {
      db.prepare(`DELETE FROM stats WHERE match_id = ?`).run(row.match_id);
    }
    db.prepare(`DELETE FROM matches WHERE competition_id = ?`).run(tournament.id);

    const tournamentSquads = db.prepare(`SELECT id FROM squads WHERE competition_id = ?`).all(tournament.id) as Array<{ id: number }>;
    for (const row of tournamentSquads) {
      db.prepare(`DELETE FROM squad_members WHERE squad_id = ?`).run(row.id);
    }
    db.prepare(`DELETE FROM squads WHERE competition_id = ?`).run(tournament.id);

    squads.forEach((squad) => {
      const leaderId = squad.members[0];
      const info = db.prepare(`
        INSERT INTO squads (competition_id, name, leader_id, max_members)
        VALUES (?, ?, ?, 4)
      `).run(tournament!.id, squad.name, leaderId);
      const squadId = Number(info.lastInsertRowid);

      for (const memberId of squad.members) {
        db.prepare(`
          INSERT INTO squad_members (squad_id, user_id, status)
          VALUES (?, ?, 'ACTIVE')
        `).run(squadId, memberId);
      }
    });

    for (let matchIndex = 0; matchIndex < 5; matchIndex++) {
      const matchId = `DEMO-${config.tag}-M0${matchIndex + 1}`;
      const processedAt = `2026-03-${String(config.dayBase + matchIndex).padStart(2, '0')} 20:${String(10 + matchIndex * 7).padStart(2, '0')}:00`;

      let matchKills = 0;
      let matchPoints = 0;
      let matchDamage = 0;

      const playerRows: Array<{
        userId: string;
        kills: number;
        points: number;
        damage: number;
        assists: number;
        placementPoints: number;
      }> = [];

      for (let squadIndex = 0; squadIndex < squads.length; squadIndex++) {
        const placement = placementSets[tournamentIndex][matchIndex][squadIndex];
        const bonus = placementPoints[placement];
        const members = squads[squadIndex].members;

        for (let memberIndex = 0; memberIndex < members.length; memberIndex++) {
          const userId = members[memberIndex];
          const skill = playerSkill.get(userId) || 5;
          const kills = skill + (3 - placement) + ((matchIndex + memberIndex + tournamentIndex) % 3);
          const assists = ((matchIndex + memberIndex + squadIndex + tournamentIndex) % 4) + (placement === 0 ? 1 : 0);
          const damage = 700 + (kills * 205) + (assists * 70) + (skill * 18) + ((matchIndex + tournamentIndex) * 40);
          const placementPts = bonus - (memberIndex * 20);
          const points = Math.round((kills * 120) + (assists * 35) + (damage / 14) + placementPts);

          matchKills += kills;
          matchPoints += points;
          matchDamage += damage;

          playerRows.push({ userId, kills, points, damage, assists, placementPoints: placementPts });
        }
      }

      db.prepare(`
        INSERT INTO matches (
          match_id, competition_id, submitted_by, mode, position, total_kills, total_score, total_damage, audit_status, processed_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?)
      `).run(
        matchId,
        tournament.id,
        demoPlayers[0].google_id,
        'Resurgimiento',
        config.status === 'ACTIVE' ? 'Tabla actual' : 'Cerrado',
        matchKills,
        matchPoints,
        matchDamage,
        processedAt,
      );

      for (const row of playerRows) {
        db.prepare(`
          INSERT INTO stats (match_id, user_id, kills, points, damage, assists, placement_points)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(matchId, row.userId, row.kills, row.points, row.damage, row.assists, row.placementPoints);
      }
    }

    const summary = db.prepare(`
      SELECT
        sq.name,
        COUNT(DISTINCT s.match_id) as matches,
        COALESCE(SUM(s.points), 0) as points,
        COALESCE(SUM(s.kills), 0) as kills
      FROM squads sq
      JOIN squad_members sm ON sm.squad_id = sq.id AND sm.status = 'ACTIVE'
      LEFT JOIN stats s ON s.user_id = sm.user_id
      LEFT JOIN matches m ON m.match_id = s.match_id AND m.competition_id = sq.competition_id
      WHERE sq.competition_id = ?
      GROUP BY sq.id
      ORDER BY points DESC
    `).all(tournament.id);

    summaries.push({ tournament: config.name, summary });
  });

  return { leagueId: league.id, summaries };
});

const result = tx();

console.log(`Demo lista. Liga #${result.leagueId}`);
for (const item of result.summaries) {
  console.log(`\n${item.tournament}`);
  console.table(item.summary);
}
