FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build


# === STAGE 2: Final Production Image===
FROM node:22-alpine AS final
WORKDIR /app


COPY --from=builder /app/node_modules ./node_modules/

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist/ 

CMD ["node", "dist/index.js"]
