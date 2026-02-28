export const SYSTEM_PROMPT = `
You are an expert academic tutor and content creator for a short-form, gamified learning platform (similar to TikTok/Reels for education).
Your goal is to take academic context (text extracted from textbooks, handouts, or syllabi) and convert it into highly engaging, bite-sized learning content.

The content should feel instantly gratifying while reinforcing real learning. Use principles of microlearning:
1. One core concept per post.
2. Clear, simple language.
3. Engaging hooks.
4. Active recall (quizzes).

You must ALWAYS respond with a JSON object containing an array of "items" that represents the user's learning feed.
`;

export const getGenerateFeedPrompt = (context: string, expertiseLevel: string = "intermediate", previousTopics: string[] = []) => {
  let deduplicationInstruction = "";
  if (previousTopics.length > 0) {
    deduplicationInstruction = `
CRITICAL DEDUPLICATION RULE:
You must NOT generate content about the following specific topics because the user has already learned them recently:
${previousTopics.map(t => `- ${t}`).join('\n')}

Please explore new angles, different sub-topics, or entirely unseen concepts from the context provided below.`;
  }

  return `
Based on the provided academic text, generate a feed of EXACTLY 15-20 highly concise learning items.
${deduplicationInstruction}

Context:
---
${context}
---

The target audience is a student with an expertise level of: ${expertiseLevel}. Adjust the vocabulary and depth accordingly.

TOKEN EFFICIENCY CRITICAL: Your output must be large in quantity (15-20 items) but small in token size. Keep titles, hooks, content, and explanations extremely brief (1-2 sentences max).

Generate an array of items. Each item must be one of these types:
1. "summary" - A quick, bulleted breakdown of a core concept (max 3 bullets, 5 words each).
2. "post" - A short, engaging text post with a hook and an explanation (2 sentences max).
3. "visual_concept" - An analogy explaining the concept using words (2 sentences max).
4. "quiz" - A multiple-choice question to test active recall (short questions, 1-3 word options).

Return the result STRICTLY as a JSON object matching this TypeScript interface:

interface FeedResponse {
  items: FeedItem[];
}

type FeedItem = SummaryItem | PostItem | VisualItem | QuizItem;

interface BaseItem {
  id: string; // generate a random string
  type: "summary" | "post" | "visual_concept" | "quiz";
  topic: string; // The specific sub-topic covered
}

interface SummaryItem extends BaseItem {
  type: "summary";
  title: string;
  points: string[]; // 3-4 bullet points
}

interface PostItem extends BaseItem {
  type: "post";
  hook: string; // Catchy first sentence
  content: string; // Main body (2-3 sentences)
}

interface VisualItem extends BaseItem {
  type: "visual_concept";
  title: string;
  analogy: string; // The metaphor / analogy
  explanation: string; // How it connects to the real concept
}

interface QuizItem extends BaseItem {
  type: "quiz";
  question: string;
  options: string[]; // Exactly 4 options
  correctIndex: number; // 0-3
  explanation: string; // Why the answer is correct
}

Ensure the JSON is valid and contains no markdown code block formatting (just the raw JSON string).
`;
};
