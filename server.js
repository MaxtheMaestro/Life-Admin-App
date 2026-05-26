import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 8080);
const isProduction = process.env.NODE_ENV === 'production';
const authAttemptStore = new Map();

const parseCsv = (value, fallback) => (
  value
    ? value.split(',').map((item) => item.trim()).filter(Boolean)
    : fallback
);

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeHost = (value = '') => {
  const host = String(value).trim().toLowerCase();
  const bracketedIpv6 = host.match(/^\[([^\]]+)\]/);
  if (bracketedIpv6) return bracketedIpv6[1];
  const colonCount = (host.match(/:/g) || []).length;
  if (colonCount === 1) return host.split(':')[0];
  return host;
};

const normalizeOrigin = (value = '') => {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host.toLowerCase()}`;
  } catch {
    return '';
  }
};

const productionAllowedHosts = ['life-admin-2wtl.onrender.com'];
const developmentAllowedHosts = [
  ...productionAllowedHosts,
  'localhost',
  '127.0.0.1',
  '::1',
];

const allowedHosts = new Set(parseCsv(
  process.env.ALLOWED_HOSTS,
  isProduction ? productionAllowedHosts : developmentAllowedHosts
).map(normalizeHost));

const productionAllowedOrigins = ['https://life-admin-2wtl.onrender.com'];
const developmentAllowedOrigins = [
  ...productionAllowedOrigins,
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
];

const allowedOrigins = new Set(parseCsv(
  process.env.ALLOWED_ORIGINS,
  isProduction ? productionAllowedOrigins : developmentAllowedOrigins
).map(normalizeOrigin));

const authRateLimitMax = parsePositiveNumber(process.env.AUTH_RATE_LIMIT_ATTEMPTS, 5);
const authRateLimitWindowMs = parsePositiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const allowedAuthProviders = new Set(['google', 'apple']);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  next();
});

app.use((req, res, next) => {
  const host = normalizeHost(req.hostname || req.get('host'));
  if (host && allowedHosts.has(host)) {
    return next();
  }

  return res.status(403).send('Forbidden host');
});

const requireAllowedRequestSource = (req, res, next) => {
  if (!isProduction) {
    return next();
  }

  const source = req.get('origin') || req.get('referer');
  if (source && allowedOrigins.has(normalizeOrigin(source))) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    error: 'origin_not_allowed',
  });
};

const pruneAuthAttemptStore = (now) => {
  if (authAttemptStore.size < 1000) return;

  for (const [ip, entry] of authAttemptStore.entries()) {
    if (entry.resetAt <= now) {
      authAttemptStore.delete(ip);
    }
  }
};

const authRateLimit = (req, res, next) => {
  const now = Date.now();
  const ip = normalizeHost(req.ip || req.socket.remoteAddress || 'unknown');
  const current = authAttemptStore.get(ip);
  const entry = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + authRateLimitWindowMs };

  pruneAuthAttemptStore(now);

  if (entry.count >= authRateLimitMax) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.setHeader('RateLimit-Limit', String(authRateLimitMax));
    res.setHeader('RateLimit-Remaining', '0');
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    return res.status(429).json({
      ok: false,
      error: 'too_many_auth_attempts',
      retryAfterSeconds,
    });
  }

  entry.count += 1;
  authAttemptStore.set(ip, entry);
  res.setHeader('RateLimit-Limit', String(authRateLimitMax));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, authRateLimitMax - entry.count)));
  res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
  return next();
};

const sanitizeAuthProvider = (value) => (
  typeof value === 'string'
    ? value.trim().toLowerCase().slice(0, 20)
    : ''
);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
  });
});

app.post(
  '/api/auth/attempt',
  requireAllowedRequestSource,
  authRateLimit,
  express.json({ limit: '1kb', strict: true }),
  (req, res) => {
    const provider = sanitizeAuthProvider(req.body?.provider);

    if (!allowedAuthProviders.has(provider)) {
      return res.status(400).json({
        ok: false,
        error: 'invalid_auth_provider',
      });
    }

    return res.json({
      ok: true,
    });
  }
);

app.use('/api', (_req, res) => {
  res.status(404).json({
    ok: false,
    error: 'not_found',
  });
});

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      ok: false,
      error: 'invalid_json',
    });
  }

  return next(error);
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
