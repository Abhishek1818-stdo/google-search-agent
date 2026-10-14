
import re
from urllib.parse import urlparse

from tavily import TavilyClient

from app.config import TAVILY_API_KEY


search_client = TavilyClient(api_key=TAVILY_API_KEY)


COMPANY_DOMAINS = {
    "OpenAI": ["openai.com"],
    "Anthropic": ["anthropic.com"],
    "Google": ["blog.google", "deepmind.google", "google.com"],
    "Meta": ["ai.meta.com", "about.fb.com", "meta.com"],
    "Microsoft": ["microsoft.com"],
    "NVIDIA": ["nvidia.com"],
    "Amazon": ["aws.amazon.com", "amazon.science"],
    "xAI": ["x.ai"],
    "Mistral AI": ["mistral.ai"],
    "Hugging Face": ["huggingface.co"],
}

TRUSTED_DOMAINS = [
    "reuters.com",
    "apnews.com",
    "techcrunch.com",
    "arstechnica.com",
    "theverge.com",
    "axios.com",
    "bloomberg.com",
]

EXCLUDED_DOMAINS = [
    "instagram.com",
    "facebook.com",
    "tiktok.com",
    "pinterest.com",
]

COMPANY_ALIASES = {
    "OpenAI": ["openai", "chatgpt", "gpt-4", "gpt-5"],
    "Anthropic": ["anthropic", "claude"],
    "Google": ["google", "gemini", "deepmind"],
    "Meta": ["meta", "facebook", "llama"],
    "Microsoft": ["microsoft", "copilot", "azure ai"],
    "NVIDIA": ["nvidia", "cuda"],
    "Amazon": ["amazon", "aws"],
    "xAI": ["xai", "x.ai", "grok"],
    "Mistral AI": ["mistral"],
    "Hugging Face": ["hugging face", "huggingface"],
}

MAX_TOTAL_RESULTS = 6
MAX_RESULTS_PER_COMPANY = 3
MAX_GENERAL_RESULTS = 6


def get_hostname(url: str) -> str:
    """Return the normalized hostname from a URL."""
    try:
        return (urlparse(url).hostname or "").lower()
    except (ValueError, TypeError):
        return ""


def matches_domain(url: str, domains: list[str]) -> bool:
    """Match a domain without allowing misleading suffix matches."""
    host = get_hostname(url)

    return any(
        host == domain.lower()
        or host.endswith("." + domain.lower())
        for domain in domains
    )


def is_official_domain(url: str) -> bool:
    """Check whether a URL belongs to a configured official domain."""
    return any(
        matches_domain(url, domains)
        for domains in COMPANY_DOMAINS.values()
    )


def is_trusted_domain(url: str) -> bool:
    """Identify official websites and selected independent publishers."""
    return (
        is_official_domain(url)
        or matches_domain(url, TRUSTED_DOMAINS)
    )


def is_excluded_domain(url: str) -> bool:
    """Reject results from configured social and image-sharing sites."""
    return matches_domain(url, EXCLUDED_DOMAINS)


def alias_matches(text: str, alias: str) -> bool:
    """
    Match an alias as a phrase or token rather than an arbitrary substring.

    This prevents aliases such as 'meta' from matching words such as
    'metadata'. It does not attempt to determine the user's intent.
    """
    pattern = (
        r"(?<!\w)"
        + re.escape(alias.lower())
        + r"(?!\w)"
    )

    return re.search(pattern, text.lower()) is not None


def detect_companies(query: str) -> list[str]:
    """Detect companies and products explicitly mentioned in a query."""
    text = query.lower()
    found = []

    for company, aliases in COMPANY_ALIASES.items():
        if any(alias_matches(text, alias) for alias in aliases):
            found.append(company)

    return found


def is_recent_question(query: str) -> bool:
    terms = [
        "latest",
        "recent",
        "today",
        "yesterday",
        "this week",
        "last week",
        "past 7 days",
        "last 7 days",
        "this month",
        "last month",
        "past month",
        "last 30 days",
        "last 24 hours",
        "past 24 hours",
        "current",
        "currently",
        "breaking",
        "news",
    ]

    text = query.lower()
    return any(term in text for term in terms)


def get_time_range(query: str) -> str | None:
    """Map time-related wording to Tavily's supported time ranges."""
    text = query.lower()

    if any(
        term in text
        for term in [
            "last month",
            "past month",
            "this month",
            "last 30 days",
        ]
    ):
        return "month"

    if any(
        term in text
        for term in [
            "today",
            "yesterday",
            "last 24 hours",
            "past 24 hours",
            "breaking",
        ]
    ):
        return "day"

    if any(
        term in text
        for term in [
            "this week",
            "last week",
            "past 7 days",
            "last 7 days",
        ]
    ):
        return "week"

    if is_recent_question(text):
        return "week"

    return None


def clean_result(
    item: dict,
    company: str | None = None,
) -> dict | None:
    """Validate and normalize a Tavily search result."""
    url = str(item.get("url") or "").strip()

    if not url.startswith(("http://", "https://")):
        return None

    parsed_url = urlparse(url)

    if not parsed_url.hostname:
        return None

    if is_excluded_domain(url):
        return None

    raw_content = item.get("content") or ""

    if not isinstance(raw_content, str):
        raw_content = str(raw_content)

    try:
        score = float(item.get("score") or 0)
    except (TypeError, ValueError):
        score = 0.0

    return {
        "title": str(item.get("title") or "Untitled source"),
        "url": url,
        "content": raw_content[:5000],
        "published_date": (
            item.get("published_date")
            or item.get("date")
            or item.get("published")
        ),
        "score": score,
        "content_type": "search_result",
        "is_official_domain": is_official_domain(url),
        "is_trusted_domain": is_trusted_domain(url),
        "searched_company": company,
    }


def run_search(
    query: str,
    domains: list[str] | None = None,
    company: str | None = None,
    max_results: int | None = None,
) -> list[dict]:
    """Run a Tavily search and return normalized results."""
    kwargs = {
        "query": query,
        "search_depth": "advanced",
        "max_results": (
            max_results
            if max_results is not None
            else MAX_RESULTS_PER_COMPANY
        ),
        "include_answer": False,
        "include_raw_content": True,
    }

    time_range = get_time_range(query)

    if time_range:
        kwargs["topic"] = "news"
        kwargs["time_range"] = time_range

    if domains:
        kwargs["include_domains"] = domains

    response = search_client.search(**kwargs)
    cleaned = []

    for item in response.get("results", []):
        # Prefer extracted page text when Tavily provides it.
        # Fall back to the ordinary search-result snippet.
        raw_content = item.get("raw_content")
        regular_content = item.get("content")

        if isinstance(raw_content, str) and raw_content.strip():
            item = {
                **item,
                "content": raw_content,
            }
        elif isinstance(regular_content, str):
            item = {
                **item,
                "content": regular_content,
            }

        result = clean_result(item, company)

        if result and result["content"].strip():
            cleaned.append(result)

    return cleaned


def calculate_result_rank(item: dict) -> float:
    """
    Rank by Tavily relevance first, using domain trust as a modest bonus.

    Official or trusted domains should help break close comparisons,
    rather than automatically outranking more relevant results.
    """
    try:
        score = float(item.get("score") or 0)
    except (TypeError, ValueError):
        score = 0.0

    if item.get("is_official_domain"):
        score += 0.08
    elif item.get("is_trusted_domain"):
        score += 0.05

    return score


def search_web(query: str) -> dict:
    """Search official company websites and independent sources."""
    companies = detect_companies(query)
    collected = []
    seen_urls = set()

    # Search official company websites separately when a company
    # or its product is mentioned in the question.
    for company in companies:
        domains = COMPANY_DOMAINS.get(company, [])

        if not domains:
            continue

        try:
            results = run_search(
                query,
                domains=domains,
                company=company,
                max_results=MAX_RESULTS_PER_COMPANY,
            )
        except Exception as exc:
            print(
                f"Official search failed for {company}: "
                f"{type(exc).__name__}: {exc}"
            )
            results = []

        for result in results:
            url_key = result["url"].rstrip("/").lower()

            if url_key not in seen_urls:
                collected.append(result)
                seen_urls.add(url_key)

    # Always search independently so that useful reporting and
    # sources outside the official websites can also be considered.
    try:
        general_results = run_search(
            query,
            max_results=MAX_GENERAL_RESULTS,
        )
    except Exception as exc:
        print(
            f"General search failed: "
            f"{type(exc).__name__}: {exc}"
        )
        general_results = []

    for result in general_results:
        url_key = result["url"].rstrip("/").lower()

        if url_key not in seen_urls:
            collected.append(result)
            seen_urls.add(url_key)

    # Prefer relevance. Domain trust is used as a secondary bonus.
    collected.sort(
        key=calculate_result_rank,
        reverse=True,
    )

    return {
        "query": query,
        "results": collected[:MAX_TOTAL_RESULTS],
    }
