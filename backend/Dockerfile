FROM python:3.12-slim

WORKDIR /app

# uv for fast, reproducible installs.
RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./

RUN uv pip install --system .

EXPOSE 8000

# Migrate, seed (idempotent), then serve.
CMD ["sh", "-c", "alembic upgrade head && python -m app.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
