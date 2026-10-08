"""Central PHI-write kill switch used during infrastructure transitions."""
from fastapi import Request
from fastapi.responses import JSONResponse

_WRITE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
_PHI_PREFIXES = (
    "/api/uploads",
    "/api/documents",
    "/api/agencies",
    "/api/data",
    "/api/datasets",
    "/api/reports",
    "/api/emscharts",
    "/api/dispatch",
)


def is_phi_write(method: str, path: str) -> bool:
    """Return true for known clinical-data mutations.

    Versioned routes share ``/api/v1`` so only their clinical subpaths are
    guarded; identity and platform-administration operations remain available.
    """
    if method.upper() not in _WRITE_METHODS:
        return False
    if path.startswith(_PHI_PREFIXES):
        return True
    return path.startswith("/api/v1/") and (
        "/emscharts" in path or "/qa" in path or "/incidents" in path
    )


def install_phi_guard(app, settings) -> None:
    @app.middleware("http")
    async def phi_write_guard(request: Request, call_next):
        if not settings.phi_ingestion_enabled and is_phi_write(
            request.method, request.url.path
        ):
            return JSONResponse(
                status_code=503,
                content={
                    "error": "PHI ingestion is temporarily disabled",
                    "code": "phi_ingestion_disabled",
                },
                headers={"Retry-After": "3600"},
            )
        return await call_next(request)
