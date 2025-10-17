// Adaptive Testing Service
// Handles dynamic question selection based on student performance

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

interface QuestionAttempt {
  questionId: string;
  isCorrect: boolean;
  timeTaken: number; // in seconds
  bloomLevel: number;
  difficulty: string;
}

interface QuestionPool {
  easy: Question[];
  medium: Question[];
  hard: Question[];
}

interface AdaptiveState {
  currentDifficulty: 'easy' | 'medium' | 'hard';
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  averageResponseTime: number;
  performanceScore: number; // 0-100
}

export class AdaptiveTestingEngine {
  private questionPool: QuestionPool;
  private usedQuestionIds: Set<string>;
  private attemptHistory: QuestionAttempt[];
  private state: AdaptiveState;
  private reviewQueue: Set<string>;

  constructor(allQuestions: Question[]) {
    // Organize questions by difficulty
    this.questionPool = {
      easy: allQuestions.filter(q => q.difficulty === 'easy' || q.bloomLevel === 1),
      medium: allQuestions.filter(q => q.difficulty === 'medium' || q.bloomLevel === 2),
      hard: allQuestions.filter(q => q.difficulty === 'hard' || q.bloomLevel === 3),
    };

    // Initialize state
    this.usedQuestionIds = new Set();
    this.attemptHistory = [];
    this.reviewQueue = new Set();
    this.state = {
      currentDifficulty: 'easy',
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      averageResponseTime: 0,
      performanceScore: 50, // Start at medium
    };
  }

  /**
   * Get the first question - always starts with easy
   */
  getFirstQuestion(): Question | null {
    const easyQuestions = this.questionPool.easy.filter(q => !this.usedQuestionIds.has(q.id));

    if (easyQuestions.length === 0) {
      // Fallback to medium if no easy questions available
      return this.getRandomQuestion('medium');
    }

    const question = easyQuestions[0];
    this.usedQuestionIds.add(question.id);
    return question;
  }

  /**
   * Record a student's response and get the next question
   */
  recordResponseAndGetNext(
    questionId: string,
    selectedAnswer: string,
    correctAnswer: string,
    timeTaken: number,
    bloomLevel: number,
    difficulty: string
  ): Question | null {
    const isCorrect = selectedAnswer === correctAnswer;

    // Record the attempt
    const attempt: QuestionAttempt = {
      questionId,
      isCorrect,
      timeTaken,
      bloomLevel,
      difficulty,
    };
    this.attemptHistory.push(attempt);

    // Update state based on performance
    this.updateState(attempt);

    // Determine next difficulty
    const nextDifficulty = this.determineNextDifficulty(attempt);

    // Get next question
    return this.getRandomQuestion(nextDifficulty);
  }

  /**
   * Mark a question for review
   */
  markForReview(questionId: string): void {
    this.reviewQueue.add(questionId);
  }

  /**
   * Get review queue
   */
  getReviewQueue(): string[] {
    return Array.from(this.reviewQueue);
  }

  /**
   * Remove from review queue
   */
  removeFromReview(questionId: string): void {
    this.reviewQueue.delete(questionId);
  }

  /**
   * Update adaptive state based on performance
   */
  private updateState(attempt: QuestionAttempt): void {
    const { isCorrect, timeTaken, bloomLevel } = attempt;

    // Update consecutive counters
    if (isCorrect) {
      this.state.consecutiveCorrect++;
      this.state.consecutiveIncorrect = 0;
    } else {
      this.state.consecutiveIncorrect++;
      this.state.consecutiveCorrect = 0;
    }

    // Update average response time
    const totalAttempts = this.attemptHistory.length;
    const totalTime = this.attemptHistory.reduce((sum, a) => sum + a.timeTaken, 0);
    this.state.averageResponseTime = totalTime / totalAttempts;

    // Update performance score (0-100)
    const correctCount = this.attemptHistory.filter(a => a.isCorrect).length;
    const accuracy = (correctCount / totalAttempts) * 100;

    // Factor in time efficiency (compare against expected time)
    const expectedTime = 60; // seconds per question baseline
    const timeEfficiency = Math.max(0, Math.min(100, (expectedTime / timeTaken) * 100));

    // Weighted score: 70% accuracy, 30% time efficiency
    this.state.performanceScore = (accuracy * 0.7) + (timeEfficiency * 0.3);
  }

  /**
   * Determine next question difficulty based on adaptive algorithm
   */
  private determineNextDifficulty(lastAttempt: QuestionAttempt): 'easy' | 'medium' | 'hard' {
    const { isCorrect, timeTaken, bloomLevel } = lastAttempt;
    const expectedTime = 60; // baseline seconds per question

    // Fast and correct → Increase difficulty
    if (isCorrect && timeTaken < expectedTime * 0.7) {
      if (this.state.consecutiveCorrect >= 2) {
        return this.increaseDifficulty(this.state.currentDifficulty);
      }
      return this.state.currentDifficulty;
    }

    // Correct but slow → Stay at same difficulty
    if (isCorrect && timeTaken >= expectedTime * 0.7) {
      return this.state.currentDifficulty;
    }

    // Incorrect → Decrease difficulty
    if (!isCorrect) {
      if (this.state.consecutiveIncorrect >= 2) {
        return this.decreaseDifficulty(this.state.currentDifficulty);
      }
      return this.state.currentDifficulty;
    }

    return this.state.currentDifficulty;
  }

  /**
   * Increase difficulty level
   */
  private increaseDifficulty(current: 'easy' | 'medium' | 'hard'): 'easy' | 'medium' | 'hard' {
    if (current === 'easy') return 'medium';
    if (current === 'medium') return 'hard';
    return 'hard'; // Already at max
  }

  /**
   * Decrease difficulty level
   */
  private decreaseDifficulty(current: 'easy' | 'medium' | 'hard'): 'easy' | 'medium' | 'hard' {
    if (current === 'hard') return 'medium';
    if (current === 'medium') return 'easy';
    return 'easy'; // Already at min
  }

  /**
   * Get a random unused question from the specified difficulty pool
   */
  private getRandomQuestion(difficulty: 'easy' | 'medium' | 'hard'): Question | null {
    const pool = this.questionPool[difficulty];
    const availableQuestions = pool.filter(q => !this.usedQuestionIds.has(q.id));

    if (availableQuestions.length === 0) {
      // Try adjacent difficulty levels if current pool is exhausted
      if (difficulty === 'medium') {
        const easyQuestion = this.getRandomQuestion('easy');
        if (easyQuestion) return easyQuestion;
        return this.getRandomQuestion('hard');
      } else if (difficulty === 'easy') {
        return this.getRandomQuestion('medium');
      } else {
        return this.getRandomQuestion('medium');
      }
    }

    // Select random question from available pool
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const question = availableQuestions[randomIndex];

    this.usedQuestionIds.add(question.id);
    this.state.currentDifficulty = difficulty;

    return question;
  }

  /**
   * Check if test is complete
   */
  isTestComplete(maxQuestions: number): boolean {
    return this.attemptHistory.length >= maxQuestions;
  }

  /**
   * Get test statistics
   */
  getStatistics() {
    const totalAttempts = this.attemptHistory.length;
    const correctCount = this.attemptHistory.filter(a => a.isCorrect).length;
    const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

    // Calculate Bloom level distribution
    const bloomDistribution = {
      1: this.attemptHistory.filter(a => a.bloomLevel === 1).length,
      2: this.attemptHistory.filter(a => a.bloomLevel === 2).length,
      3: this.attemptHistory.filter(a => a.bloomLevel === 3).length,
    };

    // Calculate difficulty distribution
    const difficultyDistribution = {
      easy: this.attemptHistory.filter(a => a.difficulty === 'easy').length,
      medium: this.attemptHistory.filter(a => a.difficulty === 'medium').length,
      hard: this.attemptHistory.filter(a => a.difficulty === 'hard').length,
    };

    return {
      totalQuestions: totalAttempts,
      correctAnswers: correctCount,
      incorrectAnswers: totalAttempts - correctCount,
      accuracy: Math.round(accuracy),
      averageTime: Math.round(this.state.averageResponseTime),
      performanceScore: Math.round(this.state.performanceScore),
      bloomDistribution,
      difficultyDistribution,
      reviewQueueSize: this.reviewQueue.size,
    };
  }

  /**
   * Get attempt history
   */
  getAttemptHistory(): QuestionAttempt[] {
    return [...this.attemptHistory];
  }

  /**
   * Get current state
   */
  getCurrentState(): AdaptiveState {
    return { ...this.state };
  }
}
