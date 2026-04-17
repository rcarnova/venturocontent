import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../../lib/retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.
Culture Emergence Practice. Tagline: L'invisibile diventa strategia.
Tono: Diretto, Riflessivo, Essenziale.
Pillar: Economia dell'identità / Anatomia del non detto / Conversazioni che contano / Casi reali.
Audience: HR, founder, CEO, marketing director italiani.`;

const SYSTEM_META = `${BASE}

Analizza l'input e rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"pillar":"uno dei 4 pillar","angolo":"angolo strategico Venturo in 1 frase","linkedin_short":{"testo":"max 300 caratteri. Una tensione o domanda.","hashtag":["#tag1","#tag2"]},"twitter":{"testo":"max 240 caratteri. Aforisma o domanda netta."}}`;

const SYSTEM_LONG = `${BASE}

Scrivi un post LinkedIn long form. Struttura: hook breve, sviluppo, domanda finale. 800-1200 caratteri. A capo per respirare.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"testo":"il post completo","hashtag":["#tag1","#tag2","#tag3"]}`;

const SYSTEM_SUBSTACK = `${BASE}

Scrivi un titolo e apertura newsletter. Intro 150-200 parole, apre riflessione senza dare risposte.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"titolo":"titolo della newsletter","intro":"testo dell apertura"}`;

const SYSTEM_CAROUSEL = `${BASE}

Crea 5 slide tipografiche per un carosello LinkedIn. Ogni slide: titolo max 5 parole, testo max 12 parole.
Fluiscono come racconto: apertura provocatoria, sviluppo, tensione, insight, chiusura con domanda.
Rispondi SOLO con JSON array valido. Niente testo fuori. Niente backtick. Inizia con [ finisci con ].
[{"slide":1,"titolo":"titolo","testo":"testo"},{"slide":2,"titolo":"titolo","testo":"testo"},{"slide":3,"titolo":"titolo","testo":"testo"},{"slide":4,"titolo":"titolo","testo":"testo"},{"slide":5,"titolo":"titolo","testo":"testo"}]`;

const SYSTEM_IMAGE = `${BASE}

Crea un prompt Midjourney per un'immagine prodotto ispirata al post LinkedIn.
Estrai la parola chiave concettuale centrale del post e scegli un oggetto fisico concreto che la rappresenta metaforicamente.
Genera SOLO la parte variabile del prompt in inglese: [oggetto] + [posizione/orientamento] + [sfondo semplice].
Esempio: "a vintage japanese scissors, vertical position, a bit open with paper background"
Esempio: "a worn leather notebook, slightly open at 45 degrees, spine facing camera, on a white linen background"
Esempio: "a brass compass, open and slightly tilted, face up on a cream textured paper background"
Dopo la parte variabile aggiungi sempre esattamente: , product photography, warm golden light from above, soft shadows, vintage advertising photography 1980s, Kodachrome film grain, rich saturated colors, commercial product shot
Rispondi SOLO con il testo del prompt completo. Niente JSON. Niente backtick. Niente spiegazioni.`;

function parseJson(raw) {
  const firstObj = raw.indexOf("{");
  const firstArr = raw.indexOf("[");
  let s, e;

  if (firstObj === -1 && firstArr === -1) throw new Error("JSON non trovato");
  if (firstObj === -1) { s = firstArr; e = raw.lastIndexOf("]"); }
  else if (firstArr === -1) { s = firstObj; e = raw.lastIndexOf("}"); }
  else if (firstArr < firstObj) { s = firstArr; e = raw.lastIndexOf("]"); }
  else { s = firstObj; e = raw.lastIndexOf("}"); }

  if (e === -1) throw new Error("JSON non trovato");
  const jsonStr = raw.slice(s, e + 1);

  // Try direct parse first — apostrophes in values are valid JSON
  try { return JSON.parse(jsonStr); } catch {}

  // Fallback: the model may have included literal newlines inside string values
  // Replace literal newlines inside JSON strings with escaped version
  const fixed = jsonStr.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, " ");
  return JSON.parse(fixed);
}

async function callClaude(system, userContent, maxTokens) {
  const message = await withRetry(() =>
    client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userContent }],
    })
  );
  return message.content.filter(b => b.type === "text").map(b => b.text).join("");
}

export async function POST(req) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return Response.json({ error: "Input vuoto" }, { status: 400 });

    // 5 parallel calls — each small and focused
    const [metaRaw, longRaw, substackRaw, carouselRaw, imageRaw] = await Promise.all([
      callClaude(SYSTEM_META, input, 600),
      callClaude(SYSTEM_LONG, input, 1200),
      callClaude(SYSTEM_SUBSTACK, input, 600),
      callClaude(SYSTEM_CAROUSEL, input, 800),
      callClaude(SYSTEM_IMAGE, input, 200),
    ]);

    const meta = parseJson(metaRaw);

    let linkedin_long = { testo: "", hashtag: [] };
    try { linkedin_long = parseJson(longRaw); }
    catch (e) { console.error("[generate] long parse error:", e.message); }

    let substack = { titolo: "", intro: "" };
    try { substack = parseJson(substackRaw); }
    catch (e) { console.error("[generate] substack parse error:", e.message); }

    let carousel = [];
    try {
      const parsed = parseJson(carouselRaw);
      carousel = Array.isArray(parsed) ? parsed : [];
      console.log("[carousel] slides:", carousel.length);
    } catch (e) {
      console.error("[carousel] parse error:", e.message, "| raw:", carouselRaw.slice(0, 150));
    }

    const image_prompt = imageRaw.trim().replace(/^["'`]|["'`]$/g, "");

    return Response.json({
      pillar: meta.pillar,
      angolo: meta.angolo,
      linkedin_long,
      linkedin_short: meta.linkedin_short,
      twitter: meta.twitter,
      substack,
      carousel,
      image_prompt,
    });
  } catch (err) {
    console.error("[generate] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
