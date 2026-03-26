FROM oven/bun:alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN ./build.sh && rm -rf tests node_modules/.cache

ENV REVERSE_PROXY=true

EXPOSE 9876

CMD ["bun", "run", "start"]