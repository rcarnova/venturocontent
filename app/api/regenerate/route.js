import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../../lib/retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHANNEL_INSTRUCTIONS = {
  linkedin_long: {
    instruction: "Scrivi un post LinkedIn long form per Venturo. Struttura: hook breve, sviluppo, domanda finale. Lunghezza: 800-1200 caratteri. Tono diretto e riflessivo.",
    schema: `{"testo":"il testo del post","hashtag":["#tag1","#tag2","#tag3"]}`,
  },
  linkedin_short: {
    instruction: "Scrivi un post LinkedIn short form per Venturo. Max 300 caratteri. Una tensione o domanda netta.",
    schema: `{"testo":"il testo del post","hashtag":["#tag1","#tag2"]}`,
  },
  twitter: {
    instruction: "Scrivi un tweet per Venturo. Max 240 caratteri. Aforisma o domanda provocatoria.",
    schema: `{"testo":"il testo del tweet"}`,
  },
  substack: {
    instruction: "Scrivi un titolo e un apertura newsletter per Venturo. L'intro deve essere 150-200 parole, aprire una riflessione senza dare risposte.",
    schema: `{"titolo":"titolo della newsletter","intro":"testo dell apertura"}`,
  },
  image_prompt: {
            instruction: `Crea un prompt Midjourney per un billboard nel deserto ispirato al contenuto.
Formato esatto da usare: [PAROLA CHIAVE] scritta in maiuscolo sul billboard, billboard classico americano nel deserto del Mojave, luce radente dorata al tramonto, fotografia analogica editoriale, atmosfera Prada Marfa, colori desaturati, cielo vasto, montagne in lontananza, nessuna persona --no logos --ar 16:9
Identifica la parola chiave concettuale centrale del post e sostituiscila a [PAROLA CHIAVE].`,
    schema: '{"prompt":"il prompt Midjourney completo"}',
  },
};

const BASE_CONTEXT = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.
Positioning: Culture Emergence Practice. Tagline: L'invisibile diventa strategia.
Belief: L'identita non e un tema soft, e l'unica strategia che regge.
Tono: Diretto, Riflessivo, Essenziale.
Pillar: Economia dell identita / Anatomia del non detto / Conversazioni che contano / Casi reali.
Audience: HR, founder, CEO, marketing director italiani.`;

function extractJson(raw) {
  try {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      const jsonStr = raw.slice(s, e + 1);
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error("[regenerate] First parse attempt failed:", err.message);
  }

  // Try with control character cleanup — escape rather than replace to preserve content
  const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    if (c === "\t") return "\\t";
    if (c === "\b") return "\\b";
    if (c === "\f") return "\\f";
    return "";
  });
  try {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      const jsonStr = cleaned.slice(s, e + 1);
      return JSON.parse(jsonStr);
    }
  } catch (err) {
    console.error("[regenerate] Second parse attempt failed:", err.message);
  }

  console.error("[regenerate] Raw response:", raw.slice(0, 500));
  throw new Error("JSON non parsabile. Raw: " + raw.slice(0, 300));
}

export async function POST(req) {
  try {
    const { input, channel } = await req.json();
    if (!input?.trim()) return Response.json({ error: "Input vuoto" }, { status: 400 });
    if (!CHANNEL_INSTRUCTIONS[channel]) return Response.json({ error: "Canale non valido" }, { status: 400 });

    const { instruction, schema } = CHANNEL_INSTRUCTIONS[channel];

    const systemPrompt = `${BASE_CONTEXT}

ISTRUZIONE: ${instruction}

FORMATO RISPOSTA: Rispondi ESCLUSIVAMENTE con JSON valido in questo formato esatto:
${schema}

REGOLE CRITICHE per il JSON:
- Usa SOLO virgolette doppie per chiavi e valori
- NON usare apostrofi nei valori JSON
- NON usare virgolette doppie dentro i valori
- Niente testo fuori dal JSON, niente backtick, niente markdown`;

    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: `INPUT:\n${input}` }],
      })
    );

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = extractJson(raw);

    if (channel === "image_prompt") {
      return Response.json({ value: parsed.prompt || "" });
    }
    return Response.json({ value: parsed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
