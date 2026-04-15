import { put, list } from "@vercel/blob";

const HISTORY_BLOB_KEY = "venturo-history.json";
const MAX_HISTORY = 20;

async function readHistory() {
  try {
    // list cerca il blob per pathname
    const { blobs } = await list({ prefix: HISTORY_BLOB_KEY });
    if (!blobs.length) return [];

    // Fetch con token per blob privato
    const res = await fetch(blobs[0].url, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function writeHistory(history) {
  await put(HISTORY_BLOB_KEY, JSON.stringify(history), {
    access: "public", // serve public per poter fare fetch senza auth lato client
    addRandomSuffix: false,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
}

export async function GET() {
  try {
    const history = await readHistory();
    return Response.json(history);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const entry = await req.json();
    if (!entry?.id) return Response.json({ error: "Entry non valida" }, { status: 400 });

    const history = await readHistory();
    const filtered = history.filter(e => e.id !== entry.id);
    const newHistory = [entry, ...filtered].slice(0, MAX_HISTORY);
    await writeHistory(newHistory);
    return Response.json(newHistory);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    const history = await readHistory();
    const newHistory = history.filter(e => e.id !== id);
    await writeHistory(newHistory);
    return Response.json(newHistory);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
