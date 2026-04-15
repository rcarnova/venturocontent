import { put, list, get } from "@vercel/blob";

const HISTORY_BLOB_KEY = "venturo-history.json";
const MAX_HISTORY = 20;

async function readHistory() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const { blobs } = await list({ prefix: HISTORY_BLOB_KEY, token });
    console.log("[history] blobs found:", blobs.length);
    if (!blobs.length) return [];

    const blob = await get(blobs[0].url, { token });
    const text = await blob.text();
    return JSON.parse(text);
  } catch (err) {
    console.error("[history] readHistory error:", err.message);
    return [];
  }
}

async function writeHistory(history) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const result = await put(HISTORY_BLOB_KEY, JSON.stringify(history), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    token,
  });
  console.log("[history] written:", result.url);
}

export async function GET() {
  try {
    const history = await readHistory();
    return Response.json(history);
  } catch (err) {
    console.error("[history] GET error:", err.message);
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
    console.error("[history] POST error:", err.message, err.stack);
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
    console.error("[history] DELETE error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
