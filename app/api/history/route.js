export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";
const REPO = process.env.GITHUB_REPO; // es: rcarnova/venturocontent
const FILE_PATH = "data/history.json";
const BRANCH = "main";
const MAX_HISTORY = 20;

async function githubRequest(method, path, body) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return res;
}

async function readHistory() {
  try {
    const res = await githubRequest("GET", FILE_PATH);
    if (res.status === 404) return { data: [], sha: null };
    if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
    const json = await res.json();
    const content = Buffer.from(json.content, "base64").toString("utf-8");
    return { data: JSON.parse(content), sha: json.sha };
  } catch (err) {
    console.error("[history] readHistory error:", err.message);
    return { data: [], sha: null };
  }
}

async function writeHistory(history, sha) {
  const content = Buffer.from(JSON.stringify(history, null, 2)).toString("base64");
  const body = {
    message: "update history",
    content,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const res = await githubRequest("PUT", FILE_PATH, body);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} ${err.slice(0, 100)}`);
  }
  console.log("[history] written ok");
}

export async function GET() {
  try {
    const { data } = await readHistory();
    return Response.json(data);
  } catch (err) {
    console.error("[history] GET error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const entry = await req.json();
    if (!entry?.id) return Response.json({ error: "Entry non valida" }, { status: 400 });

    const { data, sha } = await readHistory();
    const filtered = data.filter(e => e.id !== entry.id);
    const newHistory = [entry, ...filtered].slice(0, MAX_HISTORY);
    await writeHistory(newHistory, sha);
    return Response.json(newHistory);
  } catch (err) {
    console.error("[history] POST error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { id } = await req.json();
    const { data, sha } = await readHistory();
    const newHistory = data.filter(e => e.id !== id);
    await writeHistory(newHistory, sha);
    return Response.json(newHistory);
  } catch (err) {
    console.error("[history] DELETE error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
