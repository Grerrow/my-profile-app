import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.text({ type: "*/*" })); // ✅ Preserve raw body for GraphQL & auth requests

app.all("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing target URL" });
  }

  try {
    // 🧹 Clean headers and strip quotes from Authorization
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === "host") continue;
      headers[key] =
        key.toLowerCase() === "authorization"
          ? value.replace(/^"|"$/g, "")
          : value;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    const text = await response.text();

    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Try to forward JSON if possible
    if (response.headers.get("content-type")?.includes("application/json")) {
      try {
        res.status(response.status).json(JSON.parse(text));
      } catch {
        res.status(response.status).send(text);
      }
    } else {
      res.status(response.status).send(text);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res
      .status(500)
      .json({ error: "Proxy request failed", details: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
