# Virasat Backend - Cloud Run Containerfile
# Python 3.12 slim for lightweight, secure deployment
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security hardening
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app

# Install pinned Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . .
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Cloud Run injects $PORT environment variable
EXPOSE 8000

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
