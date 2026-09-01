export default async function handler(req, res) {

  // Only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    // Get data from frontend
    const {
      application,
      problems = []
    } = req.body || {};


    // Check application
    if (!application || !application.trim()) {

      return res.status(400).json({
        error: "Application name is required."
      });

    }


    // Get Gemini API key
    const apiKey =
      process.env.GEMINI_API_KEY;


    // Check API key
    if (!apiKey) {

      return res.status(500).json({
        error:
          "GEMINI_API_KEY is missing in Vercel Environment Variables."
      });

    }


    // Make sure problems is an array
    const selectedProblems =
      Array.isArray(problems)
        ? problems
        : [];


    // Convert problems to text
    const problemText =
      selectedProblems.length > 0
        ? selectedProblems.join(", ")
        : "No specific UX problems selected.";


    // Professional UX prompt
    const prompt = `

You are a professional UX/UI analyst.

This analysis is for a B.Sc. Computer Science field project.

Application:
${application.trim()}

Observed UX problems:
${problemText}


TASK:

Analyze the selected UX problems and provide professional,
practical and application-specific UX recommendations.


IMPORTANT RULES:

1. Focus ONLY on the selected UX problems.

2. Make recommendations relevant to the named application.

3. Do not invent features that are definitely not present.

4. Do not give vague generic recommendations when a
   specific recommendation is possible.

5. Use simple professional English.

6. Do not mention developers, programmers or source code.

7. Do not mention that you are an AI.

8. Do not mention the owner, creator or developer of the application.

9. Recommendations should be realistic for a student
   field survey/project.

10. Return 3 to 6 recommendations.

11. Each recommendation must contain:
    - problem
    - severity
    - recommendation
    - reason

12. Return ONLY valid JSON.

13. Do not use Markdown.

14. Do not put JSON inside a code block.


RETURN EXACTLY THIS STRUCTURE:

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


UX SCORE:

- Number between 0 and 100.
- Higher score means better UX.
- Consider the number and seriousness of selected problems.


PRIORITY must be exactly one of:

High
Medium
Low


SEVERITY must be exactly one of:

High
Medium
Low

`;


    // Gemini API request
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
    const data =
      await response.json();


    // Gemini error
    if (!response.ok) {

      console.error(
        "Gemini API Error:",
        data
      );

      return res.status(
        response.status
      ).json({

        error:
          data?.error?.message ||
          data?.error?.status ||
          "Gemini API request failed."

      });

    }


    // Get generated text
    const text =
      data
        ?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;


    // Empty response
    if (!text) {

      console.error(
        "Empty Gemini response:",
        data
      );

      return res.status(500).json({

        error:
          "Gemini returned an empty response."

      });

    }


    // Convert JSON text
    let result;

    try {

      result =
        JSON.parse(text);

    } catch (error) {

      console.error(
        "JSON Parse Error:",
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


    // Validate recommendations
    if (
      !result.recommendations ||
      !Array.isArray(
        result.recommendations
      )
    ) {

      return res.status(500).json({

        error:
          "Gemini response did not contain recommendations."

      });

    }


    // Return result to frontend
    return res.status(200).json({

      summary:
        result.summary ||
        "UX analysis completed.",

      uxScore:
        typeof result.uxScore === "number"
          ? result.uxScore
          : 0,

      category:
        result.category ||
        "General Application",

      priority:
        result.priority ||
        "Medium",

      recommendations:
        result.recommendations

    });


  } catch (error) {

    console.error(
      "Server Error:",
      error
    );

    return res.status(500).json({

      error:
        error?.message ||
        "Something went wrong while generating recommendations."

    });

  }

}
