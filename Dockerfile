# Use the official Bun image
FROM oven/bun:latest

# Set the working directory
WORKDIR /app

# Copy package.json and bun.lockb
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN bun run build

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js app
CMD ["bun", "run", "dev"]