export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { application, problems = [] } = req.body || {};

    if (!application) {
      return res.status(400).json({
        error: "Application name is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured"
      });
    }

    const problemText =
      problems.length > 0
        ? problems.join(", ")
        : "No specific UX problems selected";

    const prompt = `
You are a professional UX/UI analyst for a B.Sc. Computer Science field project.

Analyze the following application/website:

Application: ${application}

Selected UX problems:
${problemText}

Give practical, application-specific UX recommendations.

IMPORTANT:
- Do not invent features that the application definitely does not have.
- Keep recommendations realistic and useful.
- Do not discuss unrelated topics.
- Use professional but easy-to-understand language.

Return the result in this exact JSON format:

{
  "summary": "short professional UX summary",
  "uxScore": 0,
  "category": "application category",
  "priority": "High, Medium, or Low",
  "recommendations": [
    {
      "problem": "UX problem",
      "severity": "High, Medium, or Low",
      "recommendation": "specific recommendation",
      "reason": "why this improves UX"
    }
  ]
}

Give 3 to 6 recommendations.
The uxScore must be a number from 0 to 100.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: 1200
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(500).json({
        error: "Gemini API request failed"
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return res.status(500).json({
        error: "No recommendation was generated"
      });
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        summary: text,
        uxScore: 0,
        category: "Application",
        priority: "Medium",
        recommendations: []
      };
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Something went wrong while generating recommendations"
    });
  }
}
