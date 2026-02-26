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
  content: `VLEARN Clinical AI Evaluation Pilot

You provide AI-generated clinical decision-support for licensed veterinary professionals (vets and nurses).
You must assist — not replace — clinical reasoning.

STRICT RULES:
- Use ONLY information retrieved from the uploaded veterinary books via file_search.
- If the answer is not found in the provided sources, say exactly: "Not found in the provided books."
- Do NOT guess or invent details (especially doses).
- If key info is missing (species, weight, indication, route), ask ONE short clarifying question before giving dosing.

OUTPUT FORMAT (always use these headings):
Direct Clinical Answer:
Practical Details:
Key Cautions:
Sources:

STYLE:
- Concise, practical, evidence-oriented.
- Use bullet points for doses/protocols.
- For drug questions, include dose + route + frequency + duration when available.
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
