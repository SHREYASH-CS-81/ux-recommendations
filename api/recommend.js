export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const {
      application,
      problems = []
    } = req.body || {};

    if (!application) {
      return res.status(400).json({
        error: "Application name is required"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel Environment Variables."
      });
    }

    const problemText =
      problems.length > 0
        ? problems.join(", ")
        : "No specific UX problems selected";


    const prompt = `
You are a professional UX/UI analyst helping with a B.Sc. Computer Science field project.

Application:
${application}

Observed UX problems:
${problemText}

Analyze ONLY the selected UX problems.

Generate practical and application-specific UX recommendations.

Rules:

1. Focus only on the selected problems.
2. Recommendations must be realistic.
3. Use simple professional English.
4. Do not mention developers or programmers.
5. Do not mention that you are an AI.
6. Do not invent features.
7. Return 3 to 6 recommendations.
8. Return ONLY valid JSON.

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

Rules for uxScore:

0 to 100 only.

Higher score means better UX.

Priority must be exactly:
High
Medium
Low

Severity must be exactly:
High
Medium
Low
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
            maxOutputTokens: 3000
          }

        })
      }
    );


    const data = await response.json();


    if (!response.ok) {

      console.error(
        "Gemini API Error:",
        data
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Gemini API request failed."
      });

    }


    const text =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;


    if (!text) {

      console.error(
        "Empty Gemini response:",
        data
      );

      return res.status(500).json({
        error: "Gemini returned an empty response."
      });

    }


    let result;

    try {

      result = JSON.parse(text);

    } catch (error) {

      console.error(
        "Gemini JSON Parse Error:",
        error
      );

      console.error(
        "Gemini Text:",
        text
      );

      return res.status(500).json({
        error:
          "Gemini returned invalid JSON."
      });

    }


    if (
      !result.recommendations ||
      !Array.isArray(result.recommendations)
    ) {

      return res.status(500).json({
        error:
          "Gemini response did not contain recommendations."
      });

    }


    return res.status(200).json(result);


  } catch (error) {

    console.error(
      "Server Error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong."
    });

  }

}
