import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHANNEL_PROMPTS = {
  linkedin_long: `Scrivi UN post LinkedIn long form per Venturo. Tono: diretto, riflessivo, essenziale. Struttura: hook breve → sviluppo → domanda finale. Lunghezza: 800-1200 caratteri. A capo per respirare. Rispondi SOLO con JSON: {"testo":"...","hashtag":["#t1","#t2","#t3"]}`,
  linkedin_short: `Scrivi UN post LinkedIn short form per Venturo. Max 300 caratteri. Una tensione o domanda netta. Tono Venturo: diretto, essenziale. Rispondi SOLO con JSON: {"testo":"...","hashtag":["#t1","#t2"]}`,
  twitter: `Scrivi UN tweet per Venturo. Max 240 caratteri. Aforisma o domanda provocatoria. Tono diretto ed essenziale. Rispondi SOLO con JSON: {"testo":"..."}`,
  substack: `Scrivi UN'apertura newsletter per Venturo. 150-200 parole. Apre una riflessione, non dà risposte. Tono riflessivo. Rispondi SOLO con JSON: {"titolo":"...","intro":"..."}`,
  image_prompt: `Crea UN prompt per generare un'immagine coerente con il contenuto. Stile: minimal editoriale, no persone stilizzate. Descrivi composizione, palette, atmosfera. Rispondi SOLO con JSON: {"prompt":"..."}`,
};

const BASE_CONTEXT = `Sei il motore editoriale di Venturo, boutique di consulenza in cultura organizzativa ed employer branding.
Positioning: Culture Emergence Practice. Tagline: L'invisibile diventa strategia.
Belief: L'identità non è un tema soft, è l'unica strategia che regge.
Tono: Diretto, Riflessivo, Essenziale.
Pillar: Economia dell'identità / Anatomia del non detto / Conversazioni che contano / Casi reali.
Audience: HR, founder, CEO, marketing director italiani.
Rispondi SOLO con JSON valido. Niente testo fuori. Niente backtick.`;

export async function POST(req) {
  try {
    const { input, channel } = await req.json();
    if (!input?.trim()) return Response.json({ error: "Input vuoto" }, { status: 400 });
    if (!CHANNEL_PROMPTS[channel]) return Response.json({ error: "Canale non valido" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: BASE_CONTEXT,
      messages: [{
        role: "user",
        content: `INPUT ORIGINALE:\n${input}\n\n${CHANNEL_PROMPTS[channel]}`,
      }],
    });

    const raw = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("JSON non trovato");

    const parsed = JSON.parse(raw.slice(s, e + 1));

    // Normalize image_prompt — può tornare come {prompt:"..."} o stringa diretta
    if (channel === "image_prompt") {
      return Response.json({ value: parsed.prompt || raw.slice(s, e + 1) });
    }

    return Response.json({ value: parsed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
