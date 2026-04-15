import { put, list, head } from "@vercel/blob";

const HISTORY_BLOB_KEY = "venturo-history.json";
const MAX_HISTORY = 20;

async function readHistory() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Cerca il blob
    const { blobs } = await list({ prefix: HISTORY_BLOB_KEY, token });
    console.log("[history] list result:", blobs.length, "blobs");

    if (!blobs.length) return [];

    // Fetch con il token nell'header Authorization
    const url = blobs[0].downloadUrl || blobs[0].url;
    console.log("[history] fetching url:", url);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("[history] fetch status:", res.status);
    if (!res.ok) {
      const txt = await res.text();
      console.error("[history] fetch error body:", txt.slice(0, 200));
      return [];
    }

    const data = await res.json();
    console.log("[history] loaded entries:", data.length);
    return data;
  } catch (err) {
    console.error("[history] readHistory error:", err.message);
    return [];
  }
}

async function writeHistory(history) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  console.log("[history] writing", history.length, "entries with token:", token?.slice(0, 10));

  try {
    const result = await put(HISTORY_BLOB_KEY, JSON.stringify(history), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json",
      token,
    });
    console.log("[history] put success, url:", result.url);
    return result;
  } catch (err) {
    console.error("[history] put error:", err.message, JSON.stringify(err));
    throw err;
  }
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
    console.log("[history] POST entry id:", entry?.id);
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
