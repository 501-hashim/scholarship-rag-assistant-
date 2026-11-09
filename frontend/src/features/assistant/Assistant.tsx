import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Source } from "@/components/components";
import type { Answer } from "@/types/types";

type Message = {
  role: "user" | "assistant";
  question?: string;
  answer?: Answer;
};

type Session = { session_id: string; session_token: string };

export default function Assistant({ schemeId }: { schemeId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const stored = sessionStorage.getItem("scholar-session");
        const saved: Session | null = stored ? JSON.parse(stored) : null;
        if (saved) {
          try {
            const data = await api<{
              context: {
                messages: {
                  role: "user" | "assistant";
                  content: Answer & { question?: string };
                }[];
              };
            }>("/sessions/" + saved.session_id, undefined, saved.session_token);
            if (active) {
              setSession(saved);
              setMessages(
                data.context.messages
                  .filter((m) => m.content.status !== "error")
                  .map((m) =>
                    m.role === "user"
                      ? { role: m.role, question: m.content.question }
                      : { role: m.role, answer: m.content },
                  ),
              );
            }
            return;
          } catch {
            sessionStorage.removeItem("scholar-session");
          }
        }
        const created = await api<Session>("/sessions", {});
        if (active) {
          sessionStorage.setItem("scholar-session", JSON.stringify(created));
          setSession(created);
        }
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : "Could not initialize session.",
          );
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim() || !session) return;
    const text = question.trim();
    setQuestion("");
    setBusy(true);
    setError("");
    setMessages((m) => [...m, { role: "user", question: text }]);
    try {
      const answer = await api<Answer>(
        "/agent/query",
        {
          question: text,
          session_id: session.session_id,
          ...(schemeId ? { context_scheme_id: schemeId } : {}),
        },
        session.session_token,
      );
      if (answer.status === "error")
        throw new Error(answer.error?.message || answer.answer);
      setMessages((m) => [...m, { role: "assistant", answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assistant unavailable.");
      setQuestion(text);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!session || busy) return;
    setBusy(true);
    setError("");
    try {
      await api<void>(
        "/sessions/" + session.session_id,
        undefined,
        session.session_token,
        "DELETE",
      );
      sessionStorage.removeItem("scholar-session");
      const created = await api<Session>("/sessions", {});
      sessionStorage.setItem("scholar-session", JSON.stringify(created));
      setSession(created);
      setMessages([]);
      setQuestion("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not start a new conversation.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel chat">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Archival Inquiry & Verification</span>
          <h2>Scholarship Research Assistant</h2>
          <p>Strictly grounded in official central and state scholarship gazettes.</p>
        </div>
        <button
          className="button subtle"
          disabled={busy || !session}
          onClick={reset}
        >
          New conversation
        </button>
      </div>

      {!messages.length && (
        <div className="chat-empty">
          <div className="assistant-symbol" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h3>Inquire by scholarship, criterion, or quota</h3>
          <p>
            Ask specific questions regarding eligibility limits, family income caps,
            required documentation, and disbursement timelines.
          </p>
          <div className="suggestions">
            {[
              "What is the Pragati Scholarship?",
              "What scholarships are available for girl students?",
              "What documents are needed for the single girl child scholarship?",
            ].map((q) => (
              <button
                key={q}
                type="button"
                className="suggestion-chip"
                onClick={() => setQuestion(q)}
              >
                <span>{q}</span>
                <span className="chip-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="messages" aria-live="polite">
        {messages.map((m, i) => (
          <article className={"message " + m.role} key={i}>
            <div className="message-header">
              <span className="message-sender">
                {m.role === "user" ? "Candidate" : "Gazette Assistant"}
              </span>
              {m.role === "assistant" && (
                <span className="source-verified-tag">
                  <span className="status-dot live" /> Verified Grounding
                </span>
              )}
            </div>
            {m.question ? (
              <p className="message-text">{m.question}</p>
            ) : (
              m.answer && (
                <>
                  <p className="answer-text">{m.answer.answer}</p>
                  {!!m.answer.sources.length && (
                    <details className="sources-details">
                      <summary className="sources-summary">
                        Sources ({new Set(m.answer.sources.map((s) => s.scheme_id)).size})
                      </summary>
                      <div className="sources-list">
                        {m.answer.sources
                          .filter(
                            (s, j, all) =>
                              all.findIndex(
                                (other) => other.scheme_id === s.scheme_id,
                              ) === j,
                          )
                          .map((citation) => (
                            <Source
                              citation={citation}
                              key={citation.scheme_id}
                            />
                          ))}
                      </div>
                    </details>
                  )}
                </>
              )
            )}
          </article>
        ))}
      </div>

      {busy && (
        <div className="loading-indicator" role="status">
          <span className="spinner-dot" />
          <span>Cross-referencing gazette corpus and synthesizing verified response…</span>
        </div>
      )}

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}

      <form className="chat-input" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-question">
          Ask a scholarship question
        </label>
        <input
          id="chat-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a scholarship question…"
          maxLength={2000}
        />
        <button
          className="button primary"
          disabled={busy || !session || !question.trim()}
        >
          Send
        </button>
      </form>

      <div className="chat-footnote">
        <span>Official records only. Grounded strictly in indexed scholarship documentation.</span>
      </div>
    </section>
  );
}
