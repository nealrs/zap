# Bubble Zap 3D - Docker Setup

## Branch Configuration

The Docker Compose setup uses different git branches for different environments:
- **Production (`zap-prod`)**: Builds from `main` branch (port 1337)
- **Development (`zap-dev`)**: Builds from `dev` branch (port 1338)

## Development with Hot Reload

Run in development mode with hot reload (changes to files are reflected immediately):

```bash
docker-compose up zap-dev
```

Access at: http://localhost:1338

Changes to any files in the `/app` directory (HTML, CSS, JS, JSON) will be automatically reflected without rebuilding the container.

**Note**: The dev service builds from the `dev` branch. Make sure to create and push the `dev` branch first:

```bash
# Create and push dev branch
git checkout -b dev
git push -u origin dev
```

## Production

Run in production mode (with service worker enabled):

```bash
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
