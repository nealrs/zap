FROM node:18-alpine

# Install git for branch checkout
RUN apk add --no-cache git

WORKDIR /app

# Build argument for git branch
ARG GIT_BRANCH=main
ARG USE_GIT=false

# Either clone from git or copy local files
RUN if [ "$USE_GIT" = "true" ]; then \
        echo "Cloning from git branch: $GIT_BRANCH" && \
        git clone --depth 1 --branch $GIT_BRANCH https://github.com/nealrs/zap.git . && \
        npm install --production; \
    else \
        echo "Using local files"; \
    fi

# Copy local files (only if not using git)
COPY package*.json ./
RUN if [ "$USE_GIT" = "false" ]; then npm install --production; fi

COPY . .

# Expose port
EXPOSE 3000

# Set default environment
ENV ENV=production
ENV PORT=3000
ENV GIT_BRANCH=${GIT_BRANCH}

# Start the application
CMD ["node", "server.js"]
