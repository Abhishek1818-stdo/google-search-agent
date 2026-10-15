import { useState } from "react";
import {
  Search,
  ExternalLink,
  LoaderCircle,
  Sparkles,
  Link as LinkIcon,
  House,
  Moon,
  Sun,
  Send,
  ShieldCheck,
  Globe,
  Clock3,
} from "lucide-react";
import "./App.css";

const API_URL = "https://google-search-agent-ssvx.onrender.com/ask";

const suggestions = [
  "Who is the Prime Minister of India?",
  "Latest AI news",
  "What is FastAPI?",
  "Explain quantum computing",
];

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lightMode, setLightMode] = useState(false);
  const [responseTime, setResponseTime] = useState(null);

  async function handleSearch(event) {
    event?.preventDefault();

    if (!question.trim() || loading) return;

    const startedAt = performance.now();

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);
    setResponseTime(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : data.detail;

        throw new Error(
          detail || "Unable to get an answer. Please try again."
        );
      }

      setAnswer(data.answer || "No answer was returned.");
      setSources(Array.isArray(data.sources) ? data.sources : []);
      setResponseTime(
        ((performance.now() - startedAt) / 1000).toFixed(1)
      );
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not connect to the backend. Please try again in a moment."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function renderAnswer(text) {
    const parts = text.split(/(\[S\d+\])/g);

    return parts.map((part, index) => {
      const match = part.match(/^\[S(\d+)\]$/);

      if (!match) {
        return <span key={index}>{part}</span>;
      }

      const sourceId = `S${match[1]}`;
      const source = sources.find(
        (item) => item.source_id === sourceId
      );

      if (!source || !/^https?:\/\//i.test(source.url || "")) {
        return <span key={index}>{part}</span>;
      }

      return (
        <a
          key={index}
          className="answer-source-link"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open source: ${source.title || sourceId}`}
        >
          {part}
        </a>
      );
    });
  }

  function chooseSuggestion(text) {
    setQuestion(text);
    setError("");
  }

  return (
    <main className={`app ${lightMode ? "light-mode" : ""}`} id="home">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="AI Search Agent home">
          <span className="brand-icon">
            <Search size={31} strokeWidth={2.7} />
          </span>
          <span className="brand-name">AI Search Agent</span>
        </a>

        <nav className="navigation" aria-label="Main navigation">
          <a className="nav-link active" href="#home">
            <House size={17} />
            <span>Home</span>
          </a>
          <a className="nav-link" href="#about">
            About
          </a>
          <a className="nav-link" href="#features">
            Features
          </a>
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setLightMode((current) => !current)}
            aria-label={
              lightMode ? "Switch to dark mode" : "Switch to light mode"
            }
            title={lightMode ? "Dark mode" : "Light mode"}
          >
            {lightMode ? <Sun size={21} /> : <Moon size={21} />}
          </button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-badge">
          <Sparkles size={15} />
          <span>YOUR AI-POWERED RESEARCH ASSISTANT</span>
        </div>

        <h1>
          Search Smarter with <span className="gradient-text">AI</span>
        </h1>

        <p className="hero-description">
          Get useful answers from the web, backed by relevant source links.
          <br className="desktop-break" />
          Powered by Tavily Search and Groq AI.
        </p>

        <form className="search-form" onSubmit={handleSearch}>
          <Search className="search-field-icon" size={23} />

          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask anything... e.g., Who is the Prime Minister of India?"
            aria-label="Enter your search question"
            maxLength={1000}
            required
          />

          {question && (
            <button
              type="button"
              className="clear-button"
              onClick={() => setQuestion("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}

          <button
            type="submit"
            className="search-button"
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <LoaderCircle className="spinner" size={19} />
            ) : (
              <Send size={19} />
            )}
            <span>{loading ? "Searching..." : "Search"}</span>
          </button>
        </form>

        <div className="suggestions">
          <span className="suggestion-label">Try these:</span>
          {suggestions.map((suggestion) => (
            <button
              className="suggestion-chip"
              key={suggestion}
              type="button"
              onClick={() => chooseSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <section className="status-card error-card" role="alert">
          <div className="status-icon error-icon">!</div>
          <div>
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button
              className="retry-button"
              type="button"
              onClick={handleSearch}
            >
              Try again
            </button>
          </div>
        </section>
      )}

      {loading && (
        <section className="status-card loading-card" aria-live="polite">
          <div className="loading-orb">
            <LoaderCircle className="spinner" size={28} />
          </div>
          <h2>Searching the web</h2>
          <p>Finding relevant sources and preparing your answer...</p>
          <div className="loading-track">
            <span />
          </div>
        </section>
      )}

      {!loading && answer && (
        <section className="results" aria-live="polite">
          <article className="answer-card">
            <div className="answer-header">
              <div className="answer-heading">
                <span className="answer-icon">
                  <Sparkles size={22} />
                </span>
                <h2>Answer</h2>
              </div>

              <div className="answer-meta">
                {responseTime !== null && (
                  <span className="response-time">
                    <Clock3 size={17} />
                    {responseTime}s
                  </span>
                )}
                <span className="generated-badge">
                  <ShieldCheck size={16} />
                  AI Generated
                </span>
              </div>
            </div>

            <div className="answer-text">{renderAnswer(answer)}</div>

            <p className="answer-note">
              Source IDs refer to the links returned alongside this answer.
            </p>

            <div className="sources-heading">
              <div className="sources-title">
                <LinkIcon size={22} />
                <h2>Sources</h2>
                <span className="source-count">{sources.length}</span>
              </div>
              <span className="sources-caption">Explore the references</span>
            </div>

            {sources.length > 0 ? (
              <div className="sources-list">
                {sources.map((source, index) => {
                  const validUrl = /^https?:\/\//i.test(source.url || "");

                  return (
                    <article
                      className="source-card"
                      key={source.source_id || source.url || index}
                    >
                      <div className="source-card-top">
                        <span className="source-number">
                          {source.source_id || `S${index + 1}`}
                        </span>

                        {source.is_official_domain && (
                          <span className="official-badge">
                            Official
                          </span>
                        )}
                      </div>

                      <div className="source-main">
                        <span className="source-favicon">
                          <Globe size={22} />
                        </span>

                        <div className="source-info">
                          {validUrl ? (
                            <a
                              className="source-title"
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.title || source.domain || source.url}
                            </a>
                          ) : (
                            <p className="source-title">
                              {source.title || "Untitled source"}
                            </p>
                          )}

                          <p className="source-domain">
                            {source.domain || source.url || "Web source"}
                          </p>
                        </div>

                        {validUrl && (
                          <a
                            className="source-open"
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${source.title || source.source_id}`}
                            title="Open source"
                          >
                            <ExternalLink size={17} />
                          </a>
                        )}
                      </div>

                      {source.published_date && (
                        <p className="source-date">
                          Published: {source.published_date}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="no-sources">
                No source links were returned for this answer.
              </p>
            )}
          </article>
        </section>
      )}

      {!loading && !answer && !error && (
        <section className="welcome-card" id="features">
          <div className="welcome-icon">
            <Sparkles size={28} />
          </div>
          <h2>Your next discovery starts here</h2>
          <p>
            Ask a question to search the web and receive an AI-generated
            answer with clickable references.
          </p>

          <div className="feature-grid">
            <div className="feature-item">
              <span className="feature-icon purple">
                <Search size={19} />
              </span>
              <div>
                <h3>Web-powered search</h3>
                <p>Find relevant information online.</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon blue">
                <Sparkles size={19} />
              </span>
              <div>
                <h3>AI-generated answers</h3>
                <p>Get answers in natural language.</p>
              </div>
            </div>

            <div className="feature-item">
              <span className="feature-icon teal">
                <LinkIcon size={19} />
              </span>
              <div>
                <h3>Clickable sources</h3>
                <p>Open the references for yourself.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="footer" id="about">
        <p className="footer-brand">
          <Search size={16} />
          AI Search Agent
        </p>
        <p>Powered by Tavily Search and Groq AI.</p>
        <p className="footer-note">
          Check the original sources when accuracy matters.
        </p>
      </footer>
    </main>
  );
}

export default App;