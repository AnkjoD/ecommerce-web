# Base image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port (Matching admin/vite.config.ts)
EXPOSE 8080

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
