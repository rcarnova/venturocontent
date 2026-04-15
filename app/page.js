"use client";
import { useState, useEffect } from "react";

const VENTURO_IMAGE_STYLE = `\n\n—\nStile fisso Venturo: fotografia editoriale europea. Nessuna persona. Nessun testo. Palette contenuta: bianchi polverosi, grigi ardesia, un solo accento caldo (ocra o ambra tenue). Luce naturale laterale o diffusa. Composizione essenziale, molto spazio negativo. Atmosfera sospesa, silenziosa. Qualità fotografica concettuale, non illustrativa. Formato orizzontale 16:9. No filtri Instagram, no stock photo aesthetic.`;

const CHANNELS = [
  { id: "linkedin_long", label: "LinkedIn Long", icon: "◈" },
  { id: "linkedin_short", label: "LinkedIn Short", icon: "◇" },
  { id: "twitter", label: "Twitter / X", icon: "✕" },
  { id: "substack", label: "Substack", icon: "◉" },
  { id: "image_prompt", label: "Image Prompt", icon: "▣" },
];

const PILLAR_COLORS = {
  "Economia dell'identità": "#C8A96E",
  "Anatomia del non detto": "#7A8B7F",
  "Conversazioni che contano": "#8B7A6E",
  "Casi reali": "#6E7A8B",
};

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ background: "none", border: "1px solid rgba(200,169,110,0.3)", color: copied ? "#C8A96E" : "rgba(255,255,255,0.35)", padding: "3px 12px", fontSize: "10px", letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase", transition: "color 0.2s" }}
    >
      {copied ? "✓ Copiato" : "Copia"}
    </button>
  );
}

function RegenerateButton({ onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: loading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.3)", padding: "3px 12px", fontSize: "10px", letterSpacing: "0.1em", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", textTransform: "uppercase", transition: "all 0.2s" }}
    >
      {loading ? "↻ ..." : "↻ Rigenera"}
    </button>
  );
}

function ChannelCard({ ch, data, input, onRegenerate }) {
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenError, setRegenError] = useState(null);
  if (!data) return null;

  let content = "";
  if (ch.id === "image_prompt") content = (typeof data === "string" ? data : "") + VENTURO_IMAGE_STYLE;
  else if (ch.id === "substack") content = data.intro || "";
  else content = data.testo || "";
  const displayContent = ch.id === "image_prompt" ? (typeof data === "string" ? data : "") : content;

  const handleRegenerate = async () => {
    setRegenLoading(true); setRegenError(null);
    try {
      const res = await fetch("/api/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, channel: ch.id }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      onRegenerate(ch.id, json.value);
    } catch (err) {
      setRegenError(err.message);
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{ch.icon} {ch.label}</span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <RegenerateButton onClick={handleRegenerate} loading={regenLoading} />
          <CopyButton text={content} />
        </div>
      </div>
      {regenError && <div style={{ marginBottom: "10px", fontSize: "11px", color: "rgba(255,120,120,0.7)", fontFamily: "monospace" }}>{regenError}</div>}
      {ch.id === "substack" && data.titolo && (
        <div style={{ fontSize: "15px", color: "#C8A96E", marginBottom: "10px", fontFamily: "Georgia,serif", fontStyle: "italic", lineHeight: 1.4 }}>{data.titolo}</div>
      )}
      <p style={{
        margin: 0, fontSize: ch.id === "image_prompt" ? "11px" : "14px", lineHeight: 1.78,
        color: regenLoading ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.78)", whiteSpace: "pre-wrap",
        fontFamily: ch.id === "image_prompt" ? "monospace" : "inherit",
        background: ch.id === "image_prompt" ? "rgba(200,169,110,0.04)" : "transparent",
        padding: ch.id === "image_prompt" ? "12px" : "0",
        borderLeft: ch.id === "image_prompt" ? "2px solid rgba(200,169,110,0.2)" : "none",
        transition: "color 0.3s",
      }}>
        {regenLoading ? "Rigenerando…" : displayContent}
      </p>
      {!regenLoading && data.hashtag?.length > 0 && (
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "7px" }}>
          {data.hashtag.map(h => <span key={h} style={{ fontSize: "10px", color: "#C8A96E", opacity: 0.6 }}>{h}</span>)}
        </div>
      )}
    </div>
  );
}

function HistorySidebar({ history, activeId, onSelect, onDelete, loading }) {
  if (loading) return (
    <div style={{ padding: "20px 16px", opacity: 0.3, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)" }}>
      Caricamento…
    </div>
  );
  if (history.length === 0) return (
    <div style={{ padding: "20px 16px", opacity: 0.25, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" }}>
      Nessuno storico
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
      {history.map(entry => (
        <div key={entry.id} onClick={() => onSelect(entry)}
          style={{ padding: "12px 16px", cursor: "pointer", background: activeId === entry.id ? "rgba(200,169,110,0.08)" : "transparent", borderLeft: activeId === entry.id ? "2px solid #C8A96E" : "2px solid transparent", transition: "all 0.15s", position: "relative" }}
          onMouseEnter={e => { if (activeId !== entry.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
          onMouseLeave={e => { if (activeId !== entry.id) e.currentTarget.style.background = "transparent"; }}
        >
          <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: activeId === entry.id ? "#C8A96E" : "rgba(255,255,255,0.3)", marginBottom: "4px" }}>
            {formatDate(entry.timestamp)}
          </div>
          <div style={{ fontSize: "12px", color: activeId === entry.id ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {entry.input.slice(0, 80)}{entry.input.length > 80 ? "…" : ""}
          </div>
          {entry.result?.pillar && (
            <div style={{ marginTop: "5px", fontSize: "9px", color: PILLAR_COLORS[entry.result.pillar] || "#C8A96E", opacity: 0.7 }}>
              {entry.result.pillar}
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
            style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: "14px", padding: "2px 5px", lineHeight: 1 }}
            title="Elimina">×</button>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("linkedin_long");
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [showHistory, setShowHistory] = useState(true);

  // Load history on mount
  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(data => { setHistory(Array.isArray(data) ? data : []); })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, []);

  const saveEntry = async (entry) => {
    try {
      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const updated = await res.json();
      if (Array.isArray(updated)) setHistory(updated);
    } catch {}
  };

  const deleteEntry = async (id) => {
    try {
      const res = await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const updated = await res.json();
      if (Array.isArray(updated)) setHistory(updated);
      if (activeHistoryId === id) setActiveHistoryId(null);
    } catch {}
  };

  const generate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null); setResult(null); setActiveHistoryId(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json);
      setActive("linkedin_long");
      const entry = { id: Date.now().toString(), timestamp: Date.now(), input, result: json };
      setActiveHistoryId(entry.id);
      await saveEntry(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (channelId, newValue) => {
    setResult(prev => {
      const updated = { ...prev, [channelId]: newValue };
      if (activeHistoryId) {
        const updatedHistory = history.map(e => e.id === activeHistoryId ? { ...e, result: updated } : e);
        fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedHistory.find(e => e.id === activeHistoryId)),
        }).then(r => r.json()).then(data => { if (Array.isArray(data)) setHistory(data); }).catch(() => {});
      }
      return updated;
    });
  };

  const handleSelectHistory = (entry) => {
    setInput(entry.input);
    setResult(entry.result);
    setActiveHistoryId(entry.id);
    setActive("linkedin_long");
    setError(null);
  };

  const pillarColor = result ? (PILLAR_COLORS[result.pillar] || "#C8A96E") : "#C8A96E";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        .gen-btn { transition: all 0.2s; }
        .gen-btn:hover:not(:disabled) { background: #D4B87A !important; transform: translateY(-1px); }
        .gen-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .ch-tab { cursor: pointer; transition: opacity 0.15s; }
        .ch-tab:hover { opacity: 0.7; }
        @keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:1} }
        .pulse { animation: pulse 1.4s ease-in-out infinite; }
        @keyframes fadein { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .fadein { animation: fadein 0.3s ease-out; }
      `}</style>

      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: "20px", fontStyle: "italic" }}>Venturo</span>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>Content Suite</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button onClick={() => setShowHistory(h => !h)}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: showHistory ? "#C8A96E" : "rgba(255,255,255,0.3)", padding: "5px 14px", fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
            ◷ Storico {history.length > 0 ? `(${history.length})` : ""}
          </button>
          <span style={{ fontSize: "10px", letterSpacing: "0.11em", color: "rgba(200,169,110,0.5)", textTransform: "uppercase" }}>L&apos;invisibile diventa strategia</span>
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gridTemplateColumns: showHistory ? "220px 1fr 1fr" : "1fr 1fr" }}>

        {showHistory && (
          <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", maxHeight: "calc(100vh - 57px)" }}>
            <div style={{ padding: "16px 16px 8px", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)" }}>Storico condiviso</div>
            <HistorySidebar history={history} activeId={activeHistoryId} onSelect={handleSelectHistory} onDelete={deleteEntry} loading={historyLoading} />
          </div>
        )}

        {/* LEFT — Input */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.06)", padding: "28px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>Input</span>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); }}
            placeholder={"Incolla una bozza, uno spunto o una notizia.\n\nEs: Wells Fargo multata 3 miliardi. Il danno reputazionale è stato molto di più — e nessuno lo aveva misurato prima."}
            style={{ flex: 1, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", padding: "16px", fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.82)", minHeight: "300px", fontFamily: "inherit", caretColor: "#C8A96E" }}
          />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.16)" }}>{input.length > 0 ? `${input.length} car · ⌘↵` : "⌘+Enter per generare"}</span>
            <button className="gen-btn" onClick={generate} disabled={loading || !input.trim()} style={{ background: "#C8A96E", border: "none", color: "#0D0D0B", padding: "11px 26px", fontSize: "11px", letterSpacing: "0.13em", textTransform: "uppercase", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" }}>
              {loading ? "Generando…" : "Genera contenuti"}
            </button>
          </div>
          {result && (
            <div className="fadein" style={{ padding: "14px 16px", borderLeft: `3px solid ${pillarColor}`, background: "rgba(255,255,255,0.02)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "5px" }}>Pillar identificato</div>
              <div style={{ fontSize: "13px", color: pillarColor, fontWeight: "500", marginBottom: "5px" }}>{result.pillar}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, fontStyle: "italic" }}>{result.angolo}</div>
            </div>
          )}
        </div>

        {/* RIGHT — Output */}
        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>Output</span>

          {!result && !loading && !error && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", opacity: 0.18 }}>
              <div style={{ width: "40px", height: "40px", border: "1px solid rgba(200,169,110,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>◈</div>
              <span style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" }}>Nessun contenuto</span>
            </div>
          )}

          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
              <span className="pulse" style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#C8A96E" }}>Analisi in corso</span>
              <div style={{ display: "flex", gap: "5px" }}>
                {[0,1,2].map(i => <div key={i} className="pulse" style={{ width: "3px", height: "3px", background: "#C8A96E", borderRadius: "50%", animationDelay: `${i * 0.18}s` }} />)}
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "14px", border: "1px solid rgba(255,80,80,0.2)", background: "rgba(255,50,50,0.03)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,100,100,0.55)", marginBottom: "7px" }}>Errore</div>
              <pre style={{ margin: 0, fontSize: "11px", color: "rgba(255,150,150,0.72)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>{error}</pre>
            </div>
          )}

          {result && !loading && (
            <div className="fadein">
              <div style={{ display: "flex", gap: "2px", marginBottom: "14px", flexWrap: "wrap" }}>
                {CHANNELS.map(ch => (
                  <button key={ch.id} className="ch-tab" onClick={() => setActive(ch.id)} style={{ background: active === ch.id ? "rgba(200,169,110,0.11)" : "transparent", border: active === ch.id ? "1px solid rgba(200,169,110,0.32)" : "1px solid rgba(255,255,255,0.07)", color: active === ch.id ? "#C8A96E" : "rgba(255,255,255,0.3)", padding: "5px 11px", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "inherit" }}>
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
              {CHANNELS.filter(c => c.id === active).map(ch => (
                <ChannelCard key={ch.id} ch={ch} data={result[ch.id]} input={input} onRegenerate={handleRegenerate} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
