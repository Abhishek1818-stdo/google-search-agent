
import { useState } from "react";
import { Search, Globe, ExternalLink, LoaderCircle } from "lucide-react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/ask";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(event) {
    event.preventDefault();

    if (!question.trim() || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

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
        throw new Error(
          data.detail || "Unable to get an answer. Please try again."
        );
      }

      setAnswer(data.answer || "No answer was returned.");
      setSources(Array.isArray(data.sources) ? data.sources : []);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Could not connect to the backend. Make sure FastAPI is running and CORS is configured."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  // Convert [S1], [S2], etc. into clickable source links.
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

  return (
    <main className="app">
      <header className="hero">
        <div className="brand">
          <div className="brand-icon">
            <Globe size={25} />
          </div>
          <span>Web Search AI</span>
        </div>

        <h1>Find answers from the internet.</h1>

        <p className="subtitle">
          Search the internet. Find the answers.
        </p>

        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <Search size={21} className="search-icon" />

            <input
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask anything..."
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
          </div>

          <button
            type="submit"
            className="search-button"
            disabled={loading || !question.trim()}
          >
            {loading ? (
              <>
                <LoaderCircle className="spinner" size={20} />
                Searching the web...
              </>
            ) : (
              "Search"
            )}
          </button>
        </form>
      </header>

      {error && (
        <section className="error-card" role="alert">
          <strong>Something went wrong</strong>
          <p>{error}</p>
        </section>
      )}

      {loading && (
        <section className="loading-card" aria-live="polite">
          <LoaderCircle className="spinner" size={28} />
          <h2>Searching the web</h2>
          <p>Finding relevant pages and preparing your answer...</p>
        </section>
      )}

      {!loading && answer && (
        <section className="results">
          <article className="answer-card">
            <h2>Answer</h2>
            <div className="answer-text">
              {renderAnswer(answer)}
            </div>
          </article>

          <section className="sources-section">
            <h2>Sources ({sources.length})</h2>

            {sources.length > 0 ? (
              <div className="sources-list">
                {sources.map((source, index) => (
                  <article
                    className="source-card"
                    key={source.source_id || source.url || index}
                  >
                    <div className="source-heading">
                      <span className="source-number">
                        {source.source_id || `S${index + 1}`}
                      </span>

                      {source.is_official_domain && (
                        <span className="official-badge">
                          Official domain
                        </span>
                      )}
                    </div>

                    {/^https?:\/\//i.test(source.url || "") ? (
                      <a
                        className="source-title"
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title || source.url}
                        <ExternalLink size={15} />
                      </a>
                    ) : (
                      <p className="source-title">
                        {source.title || "Untitled source"}
                      </p>
                    )}

                    {source.domain && (
                      <p className="source-domain">
                        {source.domain}
                      </p>
                    )}

                    {source.published_date && (
                      <p className="source-date">
                        Published: {source.published_date}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="no-sources">
                No source links were returned for this answer.
              </p>
            )}
          </section>
        </section>
      )}

      {!loading && !answer && !error && (
        <section className="welcome-card">
          <Globe size={32} />
          <h2>Your web research starts here</h2>
          <p>
            Ask a question to search live web sources and get an
            AI-generated answer with references.
          </p>
        </section>
      )}

      <footer>
        <p>Web Search AI · Powered by live web search</p>
        <p>Always check cited sources for important information.</p>
      </footer>
    </main>
  );
}

export default App;
