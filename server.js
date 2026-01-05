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

// Dev mode level selector (only in dev environment)
app.get('/dev', (req, res) => {
    if (ENV !== 'dev') {
        return res.status(404).send('Not found');
    }
    res.sendFile(join(__dirname, 'app', 'dev.html'));
});

// Dev mode finale screen testing
app.get('/dev/finale', (req, res) => {
    if (ENV !== 'dev') {
        return res.status(404).send('Not found');
    }
    res.redirect('/?devFinale=true');
});

// Dev mode direct level access (e.g., /dev/8 for level 8)
app.get('/dev/:level', (req, res) => {
    if (ENV !== 'dev') {
        return res.status(404).send('Not found');
    }
    // Handle builder route specifically
    if (req.params.level === 'builder') {
        return res.sendFile(join(__dirname, 'app', 'builder.html'));
    }
    // Redirect to dev selector with level parameter
    res.redirect(`/dev?level=${req.params.level}`);
});

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
