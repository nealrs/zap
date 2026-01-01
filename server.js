import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ENV = process.env.ENV || 'production';

// Serve static files from app directory
app.use(express.static(join(__dirname, 'app')));

// Inject environment variable into HTML
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'app', 'index.html'));
});

// API endpoint to get environment
app.get('/api/env', (req, res) => {
    res.json({ env: ENV });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${ENV}`);
    console.log(`Service Worker: ${ENV === 'dev' ? 'DISABLED' : 'ENABLED'}`);
});
