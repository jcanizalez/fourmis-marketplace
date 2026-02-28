# Python Project Scaffolding

Generate production-ready Python projects with modern tooling: `uv` for package management, `ruff` for linting/formatting, `pytest` for testing, and proper project structure.

## Project Structure

### CLI / Library

```
my-project/
├── src/
│   └── my_project/
│       ├── __init__.py         # Package init with __version__
│       ├── main.py             # Entry point / CLI
│       ├── config.py           # Settings (pydantic-settings)
│       ├── models.py           # Data models (Pydantic)
│       └── utils.py            # Utilities
├── tests/
│   ├── __init__.py
│   ├── conftest.py             # Shared fixtures
│   └── test_main.py
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── .python-version             # 3.13
├── pyproject.toml
├── README.md
└── uv.lock
```

### FastAPI Web Service

```
my-api/
├── src/
│   └── my_api/
│       ├── __init__.py
│       ├── main.py             # FastAPI app + lifespan
│       ├── config.py           # Settings
│       ├── dependencies.py     # Dependency injection
│       ├── routers/
│       │   ├── __init__.py
│       │   ├── health.py       # GET /health
│       │   └── users.py        # /api/users CRUD
│       ├── models/
│       │   ├── __init__.py
│       │   └── user.py         # Pydantic models
│       ├── services/
│       │   ├── __init__.py
│       │   └── user.py         # Business logic
│       └── db/
│           ├── __init__.py
│           └── session.py      # Database session
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   └── test_health.py
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── .gitignore
├── .python-version
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
└── README.md
```

## Key Files

### pyproject.toml (CLI / Library)

```toml
[project]
name = "my-project"
version = "0.1.0"
description = "A Python project"
readme = "README.md"
requires-python = ">=3.13"
license = { text = "MIT" }
authors = [{ name = "Your Name", email = "you@example.com" }]
dependencies = [
    "pydantic>=2.10",
    "pydantic-settings>=2.7",
]

[project.scripts]
my-project = "my_project.main:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-cov>=6.0",
    "pytest-asyncio>=0.24",
    "ruff>=0.9",
    "mypy>=1.14",
]

[tool.ruff]
target-version = "py313"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM", "RUF"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"

[tool.mypy]
python_version = "3.13"
strict = true
warn_return_any = true
warn_unused_configs = true
```

### pyproject.toml (FastAPI)

```toml
[project]
name = "my-api"
version = "0.1.0"
description = "A FastAPI service"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.34",
    "pydantic>=2.10",
    "pydantic-settings>=2.7",
]

[project.scripts]
serve = "my_api.main:start"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.uv]
dev-dependencies = [
    "pytest>=8.3",
    "pytest-cov>=6.0",
    "pytest-asyncio>=0.24",
    "httpx>=0.28",
    "ruff>=0.9",
    "mypy>=1.14",
]

[tool.ruff]
target-version = "py313"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM", "RUF"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --tb=short"
asyncio_mode = "auto"
```

### FastAPI Main

```python
# src/my_api/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .config import settings
from .routers import health, users
import uvicorn


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # await init_db()
    yield
    # Shutdown
    # await close_db()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url=None,
)

app.include_router(health.router)
app.include_router(users.router, prefix="/api")


def start():
    """Entry point for `serve` command."""
    uvicorn.run(
        "my_api.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.debug,
    )
```

### Config (pydantic-settings)

```python
# src/my_api/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "My API"
    debug: bool = False
    port: int = 8000
    log_level: str = "info"
    # database_url: str = ""  # Uncomment when adding database


settings = Settings()
```

### Health Router

```python
# src/my_api/routers/health.py
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok"}
```

### Test Config

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from my_api.main import app


@pytest.fixture
def client():
    return TestClient(app)
```

### Test Example

```python
# tests/test_health.py
def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### Dockerfile (FastAPI)

```dockerfile
FROM python:3.13-slim AS base
WORKDIR /app

FROM base AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-editable
COPY . .
RUN uv pip install . --no-deps

FROM base AS production
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"
USER nobody
EXPOSE 8000
CMD ["uvicorn", "my_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### GitHub Actions CI

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v4
        with:
          enable-cache: true
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run mypy src/
      - run: uv run pytest --cov
```

## Variants

### With SQLAlchemy + Alembic
- Add `sqlalchemy`, `asyncpg`, `alembic` to dependencies
- Create `src/my_api/db/models.py` — SQLAlchemy models
- Create `alembic/` for migrations

### With Celery (Background Tasks)
- Add `celery`, `redis` to dependencies
- Create `src/my_api/tasks/` for async task definitions

### With Typer (CLI)
- Add `typer` to dependencies
- Create `src/my_project/cli.py` with Typer app

## Checklist After Scaffolding

1. Replace `my-project` / `my-api` with actual name
2. Set up `.env` from `.env.example`
3. Run `uv sync` to install dependencies
4. Run `uv run pytest` to verify tests pass
5. Run `uv run ruff check .` to verify lint
6. For FastAPI: `uv run serve` — verify at `http://localhost:8000/docs`
7. Add database when ready (SQLAlchemy + Alembic recommended)
8. Update `authors` in pyproject.toml
