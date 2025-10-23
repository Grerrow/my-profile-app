import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Log requests to help debug
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// Proxy route
app.all("/proxy", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "Missing 'url' parameter" });

  try {
    const fetchOptions = {
      method: req.method,
      headers: { ...req.headers },
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    };
    delete fetchOptions.headers.host;

    const response = await fetch(target, fetchOptions);
    const data = await response.text();

    res.status(response.status).set({
      "Access-Control-Allow-Origin": "*",
      "Content-Type": response.headers.get("content-type") || "text/plain",
    });

    res.send(data);
  } catch (error) {
    console.error("❌ Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));

// Prevent crashes due to unhandled promises
process.on("unhandledRejection", err => {
  console.error("🚨 Unhandled Rejection:", err);
});
