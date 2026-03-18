FROM node:20-alpine AS builder
WORKDIR /app
COPY reference-agent/package*.json ./
RUN npm install --ignore-scripts
COPY reference-agent/tsconfig.json ./
COPY reference-agent/src/ ./src/
COPY reference-agent/agent.json ./
RUN npx tsc --skipLibCheck

FROM node:20-alpine
WORKDIR /app
COPY reference-agent/package*.json ./
RUN npm install --production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/agent.json ./
RUN mkdir -p /skills
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
