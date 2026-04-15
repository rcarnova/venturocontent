import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_CONTEXT = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.
Positioning: Culture Emergence Practice. Tagline: L'invisibile diventa strategia.
Belief: L'identita non e un tema soft, e l'unica strategia che regge.
Tono: Diretto, Riflessivo, Essenziale.
Pillar: Economia dell identita / Anatomia del non detto / Conversazioni che contano / Casi reali.
Audience: HR, founder, CEO, marketing director italiani.`;

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
    instruction: "Scrivi un titolo e un'apertura newsletter per Venturo. L'intro deve essere 150-200 parole, aprire una riflessione senza dare risposte.",
    schema: `{"titolo":"titolo della newsletter","intro":"testo dell apertura"}`,
  },
  image_prompt: {
    instruction: "Crea un prompt per generare un'immagine coerente con il contenuto. Stile minimal editoriale, no persone stilizzate. Descrivi composizione, palette, atmosfera.",
    schema: `{"prompt":"descrizione dell immagine"}`,
  },
};

function sanitizeForJson(str) {
  return str
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ") // remove control chars
    .replace(/\\/g, "\\\\")                          // escape backslashes
    .replace(/"/g, '\\"');                           // escape quotes
}

function extractJson(raw) {
  // Try direct parse first
  try {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      return JSON.parse(raw.slice(s, e + 1));
    }
  } catch {}

  // Try to extract and sanitize each value manually
  // This handles cases where the model puts unescaped quotes in values
  const cleaned = raw
    .replace(/[\r\n]+/g, "\\n")           // newlines to \n
    .replace(/\t/g, " ");                  // tabs to space

  try {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      return JSON.parse(cleaned.slice(s, e + 1));
    }
  } catch {}

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
- NON usare apostrofi nei valori JSON — sostituiscili con accenti o riformula
- NON usare virgolette doppie dentro i valori — riformula la frase
- NON usare backslash nei valori
- Niente testo fuori dal JSON, niente backtick, niente markdown`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `INPUT:\n${input}`,
      }],
    });

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    const parsed = extractJson(raw);

    // Normalize image_prompt response
    if (channel === "image_prompt") {
      return Response.json({ value: parsed.prompt || "" });
    }

    return Response.json({ value: parsed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
