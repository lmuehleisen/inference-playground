FROM node:alpine

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if available)
COPY package.json package-lock.json* ./

# Install all dependencies, including dev dependencies
RUN npm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Prune dev dependencies
RUN npm prune --prod

# Set correct permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "build"]