export default async function handler(req, res) {
  // Only POST requests are allowed
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    // Get request data
    const { application, problems = [] } = req.body || {};

    // Validate application name
    if (!application || !application.trim()) {
      return res.status(400).json({
        error: "Application name is required."
      });
    }

    // Get Gemini API key from Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured in Vercel."
      });
    }

    // Make sure problems is an array
    const selectedProblems = Array.isArray(problems)
      ? problems
      : [];

    // Convert problems into readable text
    const problemText =
      selectedProblems.length > 0
        ? selectedProblems.join(", ")
        : "No specific UX problems selected.";

    // Professional UX analysis prompt
    const prompt = `
You are a professional UX/UI analyst.

You are helping with a B.Sc. Computer Science field project.

Analyze the following application:

Application:
${application.trim()}

Observed UX problems:
${problemText}

Your task is to generate practical, application-specific UX recommendations.

IMPORTANT RULES:

1. Focus ONLY on the selected UX problems.
2. Make recommendations relevant to the named application.
3. Do not invent features that are definitely not present.
4. Do not give vague or generic recommendations when a specific recommendation is possible.
5. Use simple professional English.
6. Do not mention developers, programmers or source code.
7. Do not mention that you are an AI.
8. Do not mention the application's owner, creator or developer.
9. Recommendations must be realistic and useful for a UX field survey.
10. Return between 3 and 6 recommendations.
11. Each recommendation must explain:
    - the UX problem
    - its severity
    - what should be improved
    - why the improvement helps users
12. Return ONLY valid JSON.
13. Do not use Markdown.
14. Do not put JSON inside a code block.

Return exactly this structure:

{
  "summary": "Short professional UX analysis summary",
  "uxScore": 75,
  "category": "Application category",
  "priority": "Medium",
  "recommendations": [
    {
      "problem": "UX problem",
      "severity": "Medium",
      "recommendation": "Specific practical recommendation",
      "reason": "Why this improves the user experience"
    }
  ]
}

UX SCORE RULES:

- uxScore must be a number from 0 to 100.
- Higher score means better UX.
- Consider the number and seriousness of the selected problems.
- If many serious problems are selected, the score should be lower.
- If fewer and less serious problems are selected, the score can be higher.

PRIORITY MUST BE EXACTLY ONE OF:

High
Medium
Low

SEVERITY MUST BE EXACTLY ONE OF:

High
Medium
Low
`;

    // Call Gemini API
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
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],

          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 3000
          }
        })
      }
    );

    // Read Gemini response
    const data = await response.json();

    // If Gemini returns an error
    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.error?.status ||
          "Gemini API request failed."
      });
    }

    // Extract generated text
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Empty Gemini response:", data);

      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    // Convert Gemini JSON text into JavaScript object
    let result;

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Gemini response text:", text);

      return res.status(500).json({
        error: "Gemini returned an invalid JSON response."
      });
    }

    // Validate recommendations
    if (
      !result.recommendations ||
      !Array.isArray(result.recommendations)
    ) {
      return res.status(500).json({
        error: "Gemini response did not contain recommendations."
      });
    }

    // Send successful result to frontend
    return res.status(200).json({
      summary: result.summary || "UX analysis completed.",
      uxScore:
        typeof result.uxScore === "number"
          ? result.uxScore
          : 0,
      category:
        result.category || "General Application",
      priority:
        result.priority || "Medium",
      recommendations: result.recommendations
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while generating recommendations."
    });
  }
}
