FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
COPY agent.json ./
COPY public/ ./public/

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Skills directory
RUN mkdir -p /skills

ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
