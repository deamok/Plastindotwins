FROM node:20-alpine

WORKDIR /app

# Install openssl & libc6-compat for Prisma engine on Alpine
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 5001

CMD ["node", "src/server.js"]
