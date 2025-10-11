FROM oven/bun:1 AS base

WORKDIR /app

COPY src/ /app/src
COPY scripts/ /app/scripts
COPY package.json bun.lock tsconfig.json .eslintrc.json vite.config.ts /app/

RUN bun ci --ignore-scripts && bun run build

RUN echo "" > .env

USER node

CMD node /app/dist/index.js "$ENV_FILE"
