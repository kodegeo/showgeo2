# ---- Base image ----
    FROM node:20-slim

    WORKDIR /app
    
    # Install OpenSSL for Prisma
    RUN apt-get update \
      && apt-get install -y openssl \
      && rm -rf /var/lib/apt/lists/*
    
    # Copy package files
    COPY package*.json ./
    
    # Install dependencies
    RUN npm install
    
    # Copy source
    COPY . .
    
    # Generate Prisma client INSIDE runtime node_modules
    RUN npx prisma generate
    
    # Build NestJS
    RUN npm run build
    
    ENV NODE_ENV=production
    ENV PORT=3000
    
    EXPOSE 3000
    
    CMD ["node", "dist/src/main.js"]
    