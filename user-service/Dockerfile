FROM node:22-alpine AS builder


WORKDIR /app

# Install pnpm globally in this stage
RUN npm install -g pnpm


COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma


RUN pnpm install --frozen-lockfile


RUN pnpm prisma generate 


COPY . .

RUN pnpm build


# === STAGE 2: Final Production Image===
FROM node:22-alpine AS final
WORKDIR /app


COPY --from=builder /app/node_modules ./node_modules/

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist/ 

COPY --from=builder /app/prisma ./prisma


ENV NODE_ENV production
EXPOSE 5001

CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/app.js"]