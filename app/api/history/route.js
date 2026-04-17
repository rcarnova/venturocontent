import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const HISTORY_BLOB_KEY = "venturo-history.json";
const MAX_HISTORY = 20;

async function readHistory() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Trova il blob
    const { blobs } = await list({ prefix: HISTORY_BLOB_KEY, token });
    console.log("[history] blobs found:", blobs.length);
    if (!blobs.length) return [];

    // Fetch con token per blob privato
    const res = await fetch(blobs[0].url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    console.log("[history] fetch status:", res.status);

    if (!res.ok) {
      console.error("[history] fetch failed:", res.status);
      return [];
    }

    const text = await res.text();
    console.log("[history] text preview:", text.slice(0, 80));

    const data = JSON.parse(text);
    console.log("[history] entries loaded:", data.length);
    return data;
  } catch (err) {
    console.error("[history] readHistory error:", err.message);
    return [];
  }
}

async function writeHistory(history) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  console.log("[history] writing", history.length, "entries");
  const result = await put(HISTORY_BLOB_KEY, JSON.stringify(history), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
  console.log("[history] written ok:", result.pathname);
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
    console.error("[history] POST error:", err.message);
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
