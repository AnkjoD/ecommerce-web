# Base image
FROM node:20-alpine

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# Expose the port
EXPOSE 4000

# Start command
CMD ["npm", "run", "start:dev"]
