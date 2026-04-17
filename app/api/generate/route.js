import Anthropic from "@anthropic-ai/sdk";
import { withRetry } from "../../lib/retry";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.

IDENTITA: Culture Emergence Practice. Tagline: L'invisibile diventa strategia. Belief: L'identità non è un tema soft, è l'unica strategia che regge. Nemico: apparire senza sostanza.

TONO: Diretto (vai al punto), Riflessivo (domande potenti), Essenziale (sintesi con calore).

CONTENT PILLARS:
1. Economia dell'identità — ROI dell'identità chiara
2. Anatomia del non detto — pattern invisibili che bloccano le organizzazioni
3. Conversazioni che contano — metodo Lumen, domande potenti
4. Casi reali — prima/dopo sulla consapevolezza organizzativa

AUDIENCE: HR, founder, CEO, marketing director italiani.

Rispondi SOLO con JSON valido. Niente testo fuori dal JSON. Niente backtick. Inizia con { finisci con }.

{"pillar":"uno dei 4 pillar","angolo":"angolo strategico Venturo in 1 frase","linkedin_long":{"testo":"post 800-1200 caratteri: hook breve, sviluppo, domanda finale. Tono Venturo. A capo per respirare.","hashtag":["#tag1","#tag2","#tag3"]},"linkedin_short":{"testo":"max 300 caratteri. Una tensione o domanda.","hashtag":["#tag1","#tag2"]},"twitter":{"testo":"max 240 caratteri. Aforisma o domanda netta."},"substack":{"titolo":"titolo newsletter Venturo","intro":"150-200 parole. Apre riflessione, non dà risposte."},"image_prompt":"prompt Midjourney per un billboard nel deserto. Identifica la parola chiave concettuale centrale del post (es: CULTURA, IDENTITA, COERENZA) e costruisci il prompt in questo formato esatto: [parola chiave] scritta in maiuscolo sul billboard, billboard classico americano nel deserto del Mojave, luce radente dorata al tramonto, fotografia analogica editoriale, atmosfera Prada Marfa, colori desaturati, cielo vasto, montagne in lontananza, nessuna persona --no logos --ar 16:9 --v 6.1 --style raw"}`;

// Sanitize control chars then extract JSON using a brace counter.
// lastIndexOf("}") is unreliable when the LLM appends trailing text containing }.
function extractJson(raw) {
  // Escape literal control chars so the brace counter and JSON.parse agree
  const sanitized = raw.replace(/[\x00-\x1F\x7F]/g, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    if (c === "\t") return "\\t";
    if (c === "\b") return "\\b";
    if (c === "\f") return "\\f";
    return "";
  });

  const start = sanitized.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < sanitized.length; i++) {
    const c = sanitized[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (depth === 0) return sanitized.slice(start, i + 1);
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return Response.json({ error: "Input vuoto" }, { status: 400 });

    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM,
        messages: [{ role: "user", content: input }],
      })
    );

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    console.log("[generate] Raw response length:", raw.length);

    const jsonStr = extractJson(raw);
    if (!jsonStr) {
      console.error("[generate] JSON not found. Raw:", raw.slice(0, 500));
      throw new Error("JSON non trovato nella risposta");
    }
    console.log("[generate] Extracted JSON length:", jsonStr.length);

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      const pos = parseInt(parseErr.message.match(/position (\d+)/)?.[1] || "0");
      console.error("[generate] JSON parse error:", parseErr.message);
      console.error("[generate] Around position:", jsonStr.slice(Math.max(0, pos - 100), Math.min(jsonStr.length, pos + 100)));
      throw new Error(`JSON parsing failed: ${parseErr.message}`);
    }
    return Response.json(parsed);
  } catch (err) {
    console.error("[generate] Error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
