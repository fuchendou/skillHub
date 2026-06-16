"""Business error model — the single source for the api.md §8 error-code table.

Every non-2xx response in the system is produced by raising ``AppError`` (or a
Pydantic/Starlette error that the handlers in ``app.main`` translate into one).
The rendered body always matches the api.md §6 envelope:

    { "error": { "code": ..., "message": ..., "details": [...] } }
"""
from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Carries a stable business ``code`` + HTTP ``status`` from api.md §8."""

    def __init__(
        self,
        code: str,
        status: int,
        message: str,
        details: list[dict[str, Any]] | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status = status
        self.message = message
        self.details = details or []

    def to_dict(self) -> dict[str, Any]:
        return {"error": {"code": self.code, "message": self.message, "details": self.details}}


# Convenience constructors for the codes used across services (api.md §8).
def validation_error(details: list[dict[str, Any]]) -> AppError:
    return AppError("VALIDATION_ERROR", 400, "One or more fields are invalid.", details)


def invalid_install_command() -> AppError:
    return AppError("INVALID_INSTALL_COMMAND", 400, "Install command format is not valid.")


def missing_rejection_reason() -> AppError:
    return AppError("MISSING_REJECTION_REASON", 400, "A rejection reason is required.")


def unauthenticated(message: str = "Missing or invalid Authorization header.") -> AppError:
    return AppError("UNAUTHENTICATED", 401, message)


def invalid_credentials() -> AppError:
    return AppError("INVALID_CREDENTIALS", 401, "Email or password is incorrect.")


def token_expired() -> AppError:
    return AppError("TOKEN_EXPIRED", 401, "Access token expired — refresh and retry.")


def forbidden_role() -> AppError:
    return AppError("FORBIDDEN_ROLE", 403, "Your role cannot perform this action.")


def not_owner() -> AppError:
    return AppError("NOT_OWNER", 403, "You do not own this skill.")


def not_found(code: str, message: str) -> AppError:
    return AppError(code, 404, message)


def duplicate(code: str, message: str) -> AppError:
    return AppError(code, 409, message)


def invalid_state_transition(message: str) -> AppError:
    return AppError("INVALID_STATE_TRANSITION", 409, message)


def resource_in_use(message: str) -> AppError:
    return AppError("RESOURCE_IN_USE", 409, message)


def idempotency_key_conflict() -> AppError:
    return AppError("IDEMPOTENCY_KEY_CONFLICT", 409, "Idempotency-Key was reused with a different request.")
