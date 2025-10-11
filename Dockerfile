FROM oven/bun:1 AS base

WORKDIR /app

COPY src/ /app/src
COPY scripts/ /app/scripts
COPY package.json bun.lock tsconfig.json .eslintrc.json vite.config.ts /app/

# Install Touti and create the Vite build
RUN bun ci --ignore-scripts && bun run build

# Install CA certificates to trust Let's Encrypt and others
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates

RUN echo "" > .env

USER bun

CMD ["node", "/app/dist/index.js", "${ENV_FILE}"]
