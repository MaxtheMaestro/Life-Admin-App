import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const apiOnly = process.argv.includes('--api-only');
const port = Number(process.env.PORT || (apiOnly ? 3001 : 8080));
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

app.use(express.json({ limit: '32kb' }));

app.post('/api/generate-checklist', async (req, res) => {
  const { taskTitle, category } = req.body || {};

  if (typeof taskTitle !== 'string' || typeof category !== 'string' || !taskTitle.trim()) {
    return res.status(400).json({ error: 'taskTitle and category are required.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: `Generate a step-by-step checklist for a personal life admin task titled "${taskTitle}" in the category "${category}". Provide a list of small, actionable steps.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'The step description.',
              },
            },
            required: ['title'],
          },
        },
      },
    });

    const text = response.text;
    const items = text ? JSON.parse(text) : [];
    return res.json(items);
  } catch (error) {
    console.error('Gemini checklist generation failed', error);
    return res.status(500).json({ error: 'Checklist generation failed.' });
  }
});

if (!apiOnly) {
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
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Life Admin server listening on port ${port}`);
});
