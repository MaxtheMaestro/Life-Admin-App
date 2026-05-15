import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 8080);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
  });
});

const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(404).send('Run npm run build before starting the production server.');
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Life Admin server listening on port ${port}`);
});
