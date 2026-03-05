# Use the official Node.js image
FROM node:18

# Create an app directory
WORKDIR /app

# Copy your package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your game files
COPY . .

# Expose the Hugging Face port
EXPOSE 7860

# Start the server
CMD ["node", "server.js"]