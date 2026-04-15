import { put, head, del } from "@vercel/blob";

const HISTORY_BLOB_KEY = "venturo-history.json";
const MAX_HISTORY = 20;

async function readHistory() {
  try {
    const blob = await head(HISTORY_BLOB_KEY);
    if (!blob) return [];
    const res = await fetch(blob.url);
    return await res.json();
  } catch {
    return [];
  }
}

async function writeHistory(history) {
  await put(HISTORY_BLOB_KEY, JSON.stringify(history), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
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
