export interface User {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  avatar?: string;
}

export interface Classroom {
  id: string;
  name: string;
  subject: string;
  description: string;
  code: string;
  teacherId: string;
  studentCount: number;
  createdAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  type: 'PDF' | 'text' | 'link' | 'code' | 'quiz';
  classroomId: string;
  teacherId: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  fileUrl?: string;
  submittedAt: string;
  status: 'pending' | 'completed';
  score?: number;
  feedback?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  assignmentsCompleted: number;
  averageScore: number;
}

export interface DashboardStats {
  totalClassrooms: number;
  totalStudents: number;
  totalAssignments: number;
  averagePerformance: number;
}

export interface PerformanceData {
  date: string;
  score: number;
  assignments: number;
}

// New Assessment-specific types
export interface Assessment {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  publishedAt: string | null;
  status: 'draft' | 'published' | 'closed';
  duration: number;
  questions: Question[];
  classroomId: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  bloomLevel: 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  concept: string;
  timeEstimate: number;
}

export interface Session {
  id: string;
  studentId: string;
  assessmentId: string;
  classroomId: string;
  startedAt: string;
  submittedAt: string | null;
  status: 'in_progress' | 'submitted';
  currentDifficultyTier: 'easy' | 'medium' | 'hard';
  currentBloomLevel: 1 | 2 | 3;
  questionsServed: string[];
  questionsAnswered: string[];
  markedForReview: string[];
  totalTimeSpent: number;
}

export interface Response {
  id: string;
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeSpent: number;
  markedForReview: boolean;
  timestamp: string;
  selectionReason: string;
}

export interface StudentAnalytics {
  studentId: string;
  assessmentId: string;
  classroomId: string;
  score: number;
  totalQuestions: number;
  questionsAttempted: number;
  correctAnswers: number;
  bloomBreakdown: {
    [key: number]: {
      attempted: number;
      correct: number;
      percentage: number;
    };
  };
  difficultyBreakdown: {
    easy: { attempted: number; correct: number };
    medium: { attempted: number; correct: number };
    hard: { attempted: number; correct: number };
  };
  avgTimePerQuestion: number;
  timePerQuestion: Record<string, number>;
  flaggedConcepts: string[];
  aiInsights: string;
  generatedAt: string;
}

export interface ClassAnalytics {
  classroomId: string;
  assessmentId: string;
  totalStudents: number;
  completedStudents: number;
  avgScore: number;
  distribution: {
    '90-100': number;
    '80-89': number;
    '70-79': number;
    'below70': number;
  };
  conceptMastery: Record<string, number>;
  avgTimeSpent: number;
  aiSummary: string;
  generatedAt: string;
}
