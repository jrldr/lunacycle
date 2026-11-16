import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/health-summary', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    try {
      const {
        profileSummary,
        forecastSummary,
        recentCycles,
        topSymptoms,
        moodCounts,
        bbtSummary,
      } = req.body || {};

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        'Analyze this user menstrual cycle tracking data and provide a clear, supportive, non-diagnostic health summary.',
        '',
        `Profile Context: ${JSON.stringify(profileSummary || {})}`,
        `Cycle Forecast & Averages: ${JSON.stringify(forecastSummary || {})}`,
        `Recent Cycles: ${JSON.stringify(recentCycles || [])}`,
        `Top Logged Symptoms: ${JSON.stringify(topSymptoms || [])}`,
        `Logged Mood Distribution: ${JSON.stringify(moodCounts || {})}`,
        `Basal Body Temp Readings: ${JSON.stringify(bbtSummary || [])}`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'You are a knowledgeable, empathetic women’s health educator. Summarize the user’s menstrual cycle health plainly in concise prose based strictly on their logged metrics. Explain how their cycle regularity, flow duration, symptoms, and mood patterns align with normal hormonal fluctuations (Estrogen, Progesterone, LH, FSH). Keep each field concise (2–3 sentences max). Never diagnose medical conditions; include a practical note on when to consult a healthcare provider.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallSummary: {
                type: Type.STRING,
                description:
                  '2-3 sentence holistic summary of the user menstrual health and cycle rhythm.',
              },
              cycleRegularityAssessment: {
                type: Type.STRING,
                description:
                  'Assessment of average cycle length, period duration, and cycle-to-cycle variation.',
              },
              symptomAndMoodPatterns: {
                type: Type.STRING,
                description:
                  'Insight connecting logged physical symptoms and mood swings to hormonal phases.',
              },
              fertilityOutlook: {
                type: Type.STRING,
                description:
                  'Brief summary of fertile window timing and ovulation regularity.',
              },
              actionableTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  '3 to 4 practical, cycle-aware wellness and tracking tips tailored to their logs.',
              },
              careNote: {
                type: Type.STRING,
                description:
                  'Brief non-diagnostic guidance on signs that warrant consulting a clinician.',
              },
            },
            required: [
              'overallSummary',
              'cycleRegularityAssessment',
              'symptomAndMoodPatterns',
              'fertilityOutlook',
              'actionableTips',
              'careNote',
            ],
          },
        },
      });

      const text = (response.text ?? '{}').trim();
      const parsed = JSON.parse(text);
      res.json({ ...parsed, source: 'gemini' });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate AI menstrual health summary.';
      res.status(500).json({ error: message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`LunaCycle server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
