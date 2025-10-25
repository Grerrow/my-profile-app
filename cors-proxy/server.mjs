import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// ✅ Parse both JSON and text automatically
// This ensures GraphQL & signin requests are sent properly as JSON
app.use(express.json({ type: ["application/json", "text/plain", "*/*"] }));

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

    // ✅ Rebuild request body only if it exists and method allows it
    let bodyToSend;
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      // If it's already an object (from express.json), stringify it
      bodyToSend = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: bodyToSend,
    });

    // ✅ Forward headers + status
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Try to forward JSON directly
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        res.status(response.status).json(json);
      } catch {
        res.status(response.status).send(text);
      }
    } else {
      res.status(response.status).send(text);
    }
  } catch (err) {
    console.error("❌ Proxy error:", err);
    res.status(500).json({
      error: "Proxy request failed",
      details: err.message,
    });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
