import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());
// Simple internal access protection
app.use((req, res, next) => {
  const secret = req.headers["x-vetopia-secret"];

  if (!secret || secret !== process.env.VETOPIA_SHARED_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  next();
});
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = process.env.OPENAI_VECTOR_STORE_ID;

app.post("/ask", async (req, res) => {
  try {
    const question = req.body.question;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: `
You are an internal veterinary clinical assistant for Vetopia professionals.

Rules:
- Use ONLY information retrieved from the uploaded veterinary books.
- If the answer is not found in the provided sources, say: "Not found in the provided books."
- Do NOT guess.
- Always include a "Sources" section listing book title and page numbers when available.

Format:
1. Summary
2. Practical clinical guidance
3. Red flags / precautions
4. Sources
          `,
        },
        {
          role: "user",
          content: question,
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [VECTOR_STORE_ID],
        },
      ],
    });

    res.json({
      answer: response.output_text,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
