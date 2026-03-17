FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY agent.json ./
COPY public/ ./public/
RUN mkdir -p /skills
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/server.js"]
