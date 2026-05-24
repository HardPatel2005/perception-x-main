# Use the official lightweight Python 3.10 image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    libsm6 \
    libxext6 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements.txt first (for caching)
COPY requirements.txt .

# Upgrade pip and install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Remove the standalone bson package if it gets pulled in; PyMongo already provides bson.
RUN pip uninstall -y bson || true

# Copy the rest of the app (including .env)
COPY . .

# Make sure python-dotenv is available
RUN pip install python-dotenv

# Environment variables
ENV PYTHONUNBUFFERED=1

# Expose port (Hugging Face will map it automatically)
EXPOSE 7860

# Start FastAPI with uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
