import express from 'express';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 8080);
const firebaseAuthDomain = 'gen-lang-client-0870601273.firebaseapp.com';

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
  });
});

function proxyFirebaseAuth(req, res) {
  const proxyReq = https.request(
    {
      hostname: firebaseAuthDomain,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...req.headers,
        host: firebaseAuthDomain,
      },
    },
    (proxyRes) => {
      res.statusCode = proxyRes.statusCode || 500;

      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      }

      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    console.error('Firebase auth proxy failed', error);
    res.status(502).send('Firebase auth proxy failed.');
  });

  req.pipe(proxyReq);
}

app.use('/__/auth', proxyFirebaseAuth);
app.use('/__/firebase', proxyFirebaseAuth);

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
