import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../../lib/retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_MAIN = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.

IDENTITA: Culture Emergence Practice. Tagline: L'invisibile diventa strategia. Belief: L'identità non è un tema soft, è l'unica strategia che regge. Nemico: apparire senza sostanza.

TONO: Diretto (vai al punto), Riflessivo (domande potenti), Essenziale (sintesi con calore).

CONTENT PILLARS:
1. Economia dell'identità — ROI dell'identità chiara
2. Anatomia del non detto — pattern invisibili che bloccano le organizzazioni
3. Conversazioni che contano — metodo Lumen, domande potenti
4. Casi reali — prima/dopo sulla consapevolezza organizzativa

AUDIENCE: HR, founder, CEO, marketing director italiani.

Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick. Inizia con { finisci con }.

{"pillar":"uno dei 4 pillar","angolo":"angolo strategico Venturo in 1 frase","linkedin_long":{"testo":"post 800-1200 caratteri: hook breve, sviluppo, domanda finale. Tono Venturo. A capo per respirare.","hashtag":["#tag1","#tag2","#tag3"]},"linkedin_short":{"testo":"max 300 caratteri. Una tensione o domanda.","hashtag":["#tag1","#tag2"]},"twitter":{"testo":"max 240 caratteri. Aforisma o domanda netta."},"substack":{"titolo":"titolo newsletter Venturo","intro":"150-200 parole. Apre riflessione, non dà risposte."}}`;

const SYSTEM_CAROUSEL = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.
Tono: Diretto, Riflessivo, Essenziale. Audience: HR, founder, CEO italiani.

Crea 5 slide tipografiche per un carosello LinkedIn che sintetizzano il post fornito.
Ogni slide: titolo max 5 parole, testo max 12 parole. Fluiscono come racconto: apertura provocatoria, sviluppo, tensione, insight, chiusura con domanda.

Rispondi SOLO con JSON. Niente testo fuori. Niente backtick.
[{"slide":1,"titolo":"titolo","testo":"testo"},{"slide":2,"titolo":"titolo","testo":"testo"},{"slide":3,"titolo":"titolo","testo":"testo"},{"slide":4,"titolo":"titolo","testo":"testo"},{"slide":5,"titolo":"titolo","testo":"testo"}]`;

const SYSTEM_IMAGE = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.

Crea un prompt Midjourney per un billboard nel deserto ispirato al contenuto.
Identifica la parola chiave concettuale centrale (es: CULTURA, IDENTITA, COERENZA).
Formato: [PAROLA CHIAVE] scritta in maiuscolo sul billboard, billboard classico americano nel deserto del Mojave, luce radente dorata al tramonto, fotografia analogica editoriale, atmosfera Prada Marfa, colori desaturati, cielo vasto, montagne in lontananza, nessuna persona --no logos --ar 16:9

Rispondi SOLO con il testo del prompt, senza JSON, senza backtick, senza spiegazioni.`;

function sanitizeJson(str) {
  return str.replace(/[\u0000-\u001F\u007F]/g, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "";
    if (c === "\t") return " ";
    return "";
  });
}

function parseJson(raw) {
  const s = raw.indexOf("{") !== -1 ? raw.indexOf("{") : raw.indexOf("[");
  const e = raw.lastIndexOf("}") !== -1 ? raw.lastIndexOf("}") : raw.lastIndexOf("]");
  if (s === -1 || e === -1) throw new Error("JSON non trovato");
  return JSON.parse(sanitizeJson(raw.slice(s, e + 1)));
}

async function callClaude(system, userContent, maxTokens = 1500) {
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

    // Run all three calls in parallel
    const [mainRaw, carouselRaw, imageRaw] = await Promise.all([
      callClaude(SYSTEM_MAIN, input, 2000),
      callClaude(SYSTEM_CAROUSEL, input, 800),
      callClaude(SYSTEM_IMAGE, input, 300),
    ]);

    // Parse main
    const main = parseJson(mainRaw);

    // Parse carousel
    let carousel = [];
    try {
      const parsed = parseJson(carouselRaw);
      carousel = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("carousel parse error:", e.message);
    }

    // Image prompt is plain text
    const image_prompt = imageRaw.trim().replace(/^["']|["']$/g, "");

    return Response.json({
      ...main,
      carousel,
      image_prompt,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
