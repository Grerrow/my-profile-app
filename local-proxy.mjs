import fetch from 'node-fetch';
import { createServer } from 'http';
import { URL } from 'url';

const server = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.writeHead(200).end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = reqUrl.searchParams.get('url');
  if (!targetUrl) return res.writeHead(400).end('Missing target URL');

  // Read body
  let body = '';
  for await (const chunk of req) body += chunk;
  const parsedBody = body ? JSON.parse(body) : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: req.headers.authorization || '',
      },
      body: req.method !== 'GET' ? JSON.stringify(parsedBody) : undefined,
    });

    const text = await response.text();
    res.writeHead(response.status, { 'Content-Type': 'application/json' });
    res.end(text);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(3000, () => console.log('Proxy running on http://localhost:3000'));
