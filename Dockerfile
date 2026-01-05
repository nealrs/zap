FROM node:18-alpine

# Install git for branch checkout
RUN apk add --no-cache git

WORKDIR /app

# Build argument for git branch
ARG GIT_BRANCH=main

# Clone or copy repository
# If building from local context, this will copy local files
# For production builds from git, replace COPY with git clone
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Set default environment
ENV ENV=production
ENV PORT=3000
ENV GIT_BRANCH=${GIT_BRANCH}

# Start the application
CMD ["node", "server.js"]
