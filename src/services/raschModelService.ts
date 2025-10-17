// Rasch Model (1-Parameter IRT) Implementation
// Uses Bloom's Taxonomy + Difficulty as single difficulty parameter (b)

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

interface ItemParameters {
  questionId: string;
  b: number; // Item difficulty parameter
  bloomLevel: number;
  difficulty: string;
}

interface StudentResponse {
  questionId: string;
  isCorrect: boolean;
  timeTaken: number;
  itemDifficulty: number;
}

/**
 * Map Bloom Level + Difficulty to difficulty parameter (b)
 *
 * Rasch Model: Lower b = easier, Higher b = harder
 *
 * Scale: -2.0 (easiest) to +2.0 (hardest)
 */
export function calculateItemDifficulty(bloomLevel: number, difficulty: string): number {
  // Base difficulty from Bloom level
  const bloomBase = {
    1: -1.5,  // Remember (easiest)
    2: 0.0,   // Understand (neutral)
    3: 1.5,   // Apply (hardest)
  };

  // Adjustment from difficulty rating
  const difficultyAdjust = {
    'easy': -0.5,
    'medium': 0.0,
    'hard': 0.5,
  };

  const base = bloomBase[bloomLevel as 1 | 2 | 3] || 0;
  const adjust = difficultyAdjust[difficulty as 'easy' | 'medium' | 'hard'] || 0;

  return base + adjust;
}

/**
 * Rasch Model: Probability of correct response
 *
 * P(θ, b) = e^(θ - b) / (1 + e^(θ - b))
 *
 * Where:
 * - θ (theta) = student ability
 * - b = item difficulty
 */
export function raschProbability(theta: number, b: number): number {
  const exponent = theta - b;
  return Math.exp(exponent) / (1 + Math.exp(exponent));
}

/**
 * Calculate information function
 * I(θ) = P(θ) * (1 - P(θ))
 *
 * Maximum information occurs when P ≈ 0.5 (when θ ≈ b)
 */
export function itemInformation(theta: number, b: number): number {
  const p = raschProbability(theta, b);
  return p * (1 - p);
}

/**
 * Rasch-based Adaptive Testing Engine
 */
export class RaschAdaptiveEngine {
  private allQuestions: Question[];
  private itemParameters: Map<string, ItemParameters>;
  private usedQuestionIds: Set<string>;
  private responses: StudentResponse[];
  private theta: number; // Student ability estimate
  private learningRate: number;

  constructor(questions: Question[], learningRate: number = 0.4) {
    this.allQuestions = questions;
    this.usedQuestionIds = new Set();
    this.responses = [];
    this.theta = 0; // Start at average ability
    this.learningRate = learningRate;

    // Calculate difficulty parameters for all questions
    this.itemParameters = new Map();
    questions.forEach(q => {
      const b = calculateItemDifficulty(q.bloomLevel, q.difficulty);
      this.itemParameters.set(q.id, {
        questionId: q.id,
        b: b,
        bloomLevel: q.bloomLevel,
        difficulty: q.difficulty,
      });
    });
  }

  /**
   * Get first question - select one with b ≈ 0 (average difficulty)
   */
  getFirstQuestion(): Question | null {
    const availableQuestions = this.allQuestions.filter(q => !this.usedQuestionIds.has(q.id));

    if (availableQuestions.length === 0) return null;

    // Find question closest to θ = 0 (starting point)
    let bestQuestion = availableQuestions[0];
    let minDistance = Math.abs(this.itemParameters.get(bestQuestion.id)!.b - 0);

    for (const q of availableQuestions) {
      const params = this.itemParameters.get(q.id)!;
      const distance = Math.abs(params.b - 0);

      if (distance < minDistance) {
        minDistance = distance;
        bestQuestion = q;
      }
    }

    this.usedQuestionIds.add(bestQuestion.id);
    return bestQuestion;
  }

  /**
   * Update theta using Bayesian updating (simplified)
   *
   * θ_new = θ_old + α * (response - P(θ_old, b))
   *
   * Where:
   * - α = learning rate
   * - response = 1 (correct) or 0 (incorrect)
   * - P(θ_old, b) = expected probability of correct response
   */
  private updateTheta(isCorrect: boolean, itemDifficulty: number): void {
    const response = isCorrect ? 1 : 0;
    const expectedProbability = raschProbability(this.theta, itemDifficulty);

    // Bayesian update
    const error = response - expectedProbability;
    this.theta = this.theta + (this.learningRate * error);

    // Constrain theta to reasonable range [-3, 3]
    this.theta = Math.max(-3, Math.min(3, this.theta));
  }

  /**
   * Record response and update theta
   */
  recordResponse(
    questionId: string,
    isCorrect: boolean,
    timeTaken: number
  ): void {
    const params = this.itemParameters.get(questionId);
    if (!params) return;

    // Record response
    this.responses.push({
      questionId,
      isCorrect,
      timeTaken,
      itemDifficulty: params.b,
    });

    // Update theta using Bayesian updating
    this.updateTheta(isCorrect, params.b);
  }

  /**
   * Select next question using Maximum Information Criterion
   *
   * Select question with b closest to current θ
   * This maximizes information and efficiently estimates ability
   */
  getNextQuestion(): Question | null {
    const availableQuestions = this.allQuestions.filter(q => !this.usedQuestionIds.has(q.id));

    if (availableQuestions.length === 0) return null;

    // Find question that provides maximum information at current theta
    let bestQuestion = availableQuestions[0];
    let maxInformation = itemInformation(this.theta, this.itemParameters.get(bestQuestion.id)!.b);

    for (const q of availableQuestions) {
      const params = this.itemParameters.get(q.id)!;
      const info = itemInformation(this.theta, params.b);

      if (info > maxInformation) {
        maxInformation = info;
        bestQuestion = q;
      }
    }

    this.usedQuestionIds.add(bestQuestion.id);
    return bestQuestion;
  }

  /**
   * Get current theta estimate
   */
  getTheta(): number {
    return this.theta;
  }

  /**
   * Get theta with descriptive label
   */
  getThetaDescription(): string {
    if (this.theta < -1.5) return "Below Average";
    if (this.theta < -0.5) return "Slightly Below Average";
    if (this.theta < 0.5) return "Average";
    if (this.theta < 1.5) return "Above Average";
    return "Excellent";
  }

  /**
   * Calculate standard error of theta estimate
   * SE(θ) = 1 / sqrt(sum of information)
   */
  getStandardError(): number {
    if (this.responses.length === 0) return 999;

    const totalInformation = this.responses.reduce((sum, response) => {
      return sum + itemInformation(this.theta, response.itemDifficulty);
    }, 0);

    return totalInformation > 0 ? 1 / Math.sqrt(totalInformation) : 999;
  }

  /**
   * Check if theta has converged (SE < 0.3 is generally acceptable)
   */
  hasConverged(): boolean {
    return this.getStandardError() < 0.3;
  }

  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    const correctCount = this.responses.filter(r => r.isCorrect).length;
    const totalQuestions = this.responses.length;
    const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

    // Calculate difficulty distribution of attempted questions
    const difficultyDistribution = {
      easy: 0,
      medium: 0,
      hard: 0,
    };

    this.responses.forEach(r => {
      const params = this.itemParameters.get(r.questionId);
      if (params) {
        difficultyDistribution[params.difficulty as 'easy' | 'medium' | 'hard']++;
      }
    });

    // Calculate Bloom distribution
    const bloomDistribution = {
      1: 0,
      2: 0,
      3: 0,
    };

    this.responses.forEach(r => {
      const params = this.itemParameters.get(r.questionId);
      if (params) {
        bloomDistribution[params.bloomLevel as 1 | 2 | 3]++;
      }
    });

    // Calculate average time
    const totalTime = this.responses.reduce((sum, r) => sum + r.timeTaken, 0);
    const averageTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;

    return {
      totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: totalQuestions - correctCount,
      accuracy: Math.round(accuracy),
      theta: this.theta,
      thetaDescription: this.getThetaDescription(),
      standardError: this.getStandardError(),
      hasConverged: this.hasConverged(),
      averageTime: Math.round(averageTime),
      difficultyDistribution,
      bloomDistribution,
    };
  }

  /**
   * Get response history
   */
  getResponses(): StudentResponse[] {
    return [...this.responses];
  }

  /**
   * Get item parameters for a question
   */
  getItemParameters(questionId: string): ItemParameters | undefined {
    return this.itemParameters.get(questionId);
  }

  /**
   * Predict probability of success on a given question
   */
  predictSuccess(questionId: string): number {
    const params = this.itemParameters.get(questionId);
    if (!params) return 0.5;

    return raschProbability(this.theta, params.b);
  }
}
