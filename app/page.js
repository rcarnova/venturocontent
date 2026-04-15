"use client";
import { useState } from "react";

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

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        background: "none",
        border: "1px solid rgba(200,169,110,0.3)",
        color: copied ? "#C8A96E" : "rgba(255,255,255,0.35)",
        padding: "3px 12px",
        fontSize: "10px",
        letterSpacing: "0.1em",
        cursor: "pointer",
        fontFamily: "inherit",
        textTransform: "uppercase",
        transition: "color 0.2s",
      }}
    >
      {copied ? "✓ Copiato" : "Copia"}
    </button>
  );
}

function ChannelCard({ ch, data }) {
  if (!data) return null;
  let content = "";
  if (ch.id === "image_prompt") content = typeof data === "string" ? data : "";
  else if (ch.id === "substack") content = data.intro || "";
  else content = data.testo || "";

  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      padding: "20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>
          {ch.icon} {ch.label}
        </span>
        <CopyButton text={content} />
      </div>
      {ch.id === "substack" && data.titolo && (
        <div style={{ fontSize: "15px", color: "#C8A96E", marginBottom: "10px", fontFamily: "Georgia,serif", fontStyle: "italic", lineHeight: 1.4 }}>
          {data.titolo}
        </div>
      )}
      <p style={{
        margin: 0,
        fontSize: ch.id === "image_prompt" ? "11px" : "14px",
        lineHeight: 1.78,
        color: "rgba(255,255,255,0.78)",
        whiteSpace: "pre-wrap",
        fontFamily: ch.id === "image_prompt" ? "monospace" : "inherit",
        background: ch.id === "image_prompt" ? "rgba(200,169,110,0.04)" : "transparent",
        padding: ch.id === "image_prompt" ? "12px" : "0",
        borderLeft: ch.id === "image_prompt" ? "2px solid rgba(200,169,110,0.2)" : "none",
      }}>
        {content}
      </p>
      {data.hashtag?.length > 0 && (
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "7px" }}>
          {data.hashtag.map(h => (
            <span key={h} style={{ fontSize: "10px", color: "#C8A96E", opacity: 0.6 }}>{h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [active, setActive] = useState("linkedin_long");

  const generate = async () => {
    if (!input.trim() || loading) return;
    setLoading(true); setError(null); setResult(null);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

      {/* Header */}
      <header style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "18px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: "20px", fontStyle: "italic" }}>Venturo</span>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>
            Content Suite
          </span>
        </div>
        <span style={{ fontSize: "10px", letterSpacing: "0.11em", color: "rgba(200,169,110,0.5)", textTransform: "uppercase" }}>
          L&apos;invisibile diventa strategia
        </span>
      </header>

      {/* Body */}
      <main style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr" }}>

        {/* LEFT — Input */}
        <div style={{
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>
            Input
          </span>

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate(); }}
            placeholder={"Incolla una bozza, uno spunto o una notizia.\n\nEs: Wells Fargo multata 3 miliardi. Il danno reputazionale è stato molto di più — e nessuno lo aveva misurato prima."}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              padding: "16px",
              fontSize: "14px",
              lineHeight: 1.75,
              color: "rgba(255,255,255,0.82)",
              minHeight: "300px",
              fontFamily: "inherit",
              caretColor: "#C8A96E",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.16)" }}>
              {input.length > 0 ? `${input.length} car · ⌘↵` : "⌘+Enter per generare"}
            </span>
            <button
              className="gen-btn"
              onClick={generate}
              disabled={loading || !input.trim()}
              style={{
                background: "#C8A96E",
                border: "none",
                color: "#0D0D0B",
                padding: "11px 26px",
                fontSize: "11px",
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                fontWeight: "500",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Generando…" : "Genera contenuti"}
            </button>
          </div>

          {result && (
            <div className="fadein" style={{
              padding: "14px 16px",
              borderLeft: `3px solid ${pillarColor}`,
              background: "rgba(255,255,255,0.02)",
            }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: "5px" }}>
                Pillar identificato
              </div>
              <div style={{ fontSize: "13px", color: pillarColor, fontWeight: "500", marginBottom: "5px" }}>
                {result.pillar}
              </div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, fontStyle: "italic" }}>
                {result.angolo}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Output */}
        <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase" }}>
            Output
          </span>

          {!result && !loading && !error && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "10px", opacity: 0.18 }}>
              <div style={{ width: "40px", height: "40px", border: "1px solid rgba(200,169,110,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                ◈
              </div>
              <span style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" }}>Nessun contenuto</span>
            </div>
          )}

          {loading && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px" }}>
              <span className="pulse" style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#C8A96E" }}>
                Analisi in corso
              </span>
              <div style={{ display: "flex", gap: "5px" }}>
                {[0,1,2].map(i => (
                  <div key={i} className="pulse" style={{ width: "3px", height: "3px", background: "#C8A96E", borderRadius: "50%", animationDelay: `${i * 0.18}s` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "14px", border: "1px solid rgba(255,80,80,0.2)", background: "rgba(255,50,50,0.03)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,100,100,0.55)", marginBottom: "7px" }}>
                Errore
              </div>
              <pre style={{ margin: 0, fontSize: "11px", color: "rgba(255,150,150,0.72)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "monospace" }}>
                {error}
              </pre>
            </div>
          )}

          {result && !loading && (
            <div className="fadein">
              <div style={{ display: "flex", gap: "2px", marginBottom: "14px", flexWrap: "wrap" }}>
                {CHANNELS.map(ch => (
                  <button
                    key={ch.id}
                    className="ch-tab"
                    onClick={() => setActive(ch.id)}
                    style={{
                      background: active === ch.id ? "rgba(200,169,110,0.11)" : "transparent",
                      border: active === ch.id ? "1px solid rgba(200,169,110,0.32)" : "1px solid rgba(255,255,255,0.07)",
                      color: active === ch.id ? "#C8A96E" : "rgba(255,255,255,0.3)",
                      padding: "5px 11px",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontFamily: "inherit",
                    }}
                  >
                    {ch.icon} {ch.label}
                  </button>
                ))}
              </div>
              {CHANNELS.filter(c => c.id === active).map(ch => (
                <ChannelCard key={ch.id} ch={ch} data={result[ch.id]} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
