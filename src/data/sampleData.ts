import { Classroom, Assignment, Submission, Student, User, DashboardStats, PerformanceData } from '../types';

export const currentUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: 'teacher',
  avatar: 'https://via.placeholder.com/40'
};

export const sampleStudents: Student[] = [
  {
    id: 's1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    joinedAt: '2024-01-15',
    assignmentsCompleted: 8,
    averageScore: 85
  },
  {
    id: 's2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    joinedAt: '2024-01-20',
    assignmentsCompleted: 6,
    averageScore: 78
  },
  {
    id: 's3',
    name: 'Carol Davis',
    email: 'carol@example.com',
    joinedAt: '2024-02-01',
    assignmentsCompleted: 7,
    averageScore: 92
  },
  {
    id: 's4',
    name: 'David Wilson',
    email: 'david@example.com',
    joinedAt: '2024-02-10',
    assignmentsCompleted: 5,
    averageScore: 88
  }
];

export const sampleClassrooms: Classroom[] = [
  {
    id: 'c1',
    name: 'Advanced Mathematics',
    subject: 'Mathematics',
    description: 'Advanced calculus and linear algebra concepts',
    code: 'MATH101',
    teacherId: '1',
    studentCount: 24,
    createdAt: '2024-01-10'
  },
  {
    id: 'c2',
    name: 'Computer Science Fundamentals',
    subject: 'Computer Science',
    description: 'Introduction to programming and algorithms',
    code: 'CS101',
    teacherId: '1',
    studentCount: 32,
    createdAt: '2024-01-15'
  },
  {
    id: 'c3',
    name: 'Physics Laboratory',
    subject: 'Physics',
    description: 'Hands-on physics experiments and analysis',
    code: 'PHY201',
    teacherId: '1',
    studentCount: 18,
    createdAt: '2024-02-01'
  }
];

export const sampleAssignments: Assignment[] = [
  {
    id: 'a1',
    title: 'Calculus Problem Set 1',
    description: 'Solve the following calculus problems and show your work',
    deadline: '2024-03-15',
    type: 'PDF',
    classroomId: 'c1',
    teacherId: '1',
    createdAt: '2024-03-01'
  },
  {
    id: 'a2',
    title: 'Programming Project - Calculator',
    description: 'Build a simple calculator using any programming language',
    deadline: '2024-03-20',
    type: 'code',
    classroomId: 'c2',
    teacherId: '1',
    createdAt: '2024-03-05'
  },
  {
    id: 'a3',
    title: 'Physics Lab Report',
    description: 'Write a detailed report on the pendulum experiment',
    deadline: '2024-03-18',
    type: 'text',
    classroomId: 'c3',
    teacherId: '1',
    createdAt: '2024-03-08'
  },
  {
    id: 'a4',
    title: 'Linear Algebra Quiz',
    description: 'Multiple choice quiz on matrix operations',
    deadline: '2024-03-12',
    type: 'quiz',
    classroomId: 'c1',
    teacherId: '1',
    createdAt: '2024-03-10'
  }
];

export const sampleSubmissions: Submission[] = [
  {
    id: 'sub1',
    assignmentId: 'a1',
    studentId: 's1',
    content: 'Completed calculus problems with detailed solutions',
    submittedAt: '2024-03-14',
    status: 'completed',
    score: 85,
    feedback: 'Good work! Minor calculation errors in problem 3.'
  },
  {
    id: 'sub2',
    assignmentId: 'a2',
    studentId: 's2',
    content: 'JavaScript calculator implementation',
    submittedAt: '2024-03-19',
    status: 'completed',
    score: 78,
    feedback: 'Working calculator but needs better error handling.'
  },
  {
    id: 'sub3',
    assignmentId: 'a3',
    studentId: 's3',
    content: 'Comprehensive lab report with data analysis',
    submittedAt: '2024-03-17',
    status: 'completed',
    score: 92,
    feedback: 'Excellent analysis and presentation of results.'
  },
  {
    id: 'sub4',
    assignmentId: 'a1',
    studentId: 's4',
    content: '',
    submittedAt: '',
    status: 'pending',
  }
];

export const teacherDashboardStats: DashboardStats = {
  totalClassrooms: 3,
  totalStudents: 74,
  totalAssignments: 12,
  averagePerformance: 86
};

export const studentDashboardStats: DashboardStats = {
  totalClassrooms: 2,
  totalStudents: 0, // Not applicable for student
  totalAssignments: 8,
  averagePerformance: 85
};

export const samplePerformanceData: PerformanceData[] = [
  { date: '2024-01-01', score: 78, assignments: 2 },
  { date: '2024-01-15', score: 82, assignments: 3 },
  { date: '2024-02-01', score: 85, assignments: 5 },
  { date: '2024-02-15', score: 88, assignments: 6 },
  { date: '2024-03-01', score: 85, assignments: 8 },
  { date: '2024-03-15', score: 90, assignments: 10 }
];

export const classroomPerformanceData: PerformanceData[] = [
  { date: '2024-01-01', score: 75, assignments: 15 },
  { date: '2024-01-15', score: 78, assignments: 18 },
  { date: '2024-02-01', score: 82, assignments: 22 },
  { date: '2024-02-15', score: 85, assignments: 25 },
  { date: '2024-03-01', score: 86, assignments: 28 },
  { date: '2024-03-15', score: 88, assignments: 30 }
];
