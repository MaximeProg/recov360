from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    per_page: int
    pages: int

    @classmethod
    def build(cls, items: list, total: int, page: int, per_page: int):
        pages = (total + per_page - 1) // per_page if per_page > 0 else 0
        return cls(items=items, total=total, page=page, per_page=per_page, pages=pages)


class PaginationParams(BaseModel):
    page: int = 1
    per_page: int = 20
    search: str | None = None

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page
