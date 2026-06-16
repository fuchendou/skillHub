"""FastAPI application factory: middleware, exception handlers, router mounting (implement.md §3.9)."""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.errors import AppError
from app.routers import auth, category, skill, skill_lifecycle, tag, user


def _error_body(code: str, message: str, details: list | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or []}}


def create_app() -> FastAPI:
    app = FastAPI(title=settings.project_name, version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
        allow_credentials=True,
    )

    # --- Exception handlers → api.md §6 envelope ---
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status, content=exc.to_dict())

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": (e["loc"][-1] if e.get("loc") else None), "message": e["msg"]}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=400,
            content=_error_body("VALIDATION_ERROR", "One or more fields are invalid.", details),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        if exc.status_code == 404:
            return JSONResponse(status_code=404, content=_error_body("ROUTE_NOT_FOUND", "Unknown path."))
        if exc.status_code == 405:
            return JSONResponse(
                status_code=405, content=_error_body("METHOD_NOT_ALLOWED", "Method not allowed for this path.")
            )
        return JSONResponse(status_code=exc.status_code, content=_error_body("HTTP_ERROR", str(exc.detail)))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(status_code=500, content=_error_body("INTERNAL_ERROR", "Unexpected server error."))

    @app.get("/health", tags=["meta"])
    async def health() -> dict:
        return {"status": "ok"}

    for router_module in (auth, skill, skill_lifecycle, category, tag, user):
        app.include_router(router_module.router, prefix=settings.api_prefix)

    return app


app = create_app()
