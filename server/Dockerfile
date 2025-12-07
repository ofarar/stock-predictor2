# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.20.0
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci

# Copy application code
COPY . .


# Final stage for app image
# Install Python runtime for the bot
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

# Copy ML Service and Dependencies
# Since we moved ml_service INTO server/, we can copy it directly from the context
WORKDIR /app
COPY ml_service /app/ml_service
# Install dependencies
RUN pip3 install --no-cache-dir -r ml_service/requirements.txt --break-system-packages

# Start the server by default, this can be overwritten at runtime
EXPOSE 5001
CMD [ "npm", "run", "start" ]
