// Проксі до Gemini. Ключ живе тільки на сервері (process.env.GEMINI_API_KEY).
//
// Захист від чужого використання квоти:
//   1. дозволені лише запити з доменів проєкту (Origin / Referer);
//   2. обмеження частоти запитів на IP;
//   3. ліміт довжини prompt.
// Заголовок Origin можна підробити поза браузером — від цілеспрямованої атаки
// рятує тільки справжній токен. Ліміт частоти (2) працює в будь-якому разі.

const ALLOWED_HOSTS = [
  'ihk-exam-trainer.vercel.app',
  'ihk-exam-trainer-tyze.vercel.app',
  'localhost',
  '127.0.0.1'
];

const MAX_PROMPT = 4000;      // символів
const WINDOW_MS = 60 * 1000;  // вікно обліку
const MAX_PER_WINDOW = 20;    // запитів з одного IP за вікно

// Живе в пам'яті інстансу. Serverless піднімає кілька інстансів, тому це
// не абсолютний ліміт, але масовий перебір з одного IP він зупиняє.
const hits = new Map();

function hostOf(value) {
  if (!value) return null;
  try { return new URL(value).hostname; } catch (e) { return null; }
}

function isAllowed(req) {
  const host = hostOf(req.headers.origin) || hostOf(req.headers.referer);
  if (!host) return false;                     // ні Origin, ні Referer — не браузер зі сторінки
  return ALLOWED_HOSTS.includes(host) || host.endsWith('.vercel.app');
}

function rateLimited(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const rec = hits.get(ip);

  if (!rec || now - rec.start > WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
  } else {
    rec.n++;
    if (rec.n > MAX_PER_WINDOW) return true;
  }

  // прибирання старих записів, щоб мапа не росла нескінченно
  if (hits.size > 500) {
    for (const [k, v] of hits) if (now - v.start > WINDOW_MS) hits.delete(k);
  }
  return false;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowed(req);

  if (allowed && origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(allowed ? 200 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });
  if (rateLimited(req)) return res.status(429).json({ error: 'Забагато запитів. Спробуй за хвилину.' });

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const prompt = body && body.prompt;

  if (typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'No prompt' });
  if (prompt.length > MAX_PROMPT) return res.status(413).json({ error: 'Prompt задовгий' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'No API key configured' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 } }
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini HTTP', response.status);
      return res.status(502).json({ error: 'Помилка AI' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Помилка AI';
    res.status(200).json({ text });
  } catch (e) {
    console.error('Gemini error:', e);           // деталі — у лог, не клієнту
    res.status(500).json({ error: 'Помилка AI' });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}
