import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

interface HologramResponse {
    code: string;
    description: string;
}

export const generateHologramCode = async (userPrompt: string): Promise<HologramResponse> => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

        const systemPrompt = `
        You are a Code Generator for a 3D Holographic Projector.
        
        TASK:
        Generate minimal Python code to render the 3D shape requested by the user.
        The code MUST define a dictionary named 'hologram'.
        
        HOLOGRAM SCHEMA:
        hologram = {
            "shape": "box" | "sphere" | "cylinder" | "torus" | "cone" | "icosahedron" | "knot" | "heart",
            "color": string (hex color like "#ff0000" or name like "red"),
            "size": number (default 1.5),
            "wireframe": boolean,
            "animate": boolean
        }

        SHAPE PRESETS:
        - "Earth": shape="sphere", color="#22d3ee", wireframe=True, animate=True
        - "Heart": shape="heart", color="#ef4444", wireframe=False, animate=True
        - "Box" / "Cube": shape="box"
        
        CONSTRAINT:
        - Output ONLY valid Python code.
        - NO conversational text (e.g. "Here is the code", "Okay I will...").
        - NO markdown formatting if possible, but code blocks are acceptable if cleaned.
        - Start with a simple print() statement to confirm the action.

        Example Interaction:
        User: "Show red sphere"
        Output:
        print("Spawning Red Sphere...")
        hologram = {"shape": "sphere", "color": "red", "size": 1.5, "wireframe": False, "animate": False}
        `;

        const result = await model.generateContent([systemPrompt, `User Command: ${userPrompt}`]);
        const text = result.response.text();

        // 1. Try to extract code from markdown block
        const codeBlockMatch = text.match(/```python([\s\S]*?)```/);
        let cleanCode = "";

        if (codeBlockMatch && codeBlockMatch[1]) {
            cleanCode = codeBlockMatch[1].trim();
        } else {
            // 2. Fallback: Take the text, but strip known conversational lines if any remain
            // Remove lines that don't look like code (this is a heuristic)
            cleanCode = text
                .replace(/```/g, "") // remove stray backticks
                .split('\n')
                .filter(line => {
                    const l = line.trim();
                    // Filter out likely conversation lines
                    if (l.startsWith("Here is")) return false;
                    if (l.startsWith("Okay")) return false;
                    if (l.startsWith("User Command")) return false;
                    return true;
                })
                .join('\n')
                .trim();
        }

        // Final sanity check: if code doesn't contain 'hologram =', it's probably wrong
        if (!cleanCode.includes("hologram =")) {
            console.warn("Generated code missing hologram definition, forcing default.");
            cleanCode = `print("Error: Invalid Generation. Resetting...")\nhologram = {"shape": "box", "color": "white", "size": 1}`;
        }

        return {
            code: cleanCode,
            description: `Generating ${userPrompt}...`
        };

    } catch (error) {
        console.error("Hologram Gen Error:", error);
        return {
            code: `print("Error: Signal Lost.")\nhologram = {"shape": "box", "color": "gray", "wireframe": True}`,
            description: "Failed to generate hologram."
        };
    }
};
