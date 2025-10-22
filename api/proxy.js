// api/proxy.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // ✅ Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*'); // allow all origins
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing target URL' });
  }

  try {
    // Build fetch options
    const fetchOptions = {
      method: req.method,
      headers: { ...req.headers },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    };

    delete fetchOptions.headers.host; // remove host header, otherwise target may reject

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type');

    // Forward response headers, status, and body
    res.status(response.status);
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.json(data);
    } else {
      const data = await response.text();
      return res.send(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
