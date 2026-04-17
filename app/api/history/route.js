import { put, list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const HISTORY_BLOB_KEY = "venturo-history.json";
const MAX_HISTORY = 20;

async function readHistory() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const { blobs } = await list({ prefix: HISTORY_BLOB_KEY, token });
    console.log("[history] blobs found:", blobs.length);
    if (!blobs.length) return [];

    const blob = blobs[0];
    console.log("[history] blob url:", blob.url?.slice(0, 60));

    // For private blobs on Vercel, use the downloadUrl if available,
    // otherwise append the token as query param
    const downloadUrl = blob.downloadUrl || `${blob.url}?token=${token}`;

    const res = await fetch(downloadUrl, { cache: "no-store" });
    console.log("[history] fetch status:", res.status);

    if (!res.ok) {
      const body = await res.text();
      console.error("[history] fetch error:", res.status, body.slice(0, 100));
      return [];
    }

    const data = await res.json();
    console.log("[history] entries loaded:", Array.isArray(data) ? data.length : "not array");
    return Array.isArray(data) ? data : [];
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
