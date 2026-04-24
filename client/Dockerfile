# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port (Matching vite.config.ts)
EXPOSE 3000

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
