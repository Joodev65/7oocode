
import fetch from "node-fetch";

let API_KEY_CACHE = null;
let CACHE_TIME = 0;
const CACHE_TTL_MS = 1000 * 60 * 5; // cache 5 menit
const PASTEBIN_RAW = "https://pastebin.com/raw/re3adUkS";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=";

async function getApiKey() {
  const now = Date.now();
  if (API_KEY_CACHE && (now - CACHE_TIME) < CACHE_TTL_MS) {
    return API_KEY_CACHE;
  }

  const res = await fetch(PASTEBIN_RAW, { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to fetch API key from Pastebin: " + res.status);
  }
  const key = (await res.text()).trim();
  if (!key) throw new Error("Empty API key from Pastebin");
  API_KEY_CACHE = key;
  CACHE_TIME = now;
  return API_KEY_CACHE;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }

    
    const { message } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required (string)" });
    }

    
    if (message.length > 6000) {
      return res.status(400).json({ error: "Message too long (max 6000 chars)" });
    }

    const apiKey = await getApiKey();

    const payload = {
      contents: [{ parts: [{ text: message }] }]
    };

    const gRes = await fetch(GEMINI_URL + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      

    });

    const data = await gRes.json();


    return res.status(gRes.status || 200).json(data);
  } catch (err) {
    console.error("api/gemini error:", err);
    return res.status(500).json({ error: String(err.message ?? err) });
  }
}
