# Bubble Zap 3D - Docker Setup

## Branch Configuration

The Docker Compose setup uses different modes for each environment:

- **Development (`zap-dev`)**: Builds from **local files** (port 1338)
  - Fast rebuilds for development
  - Uses your current branch
  - Hot reload enabled via volumes

- **Production (`zap-prod`)**: Builds from **GitHub main branch** (port 1337)
  - Always pulls latest from main
  - Clean build from git
  - Production-ready deployment

## Development with Hot Reload

Run in development mode (builds from your local files):

```bash
# No need to switch branches - uses current local files
docker-compose build --no-cache zap-dev
docker-compose up zap-dev
```

Access at: http://localhost:1338

Changes to any files in the `/app` directory (HTML, CSS, JS, JSON) will be automatically reflected without rebuilding the container.

## Production

Run in production mode (clones from GitHub main branch):

```bash
# Automatically clones from GitHub main - no local branch needed
docker-compose build --no-cache zap-prod
docker-compose up zap-prod
```

Access at: http://localhost:1337

Or build and run manually:

```bash
docker build -t bubble-zap .
docker run -p 3000:3000 -e ENV=production bubble-zap
```

## Environment Variables

- `ENV`: Set to `dev` to disable service worker, any other value enables it
- `PORT`: Server port (default: 3000)
- `GIT_BRANCH`: Git branch to build from (set via docker-compose args)

## Ports

- **1337**: Production container
- **1338**: Development container

## Stop Containers

```bash
docker-compose down
```

## Rebuild After Code Changes

When you commit changes to git:

```bash
# Rebuild specific service
docker-compose build zap-prod  # For main branch
docker-compose build zap-dev   # For dev branch

# Or rebuild and restart
docker-compose up --build zap-prod
docker-compose up --build zap-dev
```
