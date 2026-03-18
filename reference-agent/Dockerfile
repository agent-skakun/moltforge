FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
COPY agent.json ./
RUN npx tsc --skipLibCheck

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production --ignore-scripts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/agent.json ./
RUN mkdir -p /skills
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
