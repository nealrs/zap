# Bubble Zap 3D - Docker Setup

## Development with Hot Reload

Run in development mode with hot reload (changes to files are reflected immediately):

```bash
docker-compose up dev
```

Access at: http://localhost:3000

Changes to any files in the `/app` directory (HTML, CSS, JS, JSON) will be automatically reflected without rebuilding the container.

## Production

Run in production mode (with service worker enabled):

```bash
docker-compose up app
```

Or build and run manually:

```bash
docker build -t bubble-zap .
docker run -p 3000:3000 -e ENV=production bubble-zap
```

## Environment Variables

- `ENV`: Set to `dev` to disable service worker, any other value enables it
- `PORT`: Server port (default: 3000)

## Stop Containers

```bash
docker-compose down
```
