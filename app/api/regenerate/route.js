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
  carousel: {
    instruction: `Crea 5 slide tipografiche per un carosello LinkedIn che sintetizzano il post. Ogni slide ha un titolo (max 5 parole) e una frase chiave (max 12 parole). Le slide devono fluire come un racconto: apertura provocatoria, sviluppo, tensione, insight, chiusura con domanda o call to action. Tono Venturo: diretto, essenziale, riflessivo.`,
    schema: '[{"slide":1,"titolo":"titolo","testo":"frase"},{"slide":2,"titolo":"titolo","testo":"frase"},{"slide":3,"titolo":"titolo","testo":"frase"},{"slide":4,"titolo":"titolo","testo":"frase"},{"slide":5,"titolo":"titolo","testo":"frase"}]',
  },
  image_prompt: {
                    instruction: `Crea un prompt Midjourney per un'immagine prodotto ispirata al contenuto.
Estrai la parola chiave concettuale centrale e scegli un oggetto fisico concreto che la rappresenta metaforicamente.
Genera la parte variabile in inglese: [oggetto] + [posizione] + [sfondo semplice].
Poi aggiungi sempre: , product photography, warm golden light from above, soft shadows, vintage advertising photography 1980s, Kodachrome film grain, rich saturated colors, commercial product shot
Rispondi SOLO con il testo del prompt. Niente JSON. Niente backtick.`,
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
    if (s !== -1 && e !== -1) return JSON.parse(raw.slice(s, e + 1));
  } catch {}
  const cleaned = raw.replace(/[\r\n]+/g, "\\n").replace(/\t/g, " ");
  try {
    const s = cleaned.indexOf("{");
    const e = cleaned.lastIndexOf("}");
    if (s !== -1 && e !== -1) return JSON.parse(cleaned.slice(s, e + 1));
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
