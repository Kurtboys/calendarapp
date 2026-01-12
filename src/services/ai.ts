import type {
  BreakdownRequest,
  BreakdownResponse,
  ContextQuestion,
  ContextAnswer,
  TaskTimeHistory,
  CognitiveLevel,
  MinimumViableSession,
} from '../types';
import { BREAKDOWN_LEVELS } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: 'text'; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
}

// Helper to call Anthropic API
async function callClaude(
  apiKey: string,
  messages: AnthropicMessage[],
  model: string = 'claude-3-haiku-20240307',
  maxTokens: number = 2000
): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data: AnthropicResponse = await response.json();
  return data.content[0].text;
}

// Generate 5 context questions specific to the task
export async function generateContextQuestions(
  apiKey: string,
  taskTitle: string
): Promise<ContextQuestion[]> {
  const prompt = `You are helping someone with ADHD break down a task. Given this task title, generate exactly 5 yes/no style context questions to understand what work has already been done and what the person needs.

Task: "${taskTitle}"

For each question, provide 3 specific options that help clarify the task state. The questions should help determine:
1. What progress has been made
2. What resources/materials are available
3. What the scope or complexity is
4. Any blockers or dependencies
5. What "done" looks like

Respond with a JSON array of exactly 5 questions in this format:
[
  {
    "id": "q1",
    "question": "What's your starting point?",
    "options": ["Haven't started yet", "Have some initial work done", "Almost finished, just polishing"],
    "allowMultiple": false
  }
]

Keep questions simple and easy to answer quickly. Make options mutually exclusive unless allowMultiple is true.
Respond ONLY with the JSON array, no other text.`;

  const response = await callClaude(apiKey, [{ role: 'user', content: prompt }], 'claude-3-haiku-20240307', 1000);

  try {
    // Extract JSON from response (in case there's any extra text)
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const questions = JSON.parse(jsonMatch[0]) as ContextQuestion[];
    return questions.slice(0, 5); // Ensure max 5 questions
  } catch (e) {
    console.error('Failed to parse context questions:', e);
    // Return fallback generic questions
    return getGenericContextQuestions();
  }
}

// Fallback generic questions if AI fails
function getGenericContextQuestions(): ContextQuestion[] {
  return [
    {
      id: 'q1',
      question: "What's your starting point?",
      options: ["Haven't started yet", "Some progress made", "Mostly done, need to finish"],
      allowMultiple: false,
    },
    {
      id: 'q2',
      question: 'Do you have everything you need?',
      options: ['Yes, all set', 'Missing some things', 'Not sure what I need'],
      allowMultiple: false,
    },
    {
      id: 'q3',
      question: 'Have you done this type of task before?',
      options: ['First time', 'Done similar before', 'Very experienced'],
      allowMultiple: false,
    },
    {
      id: 'q4',
      question: 'Any blockers or dependencies?',
      options: ['No blockers', 'Waiting on someone', 'Need to figure something out'],
      allowMultiple: false,
    },
    {
      id: 'q5',
      question: 'How clear is the end goal?',
      options: ['Very clear', 'Somewhat clear', 'Still figuring it out'],
      allowMultiple: false,
    },
  ];
}

// Build context string from answers
function buildContextFromAnswers(questions: ContextQuestion[], answers: ContextAnswer[]): string {
  return answers.map(answer => {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) return '';

    const selectedTexts = answer.selectedOptions.map(idx => question.options[idx] || 'Unknown');
    return `${question.question} ${selectedTexts.join(', ')}`;
  }).filter(Boolean).join('\n');
}

// Calculate time adjustment based on user's historical accuracy
function calculateTimeAdjustment(history: TaskTimeHistory[], taskKeywords: string[]): number {
  if (!history || history.length === 0) return 1.0;

  // Find similar tasks based on keywords
  const similarTasks = history.filter(h =>
    h.taskKeywords.some(kw => taskKeywords.some(tk =>
      kw.toLowerCase().includes(tk.toLowerCase()) ||
      tk.toLowerCase().includes(kw.toLowerCase())
    ))
  );

  if (similarTasks.length === 0) {
    // Use overall accuracy if no similar tasks
    const avgAccuracy = history.reduce((sum, h) => sum + h.accuracy, 0) / history.length;
    return avgAccuracy;
  }

  // Weight recent tasks more heavily
  const weightedSum = similarTasks.reduce((sum, task, idx) => {
    const weight = 1 + (idx / similarTasks.length); // More recent = higher weight
    return sum + (task.accuracy * weight);
  }, 0);

  const totalWeight = similarTasks.reduce((sum, _, idx) => sum + (1 + idx / similarTasks.length), 0);
  return weightedSum / totalWeight;
}

// Generate task breakdown with checkpoints
export async function generateBreakdown(
  apiKey: string,
  request: BreakdownRequest,
  questions: ContextQuestion[]
): Promise<BreakdownResponse> {
  const levelInfo = BREAKDOWN_LEVELS[request.breakdownLevel];
  const contextString = buildContextFromAnswers(questions, request.contextAnswers);

  // Calculate time adjustment from history
  const taskKeywords = request.taskTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const timeAdjustment = request.userTimeHistory
    ? calculateTimeAdjustment(request.userTimeHistory, taskKeywords)
    : 1.0;

  const historyNote = request.userTimeHistory && request.userTimeHistory.length > 0
    ? `\n\nIMPORTANT: Based on this user's history, they typically complete tasks ${timeAdjustment < 1 ? 'faster' : 'slower'} than average. Adjust time estimates by factor of ${timeAdjustment.toFixed(2)}.`
    : '';

  const prompt = `You are an expert at breaking down tasks for people with ADHD. Your job is to take a task and break it into clear, actionable checkpoints.

Task: "${request.taskTitle}"

Breakdown Level: ${levelInfo.name} (${levelInfo.description})
Target: ${levelInfo.checkpointRange}

User Context:
${contextString}
${historyNote}

Create checkpoints that:
1. Are specific and actionable (start with a verb)
2. Have realistic time estimates in minutes
3. Account for the user's context (what's already done, what they have available)
4. Progress logically from start to finish
5. Include appropriate cognitive level (1-5) for each step

Cognitive Levels:
5 = Deep Focus (intense concentration needed)
4 = Hard But Familiar (challenging but known)
3 = Routine Work (standard work mode)
2 = Light Work (minimal thinking)
1 = Physical/Automatic (no thinking needed)

Respond with a JSON object in this exact format:
{
  "checkpoints": [
    {
      "title": "Open design software and create new project",
      "estimatedMinutes": 5,
      "cognitiveLevel": 2,
      "reasoning": "Simple setup task"
    }
  ],
  "totalEstimatedMinutes": 60,
  "suggestedCognitiveLevel": 4,
  "suggestedMVS": 30
}

suggestedMVS must be one of: 15, 30, 45, 60, 90, 120

Respond ONLY with the JSON object, no other text.`;

  const response = await callClaude(
    apiKey,
    [{ role: 'user', content: prompt }],
    'claude-sonnet-4-20250514', // Use Sonnet for better quality breakdowns
    3000
  );

  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');

    const result = JSON.parse(jsonMatch[0]) as BreakdownResponse;

    // Validate and sanitize the response
    return {
      checkpoints: result.checkpoints.map(cp => ({
        title: cp.title,
        estimatedMinutes: Math.max(1, Math.round(cp.estimatedMinutes)),
        cognitiveLevel: (Math.min(5, Math.max(1, cp.cognitiveLevel)) as CognitiveLevel),
        reasoning: cp.reasoning,
      })),
      totalEstimatedMinutes: result.totalEstimatedMinutes,
      suggestedCognitiveLevel: (Math.min(5, Math.max(1, result.suggestedCognitiveLevel)) as CognitiveLevel),
      suggestedMVS: validateMVS(result.suggestedMVS),
    };
  } catch (e) {
    console.error('Failed to parse breakdown response:', e);
    throw new Error('Failed to generate breakdown. Please try again.');
  }
}

function validateMVS(value: number): MinimumViableSession {
  const validValues: MinimumViableSession[] = [15, 30, 45, 60, 90, 120];
  const closest = validValues.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
  return closest;
}

// Extract keywords from task title for learning
export function extractTaskKeywords(title: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Categorize task type using AI
export async function categorizeTask(apiKey: string, title: string): Promise<string> {
  const prompt = `Categorize this task into ONE word category (e.g., "design", "coding", "writing", "meeting", "admin", "research", "planning", "communication", "review", "setup"):

Task: "${title}"

Respond with ONLY the category word, nothing else.`;

  try {
    const response = await callClaude(apiKey, [{ role: 'user', content: prompt }], 'claude-3-haiku-20240307', 50);
    return response.trim().toLowerCase().replace(/[^a-z]/g, '');
  } catch {
    return 'general';
  }
}

// Check if API key is valid
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    await callClaude(apiKey, [{ role: 'user', content: 'Say "ok"' }], 'claude-3-haiku-20240307', 10);
    return true;
  } catch {
    return false;
  }
}
