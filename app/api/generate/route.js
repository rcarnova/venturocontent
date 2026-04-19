import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../../lib/retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── VENTURO (prima persona plurale, voce istituzionale) ───────────────────

const BASE = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.
Culture Emergence Practice. Tagline: L'invisibile diventa strategia.
Tono: Diretto, Riflessivo, Essenziale. Prima persona PLURALE (noi, ci, nostro).
Pillar: Economia dell'identità / Anatomia del non detto / Conversazioni che contano / Casi reali.
Audience: HR, founder, CEO, marketing director italiani.
IMPORTANTE: Scrivi sempre in italiano corretto con tutti gli accenti (è, à, ù, ì, ò) e apostrofi (dell'identità, l'organizzazione, c'è).`;

const SYSTEM_META = `${BASE}

Analizza l'input e rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"pillar":"uno dei 4 pillar","angolo":"angolo strategico Venturo in 1 frase","linkedin_short":{"testo":"max 300 caratteri. Una tensione o domanda.","hashtag":["#tag1","#tag2"]},"twitter":{"testo":"max 240 caratteri. Aforisma o domanda netta."}}`;

const SYSTEM_LONG = `${BASE}

Scrivi un post LinkedIn long form. Prima persona PLURALE. Struttura: hook breve, sviluppo, domanda finale. 800-1200 caratteri. A capo per respirare.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"testo":"il post completo","hashtag":["#tag1","#tag2","#tag3"]}`;

const SYSTEM_BLOG = `${BASE}

Scrivi un articolo blog in stile Venturo. Struttura obbligatoria:
1. Titolo incisivo + sottotitolo che anticipa la tesi (1 frase)
2. Apertura: contesto o dati rilevanti (2-3 paragrafi)
3. Problema: il pattern che si ripete nelle organizzazioni
4. Svolta: il punto in cui cambia tutto, spesso da una scena o esperienza concreta
5. Sezione "In sintesi": 4-5 bullet points per chi decide (titolo fisso: "In sintesi (per chi deve decidere)")
6. Sezione "Cosa fare": 3-4 domande pratiche per il lettore
7. Chiusura: 1-2 frasi che rimandano all'azione, senza CTA esplicita
Lunghezza: 600-900 parole. Tono: diretto, autorevole, mai accademico. Prima persona PLURALE.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"titolo":"titolo dell'articolo","sottotitolo":"sottotitolo che anticipa la tesi","corpo":"testo completo dell'articolo con le sezioni indicate"}`;

const SYSTEM_CAROUSEL = `${BASE}

Crea 5 slide tipografiche per un carosello LinkedIn. Ogni slide: titolo max 5 parole, testo max 12 parole.
Fluiscono come racconto: apertura provocatoria, sviluppo, tensione, insight, chiusura con domanda.
Rispondi SOLO con JSON array valido. Niente testo fuori. Niente backtick. Inizia con [ finisci con ].
[{"slide":1,"titolo":"titolo","testo":"testo"},{"slide":2,"titolo":"titolo","testo":"testo"},{"slide":3,"titolo":"titolo","testo":"testo"},{"slide":4,"titolo":"titolo","testo":"testo"},{"slide":5,"titolo":"titolo","testo":"testo"}]`;

// ─── MASSIMO (prima persona singolare, stile personale) ────────────────────

const MASSIMO_BASE = `Sei Massimo Benedetti, partner di Venturo, consulente di cultura organizzativa e storyteller.
Stile: parti sempre da un oggetto concreto o una scena vissuta, poi arrivi al concetto organizzativo.
Tono caldo, colloquiale, prima persona SINGOLARE (io, mi, mio). Coinvolgi il lettore direttamente con "voi" o domande.
Usi emoji sparsi come punteggiatura emotiva, mai eccessivi. Hashtag organici dentro il testo quando pertinenti.
La metafora emerge dall'oggetto, non è dichiarata. Chiudi con un rimando o una domanda aperta.
IMPORTANTE: Scrivi sempre in italiano corretto con tutti gli accenti e apostrofi.`;

const MASSIMO_META = `${MASSIMO_BASE}

Analizza l'input e rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"pillar":"uno dei 4 pillar Venturo","angolo":"angolo strategico in 1 frase stile Massimo","linkedin_short":{"testo":"max 300 caratteri. Concreto, caldo, con un oggetto o scena.","hashtag":["#tag1","#tag2"]},"twitter":{"testo":"max 240 caratteri. Aforisma personale o domanda diretta."}}`;

const MASSIMO_LONG = `${MASSIMO_BASE}

Scrivi un post LinkedIn long form come Massimo Benedetti. Parti da un oggetto o scena concreta, sviluppa la metafora, arrivi al concetto organizzativo. Prima persona singolare. 800-1200 caratteri. A capo per respirare.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.
{"testo":"il post completo","hashtag":["#tag1","#tag2","#tag3"]}`;

const MASSIMO_BLOG = `${MASSIMO_BASE}

Scrivi un articolo blog stile Venturo ma con la voce personale di Massimo Benedetti. Struttura:
1. Titolo + sottotitolo
2. Apertura: una scena o oggetto concreto vissuto da Massimo che porta al tema
3. Sviluppo: il pattern organizzativo che emerge da quella scena
4. Sezione "In sintesi": 4-5 bullet points pratici
5. Sezione "Cosa fare": 3-4 domande per il lettore
6. Chiusura personale
Lunghezza: 600-900 parole. Prima persona singolare. Tono caldo e diretto.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick.
{"titolo":"titolo","sottotitolo":"sottotitolo","corpo":"testo completo"}`;

const MASSIMO_CAROUSEL = `${MASSIMO_BASE}

Crea 5 slide tipografiche per un carosello LinkedIn stile Massimo. Ogni slide: titolo max 5 parole, testo max 12 parole.
Fluiscono come racconto personale: scena concreta, sviluppo, tensione, insight, domanda finale.
Rispondi SOLO con JSON array valido. Niente testo fuori. Niente backtick. Inizia con [ finisci con ].
[{"slide":1,"titolo":"titolo","testo":"testo"},{"slide":2,"titolo":"titolo","testo":"testo"},{"slide":3,"titolo":"titolo","testo":"testo"},{"slide":4,"titolo":"titolo","testo":"testo"},{"slide":5,"titolo":"titolo","testo":"testo"}]`;

// ─── IMAGE (uguale per entrambe le modalità) ───────────────────────────────

const SYSTEM_IMAGE = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.

Crea un prompt Midjourney per uno still life fotografico simbolico ispirato al post LinkedIn.
Estrai la parola chiave concettuale centrale e scegli 1-2 oggetti fisici concreti che la rappresentano metaforicamente.
Genera la parte variabile in inglese: [oggetto] + [posizione/orientamento] + [sfondo semplice].
Poi aggiungi sempre esattamente: , product photography, warm golden light from above, soft shadows, vintage advertising photography 1980s, Kodachrome film grain, rich saturated colors, commercial product shot
Rispondi SOLO con il testo del prompt completo. Niente JSON. Niente backtick. Niente spiegazioni.`;

// ─── UTILS ─────────────────────────────────────────────────────────────────

function parseJson(raw) {
  // Strip markdown code fences if present
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

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

  try { return JSON.parse(jsonStr); } catch {}

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

// ─── HANDLER ───────────────────────────────────────────────────────────────

export async function POST(req) {
  try {
    const { input, mode } = await req.json();
    if (!input?.trim()) return Response.json({ error: "Input vuoto" }, { status: 400 });

    const isMassimo = mode === "massimo";
    const sMeta = isMassimo ? MASSIMO_META : SYSTEM_META;
    const sLong = isMassimo ? MASSIMO_LONG : SYSTEM_LONG;
    const sBlog = isMassimo ? MASSIMO_BLOG : SYSTEM_BLOG;
    const sCarousel = isMassimo ? MASSIMO_CAROUSEL : SYSTEM_CAROUSEL;

    const [metaRaw, longRaw, blogRaw, carouselRaw, imageRaw] = await Promise.all([
      callClaude(sMeta, input, 600),
      callClaude(sLong, input, 1200),
      callClaude(sBlog, input, 1500),
      callClaude(sCarousel, input, 800),
      callClaude(SYSTEM_IMAGE, input, 200),
    ]);

    const meta = parseJson(metaRaw);

    let linkedin_long = { testo: "", hashtag: [] };
    try { linkedin_long = parseJson(longRaw); }
    catch (e) { console.error("[generate] long parse error:", e.message); }

    let blog = { titolo: "", sottotitolo: "", corpo: "" };
    try { blog = parseJson(blogRaw); }
    catch (e) { console.error("[generate] blog parse error:", e.message); }

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
      mode: mode || "venturo",
      linkedin_long,
      linkedin_short: meta.linkedin_short,
      twitter: meta.twitter,
      blog,
      carousel,
      image_prompt,
    });
  } catch (err) {
    console.error("[generate] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
