// AI Service for Question Classification using Hugging Face
// This service analyzes questions and classifies Bloom's Taxonomy levels and difficulty

interface BloomClassificationResult {
  bloomLevel: number;
  bloomLevelName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  confidence: number;
}

// Bloom's Taxonomy mapping
const BLOOM_LEVELS = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create'
};

// Keywords for Bloom level detection
const BLOOM_KEYWORDS = {
  1: ['define', 'list', 'recall', 'name', 'identify', 'state', 'describe', 'what is', 'who', 'when', 'where'],
  2: ['explain', 'describe', 'summarize', 'interpret', 'compare', 'contrast', 'classify', 'discuss', 'why'],
  3: ['apply', 'use', 'demonstrate', 'solve', 'implement', 'calculate', 'compute', 'show how', 'illustrate'],
  4: ['analyze', 'examine', 'investigate', 'categorize', 'differentiate', 'distinguish', 'compare and contrast'],
  5: ['evaluate', 'assess', 'judge', 'critique', 'justify', 'argue', 'defend', 'support', 'recommend'],
  6: ['create', 'design', 'develop', 'construct', 'formulate', 'devise', 'compose', 'invent', 'plan']
};

// Difficulty keywords
const DIFFICULTY_KEYWORDS = {
  easy: ['basic', 'simple', 'fundamental', 'elementary', 'straightforward'],
  medium: ['moderate', 'intermediate', 'standard'],
  hard: ['complex', 'advanced', 'difficult', 'challenging', 'sophisticated']
};

/**
 * Analyzes a question using keyword matching and text complexity
 * This is a fallback when Hugging Face API is unavailable or for faster processing
 */
function analyzeQuestionLocally(
  questionText: string,
  subject: string,
  assessmentDescription: string
): BloomClassificationResult {
  const text = questionText.toLowerCase();

  // Detect Bloom level based on keywords
  let bloomLevel = 2; // Default to "Understand"
  let maxMatches = 0;

  for (let level = 6; level >= 1; level--) {
    const keywords = BLOOM_KEYWORDS[level as keyof typeof BLOOM_KEYWORDS];
    const matches = keywords.filter(keyword => text.includes(keyword)).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bloomLevel = level;
    }
  }

  // Detect difficulty based on multiple factors
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  // Factor 1: Question length and complexity
  const wordCount = questionText.split(/\s+/).length;
  const hasMultipleClauses = (questionText.match(/[,;]/g) || []).length > 2;

  // Factor 2: Keyword matching
  let difficultyScore = 0;
  for (const keyword of DIFFICULTY_KEYWORDS.hard) {
    if (text.includes(keyword)) difficultyScore += 2;
  }
  for (const keyword of DIFFICULTY_KEYWORDS.easy) {
    if (text.includes(keyword)) difficultyScore -= 1;
  }

  // Factor 3: Bloom level (higher levels tend to be harder)
  difficultyScore += bloomLevel - 2;

  // Determine final difficulty
  if (wordCount > 30 || hasMultipleClauses || difficultyScore > 3) {
    difficulty = 'hard';
  } else if (wordCount < 15 && bloomLevel <= 2 && difficultyScore < 0) {
    difficulty = 'easy';
  }

  return {
    bloomLevel,
    bloomLevelName: BLOOM_LEVELS[bloomLevel as keyof typeof BLOOM_LEVELS],
    difficulty,
    confidence: maxMatches > 0 ? 0.7 : 0.5 // Lower confidence if no keywords matched
  };
}

/**
 * Analyzes a question using Hugging Face API for more accurate classification
 * Falls back to local analysis if API is unavailable
 */
export async function classifyQuestion(
  questionText: string,
  subject: string = '',
  assessmentDescription: string = ''
): Promise<BloomClassificationResult> {

  // Build context for better classification
  const context = `Subject: ${subject}. ${assessmentDescription}`;
  const fullText = context ? `${context}\n\nQuestion: ${questionText}` : questionText;

  try {
    // Try Hugging Face API first (using zero-shot classification)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-mnli',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: For production, use environment variable for API key
          // 'Authorization': `Bearer ${process.env.REACT_APP_HUGGINGFACE_API_KEY}`
        },
        body: JSON.stringify({
          inputs: fullText,
          parameters: {
            candidate_labels: [
              'remembering basic facts',
              'understanding concepts',
              'applying knowledge',
              'analyzing information',
              'evaluating and judging',
              'creating new ideas'
            ]
          }
        })
      }
    );

    if (response.ok) {
      const result = await response.json();

      // Map the result to Bloom level
      const labels = result.labels || [];
      const scores = result.scores || [];

      if (labels.length > 0 && scores.length > 0) {
        const topLabel = labels[0];
        let bloomLevel = 2; // Default

        if (topLabel.includes('remembering')) bloomLevel = 1;
        else if (topLabel.includes('understanding')) bloomLevel = 2;
        else if (topLabel.includes('applying')) bloomLevel = 3;
        else if (topLabel.includes('analyzing')) bloomLevel = 4;
        else if (topLabel.includes('evaluating')) bloomLevel = 5;
        else if (topLabel.includes('creating')) bloomLevel = 6;

        // Determine difficulty based on Bloom level and confidence
        let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
        if (bloomLevel <= 2 && scores[0] > 0.7) {
          difficulty = 'easy';
        } else if (bloomLevel >= 5) {
          difficulty = 'hard';
        }

        return {
          bloomLevel,
          bloomLevelName: BLOOM_LEVELS[bloomLevel as keyof typeof BLOOM_LEVELS],
          difficulty,
          confidence: scores[0]
        };
      }
    }
  } catch (error) {
    console.log('Hugging Face API unavailable, using local analysis:', error);
  }

  // Fallback to local analysis
  return analyzeQuestionLocally(questionText, subject, assessmentDescription);
}

/**
 * Batch classify multiple questions
 * Processes questions with a small delay to avoid rate limiting
 */
export async function classifyQuestionsBatch(
  questions: Array<{ text: string; options: string[] }>,
  subject: string = '',
  assessmentDescription: string = ''
): Promise<BloomClassificationResult[]> {
  const results: BloomClassificationResult[] = [];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    try {
      const result = await classifyQuestion(question.text, subject, assessmentDescription);
      results.push(result);

      // Add small delay between requests to avoid rate limiting
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Error classifying question ${i + 1}:`, error);
      // Use local analysis as fallback
      results.push(analyzeQuestionLocally(question.text, subject, assessmentDescription));
    }
  }

  return results;
}

/**
 * Analyzes the entire assessment and provides insights
 */
export function analyzeAssessment(bloomLevels: number[]): {
  distribution: { [key: string]: number };
  averageLevel: number;
  recommendation: string;
} {
  const distribution: { [key: string]: number } = {
    'Remember': 0,
    'Understand': 0,
    'Apply': 0,
    'Analyze': 0,
    'Evaluate': 0,
    'Create': 0
  };

  bloomLevels.forEach(level => {
    const levelName = BLOOM_LEVELS[level as keyof typeof BLOOM_LEVELS];
    distribution[levelName]++;
  });

  const averageLevel = bloomLevels.reduce((a, b) => a + b, 0) / bloomLevels.length;

  let recommendation = '';
  if (averageLevel < 2.5) {
    recommendation = 'This assessment focuses on lower-order thinking skills. Consider adding questions that require application, analysis, or evaluation.';
  } else if (averageLevel > 4.5) {
    recommendation = 'This assessment is quite challenging with higher-order thinking questions. Ensure students have foundational knowledge first.';
  } else {
    recommendation = 'This assessment has a good balance of cognitive levels across Bloom\'s Taxonomy.';
  }

  return { distribution, averageLevel, recommendation };
}
