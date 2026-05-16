const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma4:31b-cloud";

const FALLBACK_DIAGNOSIS = {
  disease: "Analysis Error",
  confidence: 0,
  caused_by: "unknown",
  symptoms: "unknown",
  treatment: "unknown",
  pesticide: "unknown",
  urgency: "low",
  recovery_days: 0,
  preventive_measures: "unknown",
};

function cleanJsonText(text: string) {
  return text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

async function diagnoseWithOllama(imageBase64: string, prompt: string) {
  const baseUrl = OLLAMA_BASE_URL.replace(/\/$/, "");
  const apiBase = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

  const response = await fetch(`${apiBase}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      images: [imageBase64],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return cleanJsonText(data.response ?? "");
}

async function diagnoseWithGemini(imageBase64: string, mimeType: string, prompt: string) {
  if (!GEMINI_API_KEY) throw new Error("Gemini API key missing");

  // Using gemini-1.5-flash for fast and reliable multimodal diagnosis
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return cleanJsonText(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

export async function diagnoseCrop(imageBase64: string, mimeType = "image/jpeg") {
  const prompt =
    "You are an expert agronomist. Analyze this crop image. Respond ONLY in raw JSON with no markdown or backticks: { disease, confidence (0-100 number), caused_by, symptoms, treatment, pesticide, urgency (low/medium/high), recovery_days (number), preventive_measures }";

  try {
    let resultText: string;

    try {
      // Try Ollama first (Local development/Private host)
      resultText = await diagnoseWithOllama(imageBase64, prompt);
    } catch (ollamaError) {
      // Fallback to Google Gemini (Cloud deployment)
      if (GEMINI_API_KEY) {
        console.warn("[DIAGNOSE] Ollama failed, falling back to Gemini...");
        resultText = await diagnoseWithGemini(imageBase64, mimeType, prompt);
      } else {
        throw ollamaError;
      }
    }

    return JSON.parse(resultText);
  } catch (error) {
    console.error("[DIAGNOSE_ERROR]", error);
    return FALLBACK_DIAGNOSIS;
  }
}
