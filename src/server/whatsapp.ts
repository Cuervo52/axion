import db from './db';
import { processWarzoneCapture } from './gemini';

export async function handleWhatsAppMessage(from: string, body: string, mediaUrl?: string) {
  const command = body.trim().toLowerCase();
  const args = body.split(' ').slice(1);

  // 1. Verificar si el usuario existe
  const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(from) as any;

  // Registro inicial (Mobile First Onboarding)
  if (command.startsWith('!registro')) {
    const gamertag = args[0];
    if (!gamertag) return "Uso: !registro [TuGamertag]\n\nRecuerda usar tu Tag exacto de Warzone.";
    try {
      db.prepare('INSERT INTO users (phone, gamertag) VALUES (?, ?)').run(from, gamertag);
      return `✅ ¡Bienvenido ${gamertag}! Ya puedes unirte a torneos usando el link de invitación o el comando !unirse [codigo].`;
    } catch (e) {
      return "❌ Error: El Gamertag o número ya está registrado.";
    }
  }

  if (!user) {
    return "¡Hola! No estás registrado. Envía *!registro [TuGamertag]* para empezar.";
  }

  // 2. Comandos de ADMIN
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    if (command.startsWith('!crearliga')) {
      const name = args.join(' ');
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      db.prepare('INSERT INTO competitions (name, type, admin_phone, invite_code) VALUES (?, ?, ?, ?)')
        .run(name, 'LIGA', from, inviteCode);
      return `🏆 Liga *${name}* creada.\nCódigo de invitación: *${inviteCode}*\nComparte este link: ${process.env.APP_URL}/join/${inviteCode}`;
    }
  }

  // 3. Unirse a competición
  if (command.startsWith('!unirse')) {
    const code = args[0]?.toUpperCase();
    const comp = db.prepare('SELECT id, name FROM competitions WHERE invite_code = ?').get(code) as any;
    if (!comp) return "❌ Código de invitación inválido.";
    
    // Aquí podrías crear un squad automático o individual
    return `✅ Te has unido a *${comp.name}*. ¡Mucha suerte!`;
  }

  // 4. Procesamiento de Capturas con Auditoría
  if (mediaUrl) {
    // Buscar competición activa del usuario
    const activeComp = db.prepare(`
      SELECT c.id FROM competitions c
      JOIN squad_members sm ON sm.user_phone = ?
      JOIN squads s ON s.id = sm.squad_id AND s.competition_id = c.id
      WHERE c.status = 'ACTIVE' LIMIT 1
    `).get(from) as any;

    const stats = await processWarzoneCapture(mediaUrl);
    if (!stats) return "❌ No pude leer la imagen. Asegúrate de que sea clara.";

    const auditStatus = stats.is_manipulated ? 'PENDING' : 'APPROVED';
    const auditNotes = stats.audit_notes || '';

    try {
      db.prepare('INSERT INTO matches (match_id, competition_id, submitted_by, audit_status, audit_notes) VALUES (?, ?, ?, ?, ?)')
        .run(stats.match_id, activeComp?.id || null, from, auditStatus, auditNotes);

      if (auditStatus === 'PENDING') {
        return "⚠️ Captura recibida pero marcada para REVISIÓN MANUAL por posibles anomalías. Un admin la revisará pronto.";
      }

      let registeredCount = 0;
      for (const player of stats.players) {
        const dbUser = db.prepare('SELECT phone FROM users WHERE gamertag = ?').get(player.gamertag) as any;
        if (dbUser) {
          // Si es un torneo, podríamos preguntar la posición para sumar "Podium Pts"
          // Por ahora sumamos kills y score base
          db.prepare(`
            INSERT INTO stats (match_id, user_phone, kills, points, damage, assists) 
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(stats.match_id, dbUser.phone, player.kills, player.score, player.damage, player.assists);
          registeredCount++;
        }
      }

      return `📊 *Resultados Extraídos*\nID: ${stats.match_id}\n\n` + 
             stats.players.map(p => `👤 *${p.gamertag}*\nKills: ${p.kills} | Daño: ${p.damage}`).join('\n\n') +
             `\n\n✅ ${registeredCount} jugadores del squad actualizados.`;
    } catch (e) {
      return "🚫 Esta partida ya fue registrada anteriormente.";
    }
  }

  return "Comandos:\n!tabla - Ver ranking\n!perfil - Ver mis stats\nO envía tu captura de pantalla.";
}
