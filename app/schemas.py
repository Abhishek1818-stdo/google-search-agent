
from pydantic import BaseModel, ConfigDict, Field


class SearchRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    question: str = Field(
        min_length=2,
        max_length=1000,
        description="Question to search on the web",
    )


class Source(BaseModel):
    source_id: str
    title: str
    url: str
    domain: str = ""
    published_date: str | None = None
    content_type: str = "search_result"
    is_official_domain: bool = False
    is_trusted_domain: bool = False
    searched_company: str | None = None


class SearchResponse(BaseModel):
    question: str
    answer: str
    sources: list[Source]
