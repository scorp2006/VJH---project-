// AI-Powered Analytics Service
// Generates personalized insights using Rasch Model + Hugging Face LLM

import { HfInference } from '@huggingface/inference';

// ===========================
// INTERFACES
// ===========================

export interface StudentSubmission {
  studentId: string;
  studentName: string;
  studentEmail: string;
  assessmentId: string;
  assessmentName: string;
  responses: ResponseData[];
  raschData: RaschAnalysisData;
  submittedAt: Date;
  timeTaken: number; // total seconds
}

export interface ResponseData {
  questionId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeTaken: number; // seconds
  bloomLevel: 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
  theta: number; // theta at time of this question
}

export interface RaschAnalysisData {
  finalTheta: number;
  thetaProgression: number[]; // theta after each question
  standardError: number;
  abilityLevel: string; // "Below Average", "Average", "Above Average", "Advanced"
  convergence: number; // 0-100, how stable the estimate is
}

export interface StudentInsights {
  // Performance Summary
  overallAccuracy: number;
  totalQuestions: number;
  correctAnswers: number;
  averageTime: number;

  // Rasch Analysis
  raschAnalysis: RaschAnalysisData;

  // Breakdown by Category
  accuracyByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  accuracyByBloomLevel: {
    level1: number;
    level2: number;
    level3: number;
  };
  accuracyByConcept: Map<string, number>;

  // Time Analysis
  timeByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };

  // AI-Generated Insights
  aiInsights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    studyPlan: string[];
    motivationalMessage: string;
  };

  // Predictions
  predictedNextPerformance: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface ClassroomInsights {
  classroomId: string;
  classroomName: string;
  assessmentId: string;
  assessmentName: string;

  // Class Statistics
  totalStudents: number;
  averageTheta: number;
  thetaDistribution: {
    belowAverage: number; // θ < -0.5
    average: number; // -0.5 <= θ <= 0.5
    aboveAverage: number; // 0.5 < θ <= 1.5
    advanced: number; // θ > 1.5
  };
  averageAccuracy: number;
  averageTime: number;

  // Risk Analysis
  atRiskStudents: Array<{
    studentId: string;
    studentName: string;
    theta: number;
    accuracy: number;
    riskFactors: string[];
  }>;

  // Question Analysis
  questionQuality: Array<{
    questionId: string;
    questionText: string;
    difficulty: number; // Rasch b parameter
    discrimination: number; // how well it separates students
    averageAccuracy: number;
    recommendation: string;
  }>;

  // AI-Generated Teaching Insights
  aiInsights: {
    classStrengths: string[];
    classWeaknesses: string[];
    teachingRecommendations: string[];
    interventionNeeded: string[];
    topPerformers: string[];
  };
}

// ===========================
// HUGGING FACE CLIENT
// ===========================

let hfClient: HfInference | null = null;

function getHfClient(): HfInference {
  if (!hfClient) {
    const apiKey = process.env.REACT_APP_HUGGINGFACE_API_KEY;
    hfClient = new HfInference(apiKey);
  }
  return hfClient;
}

// ===========================
// RASCH MODEL ANALYSIS
// ===========================

/**
 * Calculate ability level classification from theta
 */
function classifyAbilityLevel(theta: number): string {
  if (theta < -1.0) return 'Below Average';
  if (theta < 0.0) return 'Average (Lower)';
  if (theta < 1.0) return 'Average (Higher)';
  if (theta < 2.0) return 'Above Average';
  return 'Advanced';
}

/**
 * Calculate convergence metric (0-100)
 * Higher = more stable/reliable estimate
 */
function calculateConvergence(thetaProgression: number[]): number {
  if (thetaProgression.length < 3) return 30;

  // Calculate variance in last 5 theta values
  const last5 = thetaProgression.slice(-5);
  const mean = last5.reduce((sum, t) => sum + t, 0) / last5.length;
  const variance = last5.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / last5.length;

  // Low variance = high convergence
  const convergence = Math.max(0, Math.min(100, 100 - (variance * 100)));
  return Math.round(convergence);
}

// ===========================
// STUDENT INSIGHTS GENERATION
// ===========================

/**
 * Generate comprehensive insights for a single student submission
 */
export async function generateStudentInsights(
  submission: StudentSubmission
): Promise<StudentInsights> {

  console.log(`📊 Generating insights for ${submission.studentName}...`);

  // Calculate basic metrics
  const totalQuestions = submission.responses.length;
  const correctAnswers = submission.responses.filter(r => r.isCorrect).length;
  const overallAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const averageTime = submission.responses.reduce((sum, r) => sum + r.timeTaken, 0) / totalQuestions;

  // Accuracy by difficulty
  const easyQuestions = submission.responses.filter(r => r.difficulty === 'easy');
  const mediumQuestions = submission.responses.filter(r => r.difficulty === 'medium');
  const hardQuestions = submission.responses.filter(r => r.difficulty === 'hard');

  const accuracyByDifficulty = {
    easy: easyQuestions.length > 0
      ? (easyQuestions.filter(r => r.isCorrect).length / easyQuestions.length) * 100
      : 0,
    medium: mediumQuestions.length > 0
      ? (mediumQuestions.filter(r => r.isCorrect).length / mediumQuestions.length) * 100
      : 0,
    hard: hardQuestions.length > 0
      ? (hardQuestions.filter(r => r.isCorrect).length / hardQuestions.length) * 100
      : 0,
  };

  // Accuracy by Bloom level
  const bloom1 = submission.responses.filter(r => r.bloomLevel === 1);
  const bloom2 = submission.responses.filter(r => r.bloomLevel === 2);
  const bloom3 = submission.responses.filter(r => r.bloomLevel === 3);

  const accuracyByBloomLevel = {
    level1: bloom1.length > 0 ? (bloom1.filter(r => r.isCorrect).length / bloom1.length) * 100 : 0,
    level2: bloom2.length > 0 ? (bloom2.filter(r => r.isCorrect).length / bloom2.length) * 100 : 0,
    level3: bloom3.length > 0 ? (bloom3.filter(r => r.isCorrect).length / bloom3.length) * 100 : 0,
  };

  // Accuracy by concept
  const conceptMap = new Map<string, { correct: number; total: number }>();
  submission.responses.forEach(r => {
    const existing = conceptMap.get(r.concept) || { correct: 0, total: 0 };
    conceptMap.set(r.concept, {
      correct: existing.correct + (r.isCorrect ? 1 : 0),
      total: existing.total + 1,
    });
  });

  const accuracyByConcept = new Map<string, number>();
  conceptMap.forEach((value, key) => {
    accuracyByConcept.set(key, (value.correct / value.total) * 100);
  });

  // Time by difficulty
  const timeByDifficulty = {
    easy: easyQuestions.length > 0
      ? easyQuestions.reduce((sum, r) => sum + r.timeTaken, 0) / easyQuestions.length
      : 0,
    medium: mediumQuestions.length > 0
      ? mediumQuestions.reduce((sum, r) => sum + r.timeTaken, 0) / mediumQuestions.length
      : 0,
    hard: hardQuestions.length > 0
      ? hardQuestions.reduce((sum, r) => sum + r.timeTaken, 0) / hardQuestions.length
      : 0,
  };

  // Rasch analysis
  const raschAnalysis = {
    ...submission.raschData,
    abilityLevel: classifyAbilityLevel(submission.raschData.finalTheta),
    convergence: calculateConvergence(submission.raschData.thetaProgression),
  };

  // Predict next performance based on theta trend
  const thetaTrend = submission.raschData.thetaProgression;
  const predictedNextPerformance = Math.max(0, Math.min(100,
    50 + (submission.raschData.finalTheta * 15) // Rough conversion
  ));

  // Risk assessment
  const riskLevel = submission.raschData.finalTheta < -1.0 ? 'high'
    : submission.raschData.finalTheta < 0 ? 'medium'
    : 'low';

  // Generate AI insights
  const aiInsights = await generateAIInsightsForStudent({
    studentName: submission.studentName,
    theta: submission.raschData.finalTheta,
    accuracy: overallAccuracy,
    averageTime,
    accuracyByDifficulty,
    accuracyByBloomLevel,
    timeByDifficulty,
    thetaProgression: thetaTrend,
  });

  return {
    overallAccuracy: Math.round(overallAccuracy),
    totalQuestions,
    correctAnswers,
    averageTime: Math.round(averageTime),
    raschAnalysis,
    accuracyByDifficulty: {
      easy: Math.round(accuracyByDifficulty.easy),
      medium: Math.round(accuracyByDifficulty.medium),
      hard: Math.round(accuracyByDifficulty.hard),
    },
    accuracyByBloomLevel: {
      level1: Math.round(accuracyByBloomLevel.level1),
      level2: Math.round(accuracyByBloomLevel.level2),
      level3: Math.round(accuracyByBloomLevel.level3),
    },
    accuracyByConcept,
    timeByDifficulty: {
      easy: Math.round(timeByDifficulty.easy),
      medium: Math.round(timeByDifficulty.medium),
      hard: Math.round(timeByDifficulty.hard),
    },
    aiInsights,
    predictedNextPerformance: Math.round(predictedNextPerformance),
    riskLevel,
  };
}

// ===========================
// AI INSIGHT GENERATION
// ===========================

/**
 * Generate personalized AI insights for a student
 */
async function generateAIInsightsForStudent(data: {
  studentName: string;
  theta: number;
  accuracy: number;
  averageTime: number;
  accuracyByDifficulty: { easy: number; medium: number; hard: number };
  accuracyByBloomLevel: { level1: number; level2: number; level3: number };
  timeByDifficulty: { easy: number; medium: number; hard: number };
  thetaProgression: number[];
}): Promise<{
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  studyPlan: string[];
  motivationalMessage: string;
}> {

  try {
    const hf = getHfClient();

    const prompt = `You are an expert educational psychologist analyzing a student's adaptive test performance. Provide personalized, actionable insights.

Student Performance Data:
- Final Ability Level (θ): ${data.theta.toFixed(2)} (${classifyAbilityLevel(data.theta)})
- Overall Accuracy: ${data.accuracy.toFixed(1)}%
- Average Time per Question: ${data.averageTime.toFixed(0)} seconds

Accuracy by Difficulty:
- Easy: ${data.accuracyByDifficulty.easy.toFixed(0)}%
- Medium: ${data.accuracyByDifficulty.medium.toFixed(0)}%
- Hard: ${data.accuracyByDifficulty.hard.toFixed(0)}%

Accuracy by Bloom's Taxonomy:
- Level 1 (Remember): ${data.accuracyByBloomLevel.level1.toFixed(0)}%
- Level 2 (Understand): ${data.accuracyByBloomLevel.level2.toFixed(0)}%
- Level 3 (Apply): ${data.accuracyByBloomLevel.level3.toFixed(0)}%

Time by Difficulty:
- Easy: ${data.timeByDifficulty.easy.toFixed(0)}s
- Medium: ${data.timeByDifficulty.medium.toFixed(0)}s
- Hard: ${data.timeByDifficulty.hard.toFixed(0)}s

Provide a JSON response with:
{
  "strengths": ["2-3 specific strengths"],
  "weaknesses": ["2-3 specific areas for improvement"],
  "recommendations": ["3-4 actionable study recommendations"],
  "studyPlan": ["3-4 specific topics/skills to focus on"],
  "motivationalMessage": "One encouraging, personalized message (2-3 sentences)"
}

Keep insights positive, specific, and actionable. Focus on growth mindset.`;

    console.log('🤖 Calling AI for student insights...');

    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        return_full_text: false,
      }
    });

    const generatedText = response.generated_text;
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('✅ AI insights generated successfully');
      return parsed;
    }

  } catch (error) {
    console.warn('⚠️ AI insight generation failed, using rule-based fallback');
  }

  // Fallback to rule-based insights
  return generateRuleBasedInsights(data);
}

/**
 * Rule-based fallback insights
 */
function generateRuleBasedInsights(data: {
  theta: number;
  accuracy: number;
  accuracyByDifficulty: { easy: number; medium: number; hard: number };
  accuracyByBloomLevel: { level1: number; level2: number; level3: number };
}): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  studyPlan: string[];
  motivationalMessage: string;
} {

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const studyPlan: string[] = [];

  // Identify strengths
  if (data.accuracyByDifficulty.hard > 70) {
    strengths.push('Excellent performance on challenging questions');
  }
  if (data.accuracyByBloomLevel.level3 > 70) {
    strengths.push('Strong application skills (Bloom Level 3)');
  }
  if (data.theta > 1.0) {
    strengths.push('Above-average problem-solving ability');
  }
  if (strengths.length === 0) {
    strengths.push('Shows engagement with the material');
  }

  // Identify weaknesses
  if (data.accuracyByDifficulty.easy < 60) {
    weaknesses.push('Needs improvement on foundational concepts');
  }
  if (data.accuracyByBloomLevel.level1 < 60) {
    weaknesses.push('Review basic recall and memorization');
  }
  if (data.accuracyByBloomLevel.level2 < 60) {
    weaknesses.push('Work on conceptual understanding');
  }
  if (weaknesses.length === 0) {
    weaknesses.push('Minor gaps in medium-difficulty topics');
  }

  // Recommendations
  if (data.theta < 0) {
    recommendations.push('Focus on mastering easier topics before advancing');
    recommendations.push('Practice fundamental concepts daily');
  } else {
    recommendations.push('Challenge yourself with harder practice problems');
    recommendations.push('Explore advanced applications of concepts');
  }
  recommendations.push('Review mistakes to identify patterns');
  recommendations.push('Practice time management on timed assessments');

  // Study plan
  if (data.accuracyByBloomLevel.level1 < 70) {
    studyPlan.push('Strengthen foundational knowledge through flashcards');
  }
  if (data.accuracyByBloomLevel.level2 < 70) {
    studyPlan.push('Focus on explaining concepts in your own words');
  }
  if (data.accuracyByBloomLevel.level3 < 70) {
    studyPlan.push('Practice applying concepts to real-world problems');
  }
  studyPlan.push('Set aside 30 minutes daily for targeted practice');

  const motivationalMessage = data.theta > 0
    ? 'Great work! Your strong performance shows dedication and understanding. Keep challenging yourself!'
    : 'You\'re making progress! Focus on building a solid foundation, and your skills will continue to grow.';

  return {
    strengths,
    weaknesses,
    recommendations,
    studyPlan,
    motivationalMessage,
  };
}

// ===========================
// CLASSROOM INSIGHTS
// ===========================

/**
 * Generate classroom-wide insights from multiple student submissions
 */
export async function generateClassroomInsights(
  classroomId: string,
  classroomName: string,
  assessmentId: string,
  assessmentName: string,
  submissions: StudentSubmission[]
): Promise<ClassroomInsights> {

  console.log(`📈 Generating classroom insights for ${classroomName}...`);

  const totalStudents = submissions.length;

  if (totalStudents === 0) {
    // Return empty insights
    return createEmptyClassroomInsights(classroomId, classroomName, assessmentId, assessmentName);
  }

  // Calculate average theta
  const averageTheta = submissions.reduce((sum, s) => sum + s.raschData.finalTheta, 0) / totalStudents;

  // Theta distribution
  const thetaDistribution = {
    belowAverage: submissions.filter(s => s.raschData.finalTheta < -0.5).length,
    average: submissions.filter(s => s.raschData.finalTheta >= -0.5 && s.raschData.finalTheta <= 0.5).length,
    aboveAverage: submissions.filter(s => s.raschData.finalTheta > 0.5 && s.raschData.finalTheta <= 1.5).length,
    advanced: submissions.filter(s => s.raschData.finalTheta > 1.5).length,
  };

  // Calculate average accuracy
  const averageAccuracy = submissions.reduce((sum, s) => {
    const correct = s.responses.filter(r => r.isCorrect).length;
    return sum + (correct / s.responses.length * 100);
  }, 0) / totalStudents;

  // Calculate average time
  const averageTime = submissions.reduce((sum, s) => {
    const avgTime = s.responses.reduce((t, r) => t + r.timeTaken, 0) / s.responses.length;
    return sum + avgTime;
  }, 0) / totalStudents;

  // Identify at-risk students
  const atRiskStudents = submissions
    .filter(s => s.raschData.finalTheta < -0.5)
    .map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      theta: s.raschData.finalTheta,
      accuracy: (s.responses.filter(r => r.isCorrect).length / s.responses.length) * 100,
      riskFactors: identifyRiskFactors(s),
    }))
    .sort((a, b) => a.theta - b.theta);

  // Generate AI teaching insights
  const aiInsights = await generateAIInsightsForClassroom({
    classroomName,
    totalStudents,
    averageTheta,
    averageAccuracy,
    thetaDistribution,
    atRiskCount: atRiskStudents.length,
  });

  return {
    classroomId,
    classroomName,
    assessmentId,
    assessmentName,
    totalStudents,
    averageTheta: parseFloat(averageTheta.toFixed(2)),
    thetaDistribution,
    averageAccuracy: Math.round(averageAccuracy),
    averageTime: Math.round(averageTime),
    atRiskStudents,
    questionQuality: [], // Will be populated separately
    aiInsights,
  };
}

function identifyRiskFactors(submission: StudentSubmission): string[] {
  const factors: string[] = [];

  const accuracy = (submission.responses.filter(r => r.isCorrect).length / submission.responses.length) * 100;

  if (accuracy < 50) factors.push('Low overall accuracy (<50%)');
  if (submission.raschData.finalTheta < -1.0) factors.push('Significantly below average ability');

  const easyQuestions = submission.responses.filter(r => r.difficulty === 'easy');
  const easyAccuracy = easyQuestions.length > 0
    ? (easyQuestions.filter(r => r.isCorrect).length / easyQuestions.length) * 100
    : 0;
  if (easyAccuracy < 60) factors.push('Struggles with foundational concepts');

  return factors;
}

async function generateAIInsightsForClassroom(data: {
  classroomName: string;
  totalStudents: number;
  averageTheta: number;
  averageAccuracy: number;
  thetaDistribution: { belowAverage: number; average: number; aboveAverage: number; advanced: number };
  atRiskCount: number;
}): Promise<{
  classStrengths: string[];
  classWeaknesses: string[];
  teachingRecommendations: string[];
  interventionNeeded: string[];
  topPerformers: string[];
}> {

  // Rule-based insights for now (can add AI later)
  const classStrengths: string[] = [];
  const classWeaknesses: string[] = [];
  const teachingRecommendations: string[] = [];
  const interventionNeeded: string[] = [];

  if (data.averageAccuracy > 75) {
    classStrengths.push('Strong overall class performance');
  }
  if (data.thetaDistribution.advanced > data.totalStudents * 0.2) {
    classStrengths.push('High number of advanced students');
  }

  if (data.atRiskCount > data.totalStudents * 0.3) {
    classWeaknesses.push('Significant number of struggling students');
    interventionNeeded.push(`${data.atRiskCount} students need immediate support`);
  }

  teachingRecommendations.push('Continue current teaching approach for strong performers');
  teachingRecommendations.push('Provide additional support for at-risk students');

  return {
    classStrengths,
    classWeaknesses,
    teachingRecommendations,
    interventionNeeded,
    topPerformers: [],
  };
}

function createEmptyClassroomInsights(
  classroomId: string,
  classroomName: string,
  assessmentId: string,
  assessmentName: string
): ClassroomInsights {
  return {
    classroomId,
    classroomName,
    assessmentId,
    assessmentName,
    totalStudents: 0,
    averageTheta: 0,
    thetaDistribution: { belowAverage: 0, average: 0, aboveAverage: 0, advanced: 0 },
    averageAccuracy: 0,
    averageTime: 0,
    atRiskStudents: [],
    questionQuality: [],
    aiInsights: {
      classStrengths: ['No submissions yet'],
      classWeaknesses: [],
      teachingRecommendations: ['Wait for student submissions'],
      interventionNeeded: [],
      topPerformers: [],
    },
  };
}
