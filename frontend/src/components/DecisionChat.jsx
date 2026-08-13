import { useState } from "react";
import { api } from "../api/client.js";

const SUGGESTIONS = [
  "Why was this dependency introduced?",
  "When did the biggest architectural change happen?",
  "Why did a major migration happen?",
];

const confidenceColor = { high: "text-site-teal", medium: "text-site-amber", low: "text-site-muted" };

export default function DecisionChat({ analysisId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function ask(question) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await api.askQuestion(analysisId, question);
      setMessages((m) => [...m, { role: "assistant", ...res }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", answer: `Error: ${err.message}`, confidence: "low", evidence: [] }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[520px] border border-site-line rounded-md bg-site-surface">
      <div className="px-4 py-3 border-b border-site-line">
        <p className="text-sm font-medium text-site-bone">Decision search</p>
        <p className="text-xs text-site-muted">Ask "why", not just "what" — answers cite the evidence they used.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full text-left text-sm px-3 py-2 rounded border border-site-line text-site-muted hover:text-site-bone hover:border-site-amber/40 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[80%] bg-site-amber/15 border border-site-amber/30 rounded-md px-3 py-2 text-sm text-site-bone">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={i} className="max-w-[90%]">
              <div className="bg-site-surface2 border border-site-line rounded-md px-3 py-2.5">
                <p className="text-sm text-site-bone leading-relaxed">{m.answer}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] uppercase tracking-wider font-mono ${confidenceColor[m.confidence] || confidenceColor.medium}`}>
                    {m.confidence || "medium"} confidence
                  </span>
                  {(m.evidence || []).map((e, j) => (
                    <span key={j} className="text-[10px] font-mono text-site-muted border border-site-line rounded px-1.5 py-0.5">
                      {e.sourceType} {e.sourceRef}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        )}
        {loading && <p className="text-xs text-site-muted font-mono">searching evidence…</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-site-line p-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why was Redis introduced?"
          className="flex-1 bg-site-bg border border-site-line rounded px-3 py-2 text-sm text-site-bone placeholder:text-site-muted/60 focus:border-site-amber/50 outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-site-amber text-site-bg text-sm font-medium disabled:opacity-50 hover:bg-site-amber/90 transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
