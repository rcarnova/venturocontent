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

{"pillar":"uno dei 4 pillar","angolo":"angolo strategico Venturo in 1 frase","linkedin_long":{"testo":"post 800-1200 caratteri: hook breve, sviluppo, domanda finale. Tono Venturo. A capo per respirare.","hashtag":["#tag1","#tag2","#tag3"]},"linkedin_short":{"testo":"max 300 caratteri. Una tensione o domanda.","hashtag":["#tag1","#tag2"]},"twitter":{"testo":"max 240 caratteri. Aforisma o domanda netta."},"substack":{"titolo":"titolo newsletter Venturo","intro":"150-200 parole. Apre riflessione, non dà risposte."},"image_prompt":"prompt Midjourney per un billboard nel deserto. Identifica la parola chiave concettuale centrale del post (es: CULTURA, IDENTITA, COERENZA) e costruisci il prompt in questo formato esatto: [parola chiave] scritta in maiuscolo sul billboard, billboard classico americano nel deserto del Mojave, luce radente dorata al tramonto, fotografia analogica editoriale, atmosfera Prada Marfa, colori desaturati, cielo vasto, montagne in lontananza, nessuna persona --no logos --ar 16:9"}`;

export async function POST(req) {
  try {
    const { input } = await req.json();
    if (!input?.trim()) return Response.json({ error: "Input vuoto" }, { status: 400 });

    const message = await withRetry(() =>
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: input }],
      })
    );

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("JSON non trovato nella risposta");

    const parsed = JSON.parse(raw.slice(s, e + 1));
    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
