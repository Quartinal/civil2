FROM node:22-alpine AS builder

RUN apk add --no-cache bash
RUN npm install -g bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN ./build.sh && rm -rf tests node_modules/.cache

FROM oven/bun:alpine

RUN apk add --no-cache bash

WORKDIR /app

COPY --from=builder /app /app

ENV REVERSE_PROXY=true

EXPOSE 9876

CMD ["bun", "run", "start"]