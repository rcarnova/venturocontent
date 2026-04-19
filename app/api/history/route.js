export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const TABLE = "venturo_history";
const MAX_HISTORY = 20;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": method === "POST" ? "resolution=merge-duplicates" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${method} failed: ${res.status} ${err.slice(0, 100)}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function readHistory() {
  const data = await supabase("GET", `${TABLE}?order=timestamp.desc&limit=${MAX_HISTORY}`);
  return Array.isArray(data) ? data : [];
}

export async function GET() {
  try {
    const rows = await readHistory();
    const history = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      input: r.input,
      result: r.result,
    }));
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

    // Upsert — insert or update if same id
    await supabase("POST", `${TABLE}`, {
      id: entry.id,
      timestamp: entry.timestamp,
      input: entry.input,
      result: entry.result,
    });

    // Return updated history
    const rows = await readHistory();
    const history = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      input: r.input,
      result: r.result,
    }));
    return Response.json(history);
  } catch (err) {
    console.error("[history] POST error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    await supabase("DELETE", `${TABLE}?id=eq.${id}`);

    const rows = await readHistory();
    const history = rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      input: r.input,
      result: r.result,
    }));
    return Response.json(history);
  } catch (err) {
    console.error("[history] DELETE error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
