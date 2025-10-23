import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); // ✅ Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));

app.use("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing target URL" });
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        "Authorization": req.headers["authorization"] || "",
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    const text = await response.text();

    // Try to forward as JSON if possible
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (response.headers.get("content-type")?.includes("application/json")) {
      res.status(response.status).json(JSON.parse(text));
    } else {
      res.status(response.status).send(text);
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy request failed", details: err.message });
  }
});

app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
