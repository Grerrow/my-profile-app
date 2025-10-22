// api/proxy.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'Missing url query' });

  try {
    // Forward headers but remove host-related headers that might break things:
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];

    const response = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET','HEAD'].includes(req.method) ? undefined : req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : await req.text()
    });

    const text = await response.text();
    // Allow CORS for your front-end
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    res.status(response.status).send(text);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: err.message });
  }
}
