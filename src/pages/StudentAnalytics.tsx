import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Card from "../components/Card";
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

interface StudentData {
  id: string;
  name: string;
  email: string;
}

interface ClassroomData {
  id: string;
  name: string;
  subject: string;
}

interface Submission {
  id: string;
  assessmentId: string;
  assessmentName: string;
  score: number;
  raschData: {
    finalTheta: number;
    thetaProgression: number[];
    standardError: number;
  };
  responses: any[];
  submittedAt: Date;
  timeTaken: number;
}

interface AnalyticsData {
  totalSubmissions: number;
  averageScore: number;
  averageTheta: number;
  thetaProgression: { assessment: string; theta: number; date: string }[];
  scoreProgression: { assessment: string; score: number; date: string }[];
  bloomPerformance: { level: string; correct: number; total: number; accuracy: number; color: string }[];
  difficultyPerformance: { difficulty: string; correct: number; total: number; accuracy: number; color: string }[];
  performanceDistribution: { name: string; value: number; color: string }[];
}

const StudentAnalytics: React.FC = () => {
  const { classroomId, studentId } = useParams<{ classroomId: string; studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (classroomId && studentId) {
      loadStudentAnalytics();
    }
  }, [classroomId, studentId]);

  const loadStudentAnalytics = async () => {
    if (!classroomId || !studentId) return;

    try {
      console.log('📊 Loading student analytics...');

      // Load student data
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      if (!studentDoc.exists()) {
        console.error('Student not found');
        navigate(`/teacher/classroom/${classroomId}`);
        return;
      }
      setStudent({ id: studentDoc.id, ...studentDoc.data() } as StudentData);

      // Load classroom data
      const classroomDoc = await getDoc(doc(db, 'classrooms', classroomId));
      if (!classroomDoc.exists()) {
        console.error('Classroom not found');
        navigate('/teacher/classrooms');
        return;
      }
      setClassroom({ id: classroomDoc.id, ...classroomDoc.data() } as ClassroomData);

      // Load all assessments for this classroom
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('classroomId', '==', classroomId)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessmentIds = assessmentsSnapshot.docs.map(doc => doc.id);
      const assessmentsMap = new Map(
        assessmentsSnapshot.docs.map(doc => [doc.id, doc.data()])
      );

      if (assessmentIds.length === 0) {
        setAnalytics({
          totalSubmissions: 0,
          averageScore: 0,
          averageTheta: 0,
          thetaProgression: [],
          scoreProgression: [],
          bloomPerformance: [],
          difficultyPerformance: [],
          performanceDistribution: [],
        });
        setLoading(false);
        return;
      }

      // Load submissions for this student in this classroom's assessments
      let allSubmissions: any[] = [];
      const batchSize = 10;
      for (let i = 0; i < assessmentIds.length; i += batchSize) {
        const batch = assessmentIds.slice(i, i + batchSize);
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('assessmentId', 'in', batch),
          where('studentId', '==', studentId)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        allSubmissions.push(...submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          submittedAt: doc.data().submittedAt?.toDate?.() || doc.data().submittedAt || new Date(),
        })));
      }

      // Sort submissions by date
      allSubmissions.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      setSubmissions(allSubmissions as Submission[]);

      if (allSubmissions.length === 0) {
        setAnalytics({
          totalSubmissions: 0,
          averageScore: 0,
          averageTheta: 0,
          thetaProgression: [],
          scoreProgression: [],
          bloomPerformance: [],
          difficultyPerformance: [],
          performanceDistribution: [],
        });
        setLoading(false);
        return;
      }

      // Calculate analytics
      const totalScore = allSubmissions.reduce((sum, sub) => sum + (sub.score || 0), 0);
      const totalTheta = allSubmissions.reduce((sum, sub) => sum + (sub.raschData?.finalTheta || 0), 0);
      const avgScore = totalScore / allSubmissions.length;
      const avgTheta = totalTheta / allSubmissions.length;

      // Theta progression over time
      const thetaProgression = allSubmissions.map(sub => ({
        assessment: sub.assessmentName || assessmentsMap.get(sub.assessmentId)?.title || 'Assessment',
        theta: parseFloat((sub.raschData?.finalTheta || 0).toFixed(2)),
        date: new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));

      // Score progression over time
      const scoreProgression = allSubmissions.map(sub => ({
        assessment: sub.assessmentName || assessmentsMap.get(sub.assessmentId)?.title || 'Assessment',
        score: sub.score || 0,
        date: new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));

      // Performance by Bloom's Taxonomy level
      const bloomStats: { [key: string]: { correct: number; total: number } } = {
        'Remember': { correct: 0, total: 0 },
        'Understand': { correct: 0, total: 0 },
        'Apply': { correct: 0, total: 0 },
      };

      allSubmissions.forEach(sub => {
        sub.responses?.forEach((r: any) => {
          const level = r.bloomLevel || 'Remember';
          if (bloomStats[level]) {
            bloomStats[level].total++;
            if (r.isCorrect) {
              bloomStats[level].correct++;
            }
          }
        });
      });

      const bloomPerformance = [
        {
          level: 'L1: Remember',
          correct: bloomStats['Remember'].correct,
          total: bloomStats['Remember'].total,
          accuracy: bloomStats['Remember'].total > 0
            ? Math.round((bloomStats['Remember'].correct / bloomStats['Remember'].total) * 100)
            : 0,
          color: '#2196F3',
        },
        {
          level: 'L2: Understand',
          correct: bloomStats['Understand'].correct,
          total: bloomStats['Understand'].total,
          accuracy: bloomStats['Understand'].total > 0
            ? Math.round((bloomStats['Understand'].correct / bloomStats['Understand'].total) * 100)
            : 0,
          color: '#9C27B0',
        },
        {
          level: 'L3: Apply',
          correct: bloomStats['Apply'].correct,
          total: bloomStats['Apply'].total,
          accuracy: bloomStats['Apply'].total > 0
            ? Math.round((bloomStats['Apply'].correct / bloomStats['Apply'].total) * 100)
            : 0,
          color: '#FF5722',
        },
      ];

      // Performance by difficulty
      const difficultyStats: { [key: string]: { correct: number; total: number } } = {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 },
      };

      allSubmissions.forEach(sub => {
        sub.responses?.forEach((r: any) => {
          const difficulty = r.difficulty || 'medium';
          if (difficultyStats[difficulty]) {
            difficultyStats[difficulty].total++;
            if (r.isCorrect) {
              difficultyStats[difficulty].correct++;
            }
          }
        });
      });

      const difficultyPerformance = [
        {
          difficulty: 'Easy',
          correct: difficultyStats.easy.correct,
          total: difficultyStats.easy.total,
          accuracy: difficultyStats.easy.total > 0
            ? Math.round((difficultyStats.easy.correct / difficultyStats.easy.total) * 100)
            : 0,
          color: '#4CAF50',
        },
        {
          difficulty: 'Medium',
          correct: difficultyStats.medium.correct,
          total: difficultyStats.medium.total,
          accuracy: difficultyStats.medium.total > 0
            ? Math.round((difficultyStats.medium.correct / difficultyStats.medium.total) * 100)
            : 0,
          color: '#FF9800',
        },
        {
          difficulty: 'Hard',
          correct: difficultyStats.hard.correct,
          total: difficultyStats.hard.total,
          accuracy: difficultyStats.hard.total > 0
            ? Math.round((difficultyStats.hard.correct / difficultyStats.hard.total) * 100)
            : 0,
          color: '#F44336',
        },
      ];

      // Performance distribution
      const totalQuestions = allSubmissions.reduce((sum, sub) => sum + (sub.responses?.length || 0), 0);
      const totalCorrect = allSubmissions.reduce(
        (sum, sub) => sum + (sub.responses?.filter((r: any) => r.isCorrect).length || 0),
        0
      );

      const performanceDistribution = [
        { name: 'Correct', value: totalCorrect, color: '#4CAF50' },
        { name: 'Incorrect', value: totalQuestions - totalCorrect, color: '#F44336' },
      ];

      setAnalytics({
        totalSubmissions: allSubmissions.length,
        averageScore: Math.round(avgScore),
        averageTheta: parseFloat(avgTheta.toFixed(2)),
        thetaProgression,
        scoreProgression,
        bloomPerformance,
        difficultyPerformance,
        performanceDistribution,
      });

      console.log('✅ Student analytics loaded successfully');

    } catch (error) {
      console.error('Error loading student analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="container">
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div style={{ marginBottom: '20px' }}>
              <BarChartIcon style={{ fontSize: '64px', color: '#A47C48' }} />
            </div>
            <div style={{ fontSize: '18px', color: '#4B2E05' }}>
              Loading student analytics...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student || !classroom || !analytics) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="alert alert-error">
            <p>Could not load student analytics data.</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/teacher/classroom/${classroomId}`)}
            >
              Back to Classroom
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(`/teacher/classroom/${classroomId}`)}
            style={{ marginBottom: '20px' }}
          >
            ← Back to Classroom
          </button>
          <h1 className="page-title">{student.name}'s Analytics</h1>
          <p style={{ fontSize: '18px', color: '#666', marginTop: '10px' }}>
            {classroom.name} - {classroom.subject}
          </p>
          <p style={{ fontSize: '14px', color: '#999', marginTop: '5px' }}>
            {student.email}
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Total Submissions" subtitle="Assessments completed">
            <div className="stat-number">{analytics.totalSubmissions}</div>
          </Card>
          <Card title="Average Score" subtitle="Overall performance">
            <div
              className="stat-number"
              style={{
                color:
                  analytics.averageScore >= 70
                    ? '#4CAF50'
                    : analytics.averageScore >= 50
                    ? '#FF9800'
                    : '#F44336',
              }}
            >
              {analytics.averageScore}%
            </div>
          </Card>
          <Card title="Average Ability (θ)" subtitle="Rasch model estimate">
            <div
              className="stat-number"
              style={{ color: analytics.averageTheta >= 0 ? '#4CAF50' : '#FF9800' }}
            >
              {analytics.averageTheta.toFixed(2)}
            </div>
          </Card>
          <Card title="Performance Level" subtitle="Based on theta">
            <div className="stat-number" style={{ fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {analytics.averageTheta >= 1.5 ? (
                <><EmojiEventsIcon style={{ color: '#FFD700' }} /> Advanced</>
              ) : analytics.averageTheta >= 0.5 ? (
                <><StarIcon style={{ color: '#FFA500' }} /> Above Avg</>
              ) : analytics.averageTheta >= -0.5 ? (
                <><CheckCircleIcon style={{ color: '#4CAF50' }} /> Average</>
              ) : (
                <><WarningIcon style={{ color: '#FF9800' }} /> Below Avg</>
              )}
            </div>
          </Card>
        </div>

        {/* Progression Charts */}
        {analytics.thetaProgression.length > 0 && (
          <div className="grid grid-2 gap-6 mb-8">
            {/* Theta Progression */}
            <div className="chart-container">
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUpIcon fontSize="small" /> Ability (θ) Progression
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.thetaProgression}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#4B2E05" fontSize={12} />
                  <YAxis stroke="#4B2E05" fontSize={12} domain={[-3, 3]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F5E8C7',
                      border: '2px solid #A47C48',
                      borderRadius: '8px',
                      color: '#4B2E05',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="theta"
                    stroke="#2196F3"
                    strokeWidth={3}
                    dot={{ fill: '#2196F3', strokeWidth: 2, r: 5 }}
                    name="Ability (θ)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Score Progression */}
            <div className="chart-container">
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChartIcon fontSize="small" /> Score Progression
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.scoreProgression}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#4B2E05" fontSize={12} />
                  <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F5E8C7',
                      border: '2px solid #A47C48',
                      borderRadius: '8px',
                      color: '#4B2E05',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4CAF50"
                    strokeWidth={3}
                    dot={{ fill: '#4CAF50', strokeWidth: 2, r: 5 }}
                    name="Score (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Performance by Category */}
        <div className="grid grid-3 gap-6 mb-8">
          {/* Overall Performance Distribution */}
          <div className="chart-container">
            <h3 className="chart-title">Overall Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.performanceDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {analytics.performanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bloom's Taxonomy Performance */}
          <div className="chart-container">
            <h3 className="chart-title">Bloom's Taxonomy</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.bloomPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="level" stroke="#4B2E05" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} name="Accuracy %">
                  {analytics.bloomPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Difficulty Performance */}
          <div className="chart-container">
            <h3 className="chart-title">Difficulty Levels</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.difficultyPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="difficulty" stroke="#4B2E05" fontSize={12} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} name="Accuracy %">
                  {analytics.difficultyPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown Tables */}
        <div className="grid grid-2 gap-6 mb-8">
          {/* Bloom's Taxonomy Details */}
          <Card title="Bloom's Taxonomy Breakdown" subtitle="Cognitive skill levels">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #A47C48' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Level</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Attempted</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Correct</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {analytics.bloomPerformance.map((level, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #E8D4B0' }}>
                    <td style={{ padding: '12px' }}>{level.level}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{level.total}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{level.correct}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          color:
                            level.accuracy >= 75
                              ? '#4CAF50'
                              : level.accuracy >= 60
                              ? '#FFC107'
                              : '#FF5722',
                          fontWeight: 'bold',
                        }}
                      >
                        {level.accuracy}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Difficulty Breakdown */}
          <Card title="Difficulty Level Breakdown" subtitle="Performance by question difficulty">
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #A47C48' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Difficulty</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Attempted</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Correct</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {analytics.difficultyPerformance.map((diff, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #E8D4B0' }}>
                    <td style={{ padding: '12px' }}>{diff.difficulty}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{diff.total}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{diff.correct}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          color:
                            diff.accuracy >= 75
                              ? '#4CAF50'
                              : diff.accuracy >= 60
                              ? '#FFC107'
                              : '#FF5722',
                          fontWeight: 'bold',
                        }}
                      >
                        {diff.accuracy}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Recent Submissions */}
        <Card title="Recent Submissions" subtitle="Latest assessment attempts">
          {submissions.length > 0 ? (
            <div style={{ overflowX: 'auto', marginTop: '10px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Ability (θ)</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.slice(0, 10).map((sub) => (
                    <tr key={sub.id}>
                      <td style={{ fontWeight: '600' }}>{sub.assessmentName}</td>
                      <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                      <td>
                        <span
                          style={{
                            color:
                              sub.score >= 70 ? '#4CAF50' : sub.score >= 50 ? '#FF9800' : '#F44336',
                            fontWeight: '600',
                          }}
                        >
                          {sub.score}%
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            color: sub.raschData?.finalTheta >= 0 ? '#4CAF50' : '#FF9800',
                            fontWeight: '600',
                          }}
                        >
                          {sub.raschData?.finalTheta.toFixed(2)}
                        </span>
                      </td>
                      <td>{Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              No submissions yet
            </p>
          )}
        </Card>

      </div>
    </div>
  );
};

export default StudentAnalytics;
