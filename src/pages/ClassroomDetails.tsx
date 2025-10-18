import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import Card from "../components/Card";
import CreateAssessmentModal from "../components/CreateAssessmentModal";
import { db } from "../firebase/config";
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from "firebase/firestore";
import { generateClassroomInsights, ClassroomInsights } from "../services/intelligentAnalyticsService";

interface Classroom {
  id: string;
  name: string;
  subject: string;
  description: string;
  code: string;
  teacherId: string;
  members: string[];
  createdAt: any;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinedAt?: string;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  duration: number;
  status: 'draft' | 'published' | 'closed';
  questions: any[];
  createdAt: any;
  publishedAt: any;
}

interface StudentPerformance {
  id: string;
  name: string;
  email: string;
  avgTheta: number;
  avgAccuracy: number;
  totalSubmissions: number;
}

interface ClassroomAnalytics {
  totalSubmissions: number;
  averageTheta: number;
  averageAccuracy: number;
  thetaDistribution: { range: string; count: number; color: string }[];
  topPerformers: StudentPerformance[];
  atRiskStudents: StudentPerformance[];
  difficultyAccuracy: { difficulty: string; accuracy: number; color: string }[];
}

const ClassroomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("assignments");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<ClassroomAnalytics | null>(null);
  const [aiInsights, setAiInsights] = useState<ClassroomInsights | null>(null);

  // Fetch classroom data from Firebase
  useEffect(() => {
    const fetchClassroom = async () => {
      if (!id) return;

      try {
        const classroomDoc = await getDoc(doc(db, 'classrooms', id));

        if (classroomDoc.exists()) {
          const classroomData = { ...classroomDoc.data(), id: classroomDoc.id } as Classroom;
          setClassroom(classroomData);

          // Fetch student details if there are members
          if (classroomData.members && classroomData.members.length > 0) {
            const studentsData: Student[] = [];
            for (const memberId of classroomData.members) {
              const studentDoc = await getDoc(doc(db, 'users', memberId));
              if (studentDoc.exists()) {
                studentsData.push({ ...studentDoc.data(), id: studentDoc.id } as Student);
              }
            }
            setStudents(studentsData);
          }
        } else {
          setClassroom(null);
        }
      } catch (error) {
        console.error('Error fetching classroom:', error);
        setClassroom(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClassroom();
  }, [id]);

  // Fetch assessments for this classroom
  useEffect(() => {
    if (!id) return;

    const q = query(
      collection(db, 'assessments'),
      where('classroomId', '==', id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assessmentData: Assessment[] = [];
      snapshot.forEach((doc) => {
        assessmentData.push({ ...doc.data(), id: doc.id } as Assessment);
      });
      setAssessments(assessmentData);
    });

    return unsubscribe;
  }, [id]);

  // Load analytics when analytics tab is active
  useEffect(() => {
    if (activeTab === 'analytics' && classroom && !analytics) {
      loadClassroomAnalytics();
    }
  }, [activeTab, classroom]);

  const loadClassroomAnalytics = async () => {
    if (!id || !classroom) return;

    setAnalyticsLoading(true);

    try {
      console.log('📊 Loading classroom analytics...');

      // Load all submissions for assessments in this classroom
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('classroomId', '==', id)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessmentIds = assessmentsSnapshot.docs.map(doc => doc.id);

      if (assessmentIds.length === 0) {
        setAnalytics({
          totalSubmissions: 0,
          averageTheta: 0,
          averageAccuracy: 0,
          thetaDistribution: [],
          topPerformers: [],
          atRiskStudents: [],
          difficultyAccuracy: [],
        });
        setAnalyticsLoading(false);
        return;
      }

      // Load submissions in batches (Firebase 'in' limit = 10)
      let allSubmissions: any[] = [];
      const batchSize = 10;
      for (let i = 0; i < assessmentIds.length; i += batchSize) {
        const batch = assessmentIds.slice(i, i + batchSize);
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('assessmentId', 'in', batch)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        allSubmissions.push(...submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

      console.log(`📊 Loaded ${allSubmissions.length} submissions`);

      if (allSubmissions.length === 0) {
        setAnalytics({
          totalSubmissions: 0,
          averageTheta: 0,
          averageAccuracy: 0,
          thetaDistribution: [],
          topPerformers: [],
          atRiskStudents: [],
          difficultyAccuracy: [],
        });
        setAnalyticsLoading(false);
        return;
      }

      // Calculate average theta and accuracy
      const totalTheta = allSubmissions.reduce((sum, sub) => sum + (sub.raschData?.finalTheta || 0), 0);
      const totalAccuracy = allSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
      const avgTheta = totalTheta / allSubmissions.length;
      const avgAccuracy = totalAccuracy / allSubmissions.length;

      // Calculate theta distribution
      const thetaRanges = [
        { min: -Infinity, max: -1.5, label: 'Below Average', color: '#F44336' },
        { min: -1.5, max: -0.5, label: 'Low Average', color: '#FF9800' },
        { min: -0.5, max: 0.5, label: 'Average', color: '#FFC107' },
        { min: 0.5, max: 1.5, label: 'Above Average', color: '#8BC34A' },
        { min: 1.5, max: Infinity, label: 'Advanced', color: '#4CAF50' },
      ];

      const thetaDistribution = thetaRanges.map(range => ({
        range: range.label,
        count: allSubmissions.filter(sub => {
          const theta = sub.raschData?.finalTheta || 0;
          return theta >= range.min && theta < range.max;
        }).length,
        color: range.color,
      }));

      // Calculate student performance
      const studentMap = new Map<string, { submissions: any[], totalTheta: number, totalAccuracy: number }>();

      allSubmissions.forEach(sub => {
        if (!sub.studentId) return;

        if (!studentMap.has(sub.studentId)) {
          studentMap.set(sub.studentId, { submissions: [], totalTheta: 0, totalAccuracy: 0 });
        }

        const studentData = studentMap.get(sub.studentId)!;
        studentData.submissions.push(sub);
        studentData.totalTheta += sub.raschData?.finalTheta || 0;
        studentData.totalAccuracy += sub.score || 0;
      });

      const studentPerformances: StudentPerformance[] = [];

      studentMap.forEach((data, studentId) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        studentPerformances.push({
          id: studentId,
          name: student.name,
          email: student.email,
          avgTheta: data.totalTheta / data.submissions.length,
          avgAccuracy: data.totalAccuracy / data.submissions.length,
          totalSubmissions: data.submissions.length,
        });
      });

      // Top performers (top 5 by theta)
      const topPerformers = [...studentPerformances]
        .sort((a, b) => b.avgTheta - a.avgTheta)
        .slice(0, 5);

      // At-risk students (theta < -0.5)
      const atRiskStudents = studentPerformances
        .filter(s => s.avgTheta < -0.5)
        .sort((a, b) => a.avgTheta - b.avgTheta)
        .slice(0, 5);

      // Accuracy by difficulty
      const difficultyStats = {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 },
      };

      allSubmissions.forEach(sub => {
        sub.responses?.forEach((r: any) => {
          if (r.difficulty && difficultyStats[r.difficulty as keyof typeof difficultyStats]) {
            difficultyStats[r.difficulty as keyof typeof difficultyStats].total++;
            if (r.isCorrect) {
              difficultyStats[r.difficulty as keyof typeof difficultyStats].correct++;
            }
          }
        });
      });

      const difficultyAccuracy = [
        {
          difficulty: 'Easy',
          accuracy: difficultyStats.easy.total > 0
            ? Math.round((difficultyStats.easy.correct / difficultyStats.easy.total) * 100)
            : 0,
          color: '#4CAF50',
        },
        {
          difficulty: 'Medium',
          accuracy: difficultyStats.medium.total > 0
            ? Math.round((difficultyStats.medium.correct / difficultyStats.medium.total) * 100)
            : 0,
          color: '#FF9800',
        },
        {
          difficulty: 'Hard',
          accuracy: difficultyStats.hard.total > 0
            ? Math.round((difficultyStats.hard.correct / difficultyStats.hard.total) * 100)
            : 0,
          color: '#F44336',
        },
      ];

      setAnalytics({
        totalSubmissions: allSubmissions.length,
        averageTheta: parseFloat(avgTheta.toFixed(2)),
        averageAccuracy: Math.round(avgAccuracy),
        thetaDistribution,
        topPerformers,
        atRiskStudents,
        difficultyAccuracy,
      });

      // Generate AI insights (simplified - we don't have assessment-specific data here)
      console.log('🤖 Generating AI classroom insights...');
      // For now, we'll create simplified insights without calling the full function
      // since we don't have full submission objects with responses
      const insights: ClassroomInsights = {
        classroomId: id,
        classroomName: classroom.name,
        assessmentId: '', // Multiple assessments
        assessmentName: 'All Assessments',
        totalStudents: studentPerformances.length,
        averageTheta: avgTheta,
        thetaDistribution: {
          belowAverage: studentPerformances.filter(s => s.avgTheta < -0.5).length,
          average: studentPerformances.filter(s => s.avgTheta >= -0.5 && s.avgTheta <= 0.5).length,
          aboveAverage: studentPerformances.filter(s => s.avgTheta > 0.5 && s.avgTheta <= 1.5).length,
          advanced: studentPerformances.filter(s => s.avgTheta > 1.5).length,
        },
        averageAccuracy: avgAccuracy,
        averageTime: 0,
        atRiskStudents: atRiskStudents.map(s => ({
          studentId: s.id,
          studentName: s.name,
          theta: s.avgTheta,
          accuracy: s.avgAccuracy,
          riskFactors: ['Low ability estimate (θ < -0.5)'],
        })),
        questionQuality: [],
        aiInsights: {
          classStrengths: generateClassStrengths(avgTheta, avgAccuracy, studentPerformances.length),
          classWeaknesses: generateClassWeaknesses(atRiskStudents.length, studentPerformances.length),
          teachingRecommendations: generateTeachingRecommendations(avgTheta, atRiskStudents.length),
          interventionNeeded: atRiskStudents.length > 0
            ? [`${atRiskStudents.length} student(s) need additional support`]
            : [],
          topPerformers: topPerformers.slice(0, 3).map(s => `${s.name} (θ = ${s.avgTheta.toFixed(2)})`),
        },
      };
      setAiInsights(insights);

      console.log('✅ Classroom analytics loaded successfully');

    } catch (error) {
      console.error('Error loading classroom analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handlePublishAssessment = async (assessmentId: string) => {
    try {
      await updateDoc(doc(db, 'assessments', assessmentId), {
        status: 'published',
        publishedAt: new Date()
      });
    } catch (error) {
      console.error('Error publishing assessment:', error);
    }
  };

  const handleSuccess = () => {
    // Assessment created - real-time listener will update UI
  };

  // Helper functions for generating insights
  const generateClassStrengths = (avgTheta: number, avgAccuracy: number, totalStudents: number): string[] => {
    const strengths: string[] = [];
    if (avgAccuracy >= 75) {
      strengths.push('Strong overall class performance with high accuracy');
    }
    if (avgTheta >= 0.5) {
      strengths.push('Above-average ability level across the classroom');
    }
    if (totalStudents > 10) {
      strengths.push('Good class size for collaborative learning');
    }
    if (strengths.length === 0) {
      strengths.push('Students are engaged and completing assessments');
    }
    return strengths;
  };

  const generateClassWeaknesses = (atRiskCount: number, totalStudents: number): string[] => {
    const weaknesses: string[] = [];
    const atRiskPercent = (atRiskCount / totalStudents) * 100;

    if (atRiskPercent > 30) {
      weaknesses.push('Significant portion of students struggling with material');
    }
    if (atRiskCount > 0 && atRiskPercent <= 30) {
      weaknesses.push('Some students need additional support');
    }
    if (weaknesses.length === 0) {
      weaknesses.push('Minor gaps in understanding for some concepts');
    }
    return weaknesses;
  };

  const generateTeachingRecommendations = (avgTheta: number, atRiskCount: number): string[] => {
    const recommendations: string[] = [];

    if (atRiskCount > 0) {
      recommendations.push('Provide one-on-one support for struggling students');
      recommendations.push('Consider differentiated instruction strategies');
    }
    if (avgTheta < 0) {
      recommendations.push('Review foundational concepts with the entire class');
      recommendations.push('Use more scaffolding and guided practice');
    } else {
      recommendations.push('Continue current teaching approach');
      recommendations.push('Introduce more challenging material for advanced students');
    }
    return recommendations;
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container" style={{ textAlign: 'center', paddingTop: '100px' }}>
          <div style={{ fontSize: '48px' }}>⏳</div>
          <div style={{ fontSize: '18px', marginTop: '20px', color: '#4B2E05' }}>
            Loading classroom...
          </div>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="error-state">
            <h2>Classroom not found</h2>
            <p>The classroom you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    );
  }

  // Assessment status data (real data)
  const assessmentStatusData = [
    {
      name: "Published",
      value: assessments.filter((a) => a.status === "published").length,
      color: "#4CAF50",
    },
    {
      name: "Draft",
      value: assessments.filter((a) => a.status === "draft").length,
      color: "#FFC107",
    },
    {
      name: "Closed",
      value: assessments.filter((a) => a.status === "closed").length,
      color: "#F44336",
    },
  ];

  return (
    <div className="page-content">
      <div className="container">
        <div className="classroom-header">
          <div className="classroom-info">
            <h1 className="page-title">{classroom.name}</h1>
            <p className="classroom-subtitle">{classroom.subject}</p>
            <p className="classroom-description">{classroom.description}</p>
          </div>
          <div className="classroom-stats">
            <div className="stat-item">
              <span className="stat-label">Students</span>
              <span className="stat-value">{classroom.members.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Assessments</span>
              <span className="stat-value">{assessments.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Class Code</span>
              <span className="stat-value">{classroom.code}</span>
            </div>
          </div>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "assignments" ? "active" : ""}`}
            onClick={() => setActiveTab("assignments")}
          >
            Assessments
          </button>
          <button
            className={`tab ${activeTab === "students" ? "active" : ""}`}
            onClick={() => setActiveTab("students")}
          >
            Students
          </button>
          <button
            className={`tab ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "assignments" && (
            <div>
              <div className="flex flex-between flex-center mb-6">
                <h3>Assessments</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  + Create Assessment
                </button>
              </div>

              {assessments.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📝</div>
                  <h3 className="empty-state-title">No assessments yet</h3>
                  <p className="empty-state-subtitle">
                    Create your first adaptive assessment to start evaluating students
                  </p>
                  <button
                    className="btn btn-primary mt-4"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Create Assessment
                  </button>
                </div>
              ) : (
                <div className="grid grid-2 gap-6">
                  {assessments.map((assessment) => (
                    <Card
                      key={assessment.id}
                      title={assessment.title}
                      subtitle={`${assessment.questions.length} Questions • ${assessment.duration} minutes`}
                    >
                      <div className="assignment-description">
                        {assessment.description}
                      </div>
                      <div className="assignment-footer">
                        <span
                          className={`status ${
                            assessment.status === 'published' ? 'status-completed' :
                            assessment.status === 'closed' ? 'status-overdue' :
                            'status-pending'
                          }`}
                        >
                          {assessment.status.toUpperCase()}
                        </span>
                        <span className="assignment-date">
                          Created{" "}
                          {assessment.createdAt?.toDate?.()?.toLocaleDateString() || 'Just now'}
                        </span>
                      </div>
                      {assessment.status === 'draft' && (
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '12px' }}
                          onClick={() => handlePublishAssessment(assessment.id)}
                        >
                          Publish Assessment
                        </button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "students" && (
            <div>
              <h3 className="mb-6">Students ({students.length})</h3>
              {students.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">👥</div>
                  <h3 className="empty-state-title">No students yet</h3>
                  <p className="empty-state-subtitle">
                    Students will appear here once they join using the class code
                  </p>
                </div>
              ) : (
                <div className="grid grid-3 gap-4">
                  {students.map((student) => (
                    <Card
                      key={student.id}
                      title={student.name}
                      subtitle={student.email}
                      className="clickable-card"
                      onClick={() => navigate(`/teacher/classroom/${id}/student/${student.id}`)}
                    >
                      <div className="student-stats">
                        <div className="student-stat">
                          <span className="stat-label">Role</span>
                          <span className="stat-value">Student</span>
                        </div>
                        <div className="student-stat">
                          <span className="stat-label">Status</span>
                          <span className="stat-value">Active</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', marginTop: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/teacher/classroom/${id}/student/${student.id}`);
                        }}
                      >
                        View Analytics
                      </button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div>
              {analyticsLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '20px' }}>🤖</div>
                  <h2>Generating AI-Powered Analytics...</h2>
                  <p style={{ color: '#666', marginTop: '10px' }}>
                    Analyzing classroom performance using Rasch Model IRT
                  </p>
                </div>
              ) : !analytics || analytics.totalSubmissions === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📊</div>
                  <h3 className="empty-state-title">No Analytics Data Yet</h3>
                  <p className="empty-state-subtitle">
                    Analytics will appear once students complete assessments in this classroom
                  </p>
                </div>
              ) : (
                <>
                  {/* Overview Cards */}
                  <div className="grid grid-4 mb-8">
                    <Card title="Total Submissions" subtitle="Assessment completions">
                      <div className="stat-number">{analytics.totalSubmissions}</div>
                    </Card>
                    <Card title="Average Ability (θ)" subtitle="Rasch model estimate">
                      <div className="stat-number" style={{ color: analytics.averageTheta >= 0 ? '#4CAF50' : '#FF9800' }}>
                        {analytics.averageTheta.toFixed(2)}
                      </div>
                    </Card>
                    <Card title="Average Accuracy" subtitle="Class performance">
                      <div className="stat-number" style={{
                        color: analytics.averageAccuracy >= 70 ? '#4CAF50' : analytics.averageAccuracy >= 50 ? '#FF9800' : '#F44336'
                      }}>
                        {analytics.averageAccuracy}%
                      </div>
                    </Card>
                    <Card title="At-Risk Students" subtitle="Need attention">
                      <div className="stat-number" style={{ color: analytics.atRiskStudents.length > 0 ? '#F44336' : '#4CAF50' }}>
                        {analytics.atRiskStudents.length}
                      </div>
                    </Card>
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-2 gap-6 mb-8">
                    {/* Theta Distribution */}
                    <div className="chart-container">
                      <h3 className="chart-title">📊 Ability Distribution (θ)</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.thetaDistribution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                          <XAxis dataKey="range" stroke="#4B2E05" fontSize={10} angle={-15} textAnchor="end" height={80} />
                          <YAxis stroke="#4B2E05" fontSize={12} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#F5E8C7',
                              border: '2px solid #A47C48',
                              borderRadius: '8px',
                              color: '#4B2E05',
                            }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Students">
                            {analytics.thetaDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Accuracy by Difficulty */}
                    <div className="chart-container">
                      <h3 className="chart-title">📈 Accuracy by Difficulty</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.difficultyAccuracy}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                          <XAxis dataKey="difficulty" stroke="#4B2E05" fontSize={12} />
                          <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#F5E8C7',
                              border: '2px solid #A47C48',
                              borderRadius: '8px',
                              color: '#4B2E05',
                            }}
                          />
                          <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} name="Accuracy %">
                            {analytics.difficultyAccuracy.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Assessment Status */}
                  <div className="chart-container mb-8">
                    <h3 className="chart-title">📝 Assessment Status Overview</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={assessmentStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {assessmentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Top Performers */}
                  {analytics.topPerformers.length > 0 && (
                    <div className="mb-8">
                      <Card title="🏆 Top Performers" subtitle="Highest ability estimates">
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Rank</th>
                                <th>Student</th>
                                <th>Email</th>
                                <th>Ability (θ)</th>
                                <th>Accuracy</th>
                                <th>Submissions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.topPerformers.map((student, index) => (
                                <tr key={student.id}>
                                  <td style={{ fontWeight: '600', color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666' }}>
                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                  </td>
                                  <td style={{ fontWeight: '600' }}>{student.name}</td>
                                  <td style={{ fontSize: '14px', color: '#666' }}>{student.email}</td>
                                  <td>
                                    <span style={{ color: student.avgTheta >= 0 ? '#4CAF50' : '#FF9800', fontWeight: '600' }}>
                                      {student.avgTheta.toFixed(2)}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{
                                      color: student.avgAccuracy >= 70 ? '#4CAF50' : student.avgAccuracy >= 50 ? '#FF9800' : '#F44336',
                                      fontWeight: '600'
                                    }}>
                                      {Math.round(student.avgAccuracy)}%
                                    </span>
                                  </td>
                                  <td>{student.totalSubmissions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* At-Risk Students */}
                  {analytics.atRiskStudents.length > 0 && (
                    <div className="mb-8">
                      <Card title="⚠️ At-Risk Students" subtitle="Students who need support (θ < -0.5)">
                        <div style={{ overflowX: 'auto' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Email</th>
                                <th>Ability (θ)</th>
                                <th>Accuracy</th>
                                <th>Submissions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.atRiskStudents.map((student) => (
                                <tr key={student.id}>
                                  <td style={{ fontWeight: '600' }}>{student.name}</td>
                                  <td style={{ fontSize: '14px', color: '#666' }}>{student.email}</td>
                                  <td>
                                    <span style={{ color: '#F44336', fontWeight: '600' }}>
                                      {student.avgTheta.toFixed(2)}
                                    </span>
                                  </td>
                                  <td>
                                    <span style={{ color: '#F44336', fontWeight: '600' }}>
                                      {Math.round(student.avgAccuracy)}%
                                    </span>
                                  </td>
                                  <td>{student.totalSubmissions}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* AI Insights */}
                  {aiInsights && (
                    <div className="grid grid-2 gap-6 mb-8">
                      {/* Classroom Strengths */}
                      <Card title="💪 Classroom Strengths" subtitle="AI-Generated Insights">
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {aiInsights.aiInsights.classStrengths.map((strength: string, index: number) => (
                            <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0 }}>✅</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </Card>

                      {/* Areas for Improvement */}
                      <Card title="📚 Areas for Improvement" subtitle="AI-Generated Insights">
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {aiInsights.aiInsights.classWeaknesses.map((weakness: string, index: number) => (
                            <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0 }}>📌</span>
                              {weakness}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  )}

                  {/* Teaching Recommendations */}
                  {aiInsights && (
                    <div className="mb-8">
                      <Card title="💡 Teaching Recommendations" subtitle="AI-Generated Suggestions">
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {aiInsights.aiInsights.teachingRecommendations.map((rec: string, index: number) => (
                            <li key={index} style={{ marginBottom: '12px', paddingLeft: '20px', position: 'relative' }}>
                              <span style={{ position: 'absolute', left: 0 }}>🎯</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                  )}

                </>
              )}
            </div>
          )}
        </div>

        {/* Create Assessment Modal */}
        <CreateAssessmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleSuccess}
          classroomId={id!}
        />
      </div>
    </div>
  );
};

export default ClassroomDetails;
