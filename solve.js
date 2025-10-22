// This file is designed to run in a Node.js serverless environment (e.g., Netlify, Vercel).
// The API key is securely accessed via environment variables.

// Get the API Key securely from the environment variables
const apiKey = process.env.GEMINI_API_KEY; 

// The static system instruction remains on the secure server side
const systemPrompt = "You are 'The K Solver', an advanced mathematical computation engine. Your only function is to solve the given mathematical problem. You **must** provide the complete solution steps and the final answer **exclusively** using LaTeX mathematical notation. To enhance clarity, you **must** include brief, descriptive step labels (like LCM, Move, Cancel, Substitute, Simplify) within the LaTeX using the \\text{} command. For example, use constructs like: '$$ \\frac{1}{2} + \\frac{1}{3} = \\frac{3+2}{6} \\quad \\text{(LCM)} $$' or use the 'align*' environment for multi-step solutions with labels. Do not include any introductory text, closing remarks, explanations, descriptions, or any conversational language outside of the \\text{} command within the math block. Use '$$' for display equations and '$' for inline expressions. If the problem is unsolvable or invalid, output the message '$$ \\text{Invalid or Unsolvable Problem} $$'.";


// Universal handler for serverless functions (e.g., Netlify/Vercel)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        // Only allow POST requests for security
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in environment variables.");
        return res.status(500).json({ message: "Server configuration error: API Key missing." });
    }

    try {
        const body = await req.json(); // Netlify/Vercel standard way to read JSON body
        const { userQuery, base64Image, mimeType } = body;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        const contentsParts = [];
        contentsParts.push({ text: userQuery });

        if (base64Image && mimeType) {
            contentsParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                }
            });
        }

        const payload = {
            contents: [{ parts: contentsParts }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const geminiResult = await geminiResponse.json();

        const candidate = geminiResult.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const solutionText = candidate.content.parts[0].text;
            
            // Return ONLY the solution text (pure LaTeX) to the frontend
            return res.status(200).json({ solution: solutionText });
        } else {
             // Handle cases where the model response is empty or unexpected
            const errorMessage = geminiResult.error?.message || "Model returned no content.";
            console.error("Gemini API Error:", errorMessage, geminiResult);
            return res.status(500).json({ solution: `$$ \\text{API Error: } \\text{${errorMessage.substring(0, 50)}...} $$` });
        }

    } catch (error) {
        console.error("Backend processing failed:", error);
        return res.status(500).json({ message: "Internal server error during computation." });
    }
}

