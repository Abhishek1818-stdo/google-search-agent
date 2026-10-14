
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import validate_settings
from app.schemas import SearchRequest, SearchResponse
from app.services.search_service import search_web
from app.services.answer_service import generate_answer, prepare_sources

app = FastAPI(
    title="Google Search AI Agent",
    description=(
        "An AI research assistant that searches the web "
        "and provides evidence-based answers with citations."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
def check_configuration():
    validate_settings()


@app.get("/")
def home():
    return {
        "message": "Google Search AI Agent is running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask", response_model=SearchResponse)
def ask_agent(request: SearchRequest):
    question = request.question.strip()

    if len(question) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please enter a question with at least 2 characters.",
        )

    try:
        search_results = search_web(question)

    except Exception as exc:
        print(
            f"Search service error: {type(exc).__name__}: {exc}"
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "Web search failed. Check your Tavily API key, "
                "API usage limits, and backend terminal."
            ),
        ) from exc

    if not search_results.get("results"):
        return SearchResponse(
            question=question,
            answer=(
                "No usable web results were found. Try a more specific "
                "question or check your search API configuration."
            ),
            sources=[],
        )

    sources = prepare_sources(search_results)
    answer = generate_answer(question, search_results)

    return SearchResponse(
        question=question,
        answer=answer,
        sources=sources,
    )