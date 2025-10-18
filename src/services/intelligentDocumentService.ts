// Intelligent Document Processing Service using LangChain + Hugging Face
// This replaces regex parsing with AI-powered document understanding

import { HfInference } from '@huggingface/inference';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  bloomLevel: 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
  timeEstimate: number;
}

interface ExtractedQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex?: number;
  bloomLevel?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  concept?: string;
}

// Hugging Face Inference client (free tier)
let hfClient: HfInference | null = null;

// Initialize Hugging Face client (works without API key on free tier with rate limits)
function getHfClient(): HfInference {
  if (!hfClient) {
    // For better performance, user can add REACT_APP_HUGGINGFACE_API_KEY to .env
    const apiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;
    hfClient = new HfInference(apiKey);
  }
  return hfClient;
}

/**
 * Intelligently extract questions from document using LLM
 * This replaces dumb regex parsing with AI understanding
 */
export async function extractQuestionsIntelligently(
  documentText: string,
  subject: string = '',
  description: string = ''
): Promise<Question[]> {

  console.log('🤖 Starting intelligent document extraction...');

  try {
    const hf = getHfClient();

    // Step 1: Use LLM to extract structured questions from the document
    const extractionPrompt = `You are an expert at extracting multiple-choice questions from documents.

Document Content:
${documentText}

Extract ALL multiple-choice questions from this document and format them as JSON. For each question, identify:
1. The question text
2. All answer options (A, B, C, D or 1, 2, 3, 4) IN THE EXACT ORDER they appear
3. The CORRECT answer (identify which option letter/number is correct, like "B" or "2")
4. If a Bloom's Taxonomy level is mentioned in the document, extract it (1-6)
5. If difficulty is mentioned (easy/medium/hard), extract it
6. The subject/concept being tested

Return a valid JSON array with this structure:
[
  {
    "questionText": "What is...",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswerIndex": 1,
    "bloomLevel": 2,
    "difficulty": "medium",
    "concept": "topic name"
  }
]

Important:
- Extract ALL questions you find
- Each question must have exactly 4 options
- correctAnswerIndex is the index (0-3) of the correct option in the options array
- Try to determine the correct answer by analyzing the question and options
- If Bloom level or difficulty is not mentioned, omit those fields
- Only return the JSON array, nothing else`;

    console.log('📝 Sending document to AI for extraction...');

    // Use Mistral-7B-Instruct for better extraction (free on HF)
    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: extractionPrompt,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.3,
        top_p: 0.9,
        return_full_text: false,
      }
    });

    console.log('✅ AI extraction complete!');

    // Parse the AI response
    const generatedText = response.generated_text;

    // Extract JSON from response (AI might include extra text)
    const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ AI did not return valid JSON, falling back to local parsing');
      return fallbackExtraction(documentText);
    }

    const extractedQuestions: ExtractedQuestion[] = JSON.parse(jsonMatch[0]);

    console.log(`📊 Extracted ${extractedQuestions.length} questions intelligently`);

    // Step 2: For questions without Bloom/difficulty, classify them
    const finalQuestions: Question[] = [];

    for (let i = 0; i < extractedQuestions.length; i++) {
      const eq = extractedQuestions[i];

      // Validate: must have 4 options
      if (!eq.options || eq.options.length !== 4) {
        console.warn(`⚠️ Question ${i + 1} doesn't have exactly 4 options, skipping`);
        continue;
      }

      let bloomLevel = eq.bloomLevel || 2;
      let difficulty = eq.difficulty || 'medium';
      let concept = eq.concept || 'General';

      // If Bloom level or difficulty not provided by AI extraction, classify it
      if (!eq.bloomLevel || !eq.difficulty) {
        console.log(`🔍 Classifying question ${i + 1}...`);
        const classification = await classifyQuestionWithAI(eq.questionText, subject, description);
        bloomLevel = classification.bloomLevel;
        difficulty = classification.difficulty;
        concept = concept === 'General' ? classification.concept : concept;
      }

      // Cap bloom level at 3 for Rasch model and ensure it's at least 1
      const validBloomLevel = Math.max(1, Math.min(bloomLevel, 3)) as 1 | 2 | 3;

      // Determine correct answer from AI-provided index or default to first option
      const correctAnswerIndex = eq.correctAnswerIndex !== undefined && eq.correctAnswerIndex >= 0 && eq.correctAnswerIndex < 4
        ? eq.correctAnswerIndex
        : 0;
      const correctAnswer = eq.options[correctAnswerIndex];

      console.log(`📝 Question ${i + 1}: Correct answer index = ${correctAnswerIndex}, Answer = "${correctAnswer}"`);

      finalQuestions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: eq.questionText,
        options: eq.options,
        correctAnswer: correctAnswer,
        bloomLevel: validBloomLevel,
        difficulty: difficulty,
        concept: concept,
        timeEstimate: 60,
      });

      // Small delay to avoid rate limiting
      if (i < extractedQuestions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return finalQuestions;

  } catch (error) {
    console.error('❌ Error in intelligent extraction:', error);
    console.log('🔄 Falling back to local parsing...');
    return fallbackExtraction(documentText);
  }
}

/**
 * Classify a question's Bloom level and difficulty using AI
 */
async function classifyQuestionWithAI(
  questionText: string,
  subject: string,
  description: string
): Promise<{ bloomLevel: number; difficulty: 'easy' | 'medium' | 'hard'; concept: string }> {

  try {
    const hf = getHfClient();

    const classificationPrompt = `Analyze this question and classify it according to Bloom's Taxonomy.

Question: "${questionText}"
Subject: ${subject || 'General'}
Context: ${description || 'Standard assessment'}

Respond with ONLY a JSON object (no other text):
{
  "bloomLevel": <number 1-6>,
  "difficulty": "<easy|medium|hard>",
  "concept": "<main concept being tested>"
}

Bloom's Taxonomy levels:
1 = Remember (recall facts)
2 = Understand (explain concepts)
3 = Apply (use knowledge in new situations)
4 = Analyze (break down information)
5 = Evaluate (make judgments)
6 = Create (produce new ideas)

Difficulty:
- easy: straightforward recall or simple application
- medium: requires understanding and moderate thinking
- hard: complex analysis, evaluation, or creation`;

    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: classificationPrompt,
      parameters: {
        max_new_tokens: 150,
        temperature: 0.2,
        return_full_text: false,
      }
    });

    const generatedText = response.generated_text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        bloomLevel: Math.min(result.bloomLevel || 2, 3), // Cap at 3
        difficulty: result.difficulty || 'medium',
        concept: result.concept || 'General'
      };
    }
  } catch (error) {
    console.warn('⚠️ AI classification failed, using keyword-based fallback');
  }

  // Fallback to keyword-based classification
  return classifyQuestionWithKeywords(questionText);
}

/**
 * Keyword-based classification (fallback)
 */
function classifyQuestionWithKeywords(
  questionText: string
): { bloomLevel: number; difficulty: 'easy' | 'medium' | 'hard'; concept: string } {

  const text = questionText.toLowerCase();

  // Bloom level keywords
  const bloomKeywords = {
    1: ['what is', 'who', 'when', 'where', 'define', 'list', 'name', 'identify', 'recall'],
    2: ['explain', 'describe', 'summarize', 'compare', 'contrast', 'why', 'how'],
    3: ['apply', 'calculate', 'solve', 'use', 'demonstrate', 'compute', 'implement'],
  };

  let bloomLevel = 2; // Default
  let maxMatches = 0;

  for (const [level, keywords] of Object.entries(bloomKeywords)) {
    const matches = keywords.filter(kw => text.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bloomLevel = parseInt(level);
    }
  }

  // Difficulty based on length and bloom level
  const wordCount = questionText.split(/\s+/).length;
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  if (wordCount < 15 && bloomLevel === 1) {
    difficulty = 'easy';
  } else if (wordCount > 30 || bloomLevel === 3) {
    difficulty = 'hard';
  }

  return {
    bloomLevel,
    difficulty,
    concept: 'General'
  };
}

/**
 * Fallback extraction using pattern matching
 * This is used when AI extraction fails
 */
function fallbackExtraction(documentText: string): Question[] {
  console.log('📋 Using fallback pattern-based extraction...');

  const questions: Question[] = [];
  const text = documentText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split by question markers
  const questionPattern = /\s*Q(\d+)[.:\)]\s*/gi;
  const parts = text.split(questionPattern);

  for (let i = 1; i < parts.length; i += 2) {
    if (i + 1 >= parts.length) break;

    const questionContent = parts[i + 1].trim();
    let options: string[] = [];

    // Try different option patterns
    const patterns = [
      /\n\s*([A-D])\)\s*(.+?)(?=\n\s*[A-D]\)|$)/gis,  // A) format
      /\n\s*([1-4])\)\s*(.+?)(?=\n\s*[1-4]\)|$)/gis,  // 1) format
      /\(([A-D])\)\s*([^\(\n]+?)(?=\s*\([A-D]\)|$)/gis, // (A) format
      /\(([1-4])\)\s*([^\(\n]+?)(?=\s*\([1-4]\)|$)/gis, // (1) format
    ];

    let correctAnswerIndex = 0;
    for (const pattern of patterns) {
      const matches = Array.from(questionContent.matchAll(pattern));
      if (matches.length >= 4) {
        options = matches.slice(0, 4).map((m, idx) => {
          const optionText = m[2].trim();
          // Check if this option is marked as correct
          if (optionText.includes('[CORRECT]') || optionText.includes('(CORRECT)')) {
            correctAnswerIndex = idx; // Use the map index parameter
            return optionText.replace(/\s*\[CORRECT\]\s*/gi, '').replace(/\s*\(CORRECT\)\s*/gi, '').trim();
          }
          return optionText;
        });
        break;
      }
    }

    // Extract question text (before first option)
    const firstOptionIndex = questionContent.search(/\n\s*[A-D1-4][\)]/);
    const questionText = firstOptionIndex > 0
      ? questionContent.substring(0, firstOptionIndex).trim()
      : questionContent.split('\n')[0].trim();

    // Only add if valid
    if (questionText.length >= 5 && options.length === 4) {
      const classification = classifyQuestionWithKeywords(questionText);
      const finalCorrectAnswer = options[correctAnswerIndex] || options[0];

      console.log(`📋 Fallback Q${questions.length + 1}: Correct index = ${correctAnswerIndex}, Answer = "${finalCorrectAnswer}"`);

      questions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: questionText,
        options: options,
        correctAnswer: finalCorrectAnswer,
        bloomLevel: Math.min(classification.bloomLevel, 3) as 1 | 2 | 3,
        difficulty: classification.difficulty,
        concept: 'General',
        timeEstimate: 60,
      });
    }
  }

  console.log(`📊 Fallback extraction found ${questions.length} questions`);
  return questions;
}

/**
 * Check if Hugging Face API is available and working
 */
export async function checkHuggingFaceAvailability(): Promise<boolean> {
  try {
    const hf = getHfClient();
    await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: 'Test',
      parameters: { max_new_tokens: 5 }
    });
    return true;
  } catch (error) {
    console.warn('Hugging Face API not available:', error);
    return false;
  }
}
