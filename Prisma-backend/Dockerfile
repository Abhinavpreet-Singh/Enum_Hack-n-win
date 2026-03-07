# ─── Stage: runtime ────────────────────────────────────────────────────────────
# Use a slim Node.js image (Debian bookworm) and layer all compilers on top.
FROM node:20-bookworm-slim

# Install ALL compilers/runtimes needed by the judge engine:
#   - OpenJDK 17   → javac / java   (Java judge)
#   - g++          → g++            (C++ judge)
#   - gcc          → gcc            (C judge)
#   - python3      → python3        (Python judge)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openjdk-17-jdk-headless \
        g++ \
        gcc \
        python3 && \
    rm -rf /var/lib/apt/lists/*

# Make JAVA_HOME available so javaJudge.js resolveJavaBinaries() picks it up
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="$JAVA_HOME/bin:$PATH"

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Generate Prisma client
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

# Copy source
COPY . .

# Render injects PORT at runtime; default to 3000 for local testing
EXPOSE 3000

CMD ["node", "src/index.js"]
