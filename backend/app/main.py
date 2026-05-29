from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.routes import auth, chat, models, sessions, users
from app.core.config import get_settings

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup / shutdown hooks land here in a later iteration.
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="IdeaLens API", version="0.1.0", lifespan=lifespan)
    app.state.limiter = limiter

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router)
    app.include_router(users.router)
    app.include_router(models.router)
    app.include_router(sessions.router)
    app.include_router(chat.router)

    return app


app = create_app()
