import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY no está configurada. Las funciones de IA fallarán.");
      // Inicializamos con una clave dummy para evitar el crash, pero fallará al usarse
      return new GoogleGenAI({ apiKey: "dummy_key_to_prevent_crash" });
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

export interface WarzoneStats {
  match_id: string;
  players: {
    gamertag: string;
    score: number;
    eliminations: number;
    kills: number;
    assists: number;
    redeploys: number;
    damage: number;
  }[];
  is_manipulated: boolean;
  audit_notes?: string;
  confidence_score: number;
}

export async function processWarzoneCapture(imageUrl: string): Promise<WarzoneStats | null> {
  try {
    const ai = getAiClient();
    // En un entorno real, descargaríamos la imagen y la pasaríamos como base64
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString('base64');

    const model = "gemini-3-flash-preview";
    
    const systemInstruction = `
      Actúa como un auditor forense de Call of Duty: Warzone. 
      Analiza la foto de la pantalla de resultados (Resurgimiento/Battle Royale).
      
      DATOS A EXTRAER POR JUGADOR (Columnas de la tabla):
      - NOMBRE (Gamertag)
      - PUNTUACIÓN (Score)
      - ELIMINACIONES (Total de bajas/jugadores eliminados)
      - BAJAS (Kills - solo las causadas por el jugador)
      - ASISTENCIAS (Assists - cuando ayudaste a eliminar un enemigo)
      - REDESPLIEGUES (Redeploys - cuantas veces regressaste al juego)
      - DAÑO (Damage - daño total causado)
      
      DATOS DE PARTIDA:
      - ID de la partida (Cadena alfanumérica en las esquinas)
      
      AUDITORÍA DE FRAUDE:
      - Verifica si los números son consistentes.
      - Revisa si el ID de la partida ha sido alterado.
      
      Devuelve un JSON estructurado.
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: [
        {
          parts: [
            { text: "Analiza esta captura de Warzone. Extrae los datos y audita su autenticidad." },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            match_id: { type: Type.STRING },
            players: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gamertag: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  eliminations: { type: Type.INTEGER },
                  kills: { type: Type.INTEGER },
                  assists: { type: Type.INTEGER },
                  redeploys: { type: Type.INTEGER },
                  damage: { type: Type.INTEGER }
                },
                required: ["gamertag", "score", "eliminations", "kills", "assists", "redeploys", "damage"]
              }
            },
            is_manipulated: { type: Type.BOOLEAN },
            audit_notes: { type: Type.STRING },
            confidence_score: { type: Type.NUMBER }
          },
          required: ["match_id", "players", "is_manipulated"]
        }
      }
    });

    const text = result.text;
    if (!text) return null;
    
    return JSON.parse(text) as WarzoneStats;
  } catch (error) {
    console.error("Error procesando imagen con Gemini:", error);
    return null;
  }
}
