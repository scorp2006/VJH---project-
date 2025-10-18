import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
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
  ScatterChart,
  Scatter,
} from "recharts";
import Card from "../components/Card";
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningIcon from '@mui/icons-material/Warning';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SchoolIcon from '@mui/icons-material/School';

interface AnalyticsData {
  // Overview metrics
  totalSubmissions: number;
  totalStudents: number;
  averageTheta: number;
  averageAccuracy: number;

  // Distribution data
  thetaDistribution: { range: string; count: number; color: string }[];
  difficultyAccuracy: { difficulty: string; accuracy: number; count: number; color: string }[];
  bloomAccuracy: { level: string; accuracy: number; count: number; color: string }[];

  // Performance over time
  performanceTimeline: { date: string; avgTheta: number; avgAccuracy: number; count: number }[];

  // Top performers and at-risk students
  topPerformers: { name: string; theta: number; accuracy: number }[];
  atRiskStudents: { name: string; theta: number; accuracy: number }[];

  // Assessment breakdown
  assessmentStats: { name: string; submissions: number; avgTheta: number; avgAccuracy: number }[];
}

const TeacherAnalytics: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadAnalytics();
    }
  }, [currentUser]);

  const loadAnalytics = async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Loading comprehensive analytics...');

      // Load teacher's assessments
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('teacherId', '==', currentUser.id)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessments = assessmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      if (assessments.length === 0) {
        setAnalyticsData(createEmptyAnalytics());
        setLoading(false);
        return;
      }

      // Load all submissions for these assessments
      const assessmentIds = assessments.map(a => a.id);
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

      if (allSubmissions.length === 0) {
        setAnalyticsData(createEmptyAnalytics());
        setLoading(false);
        return;
      }

      // Calculate metrics
      const totalSubmissions = allSubmissions.length;
      const uniqueStudents = new Set(allSubmissions.map((s: any) => s.studentId));
      const totalStudents = uniqueStudents.size;

      const avgTheta = allSubmissions.reduce((sum: number, s: any) =>
        sum + (s.raschData?.finalTheta || 0), 0) / totalSubmissions;

      const avgAccuracy = allSubmissions.reduce((sum: number, s: any) =>
        sum + (s.score || 0), 0) / totalSubmissions;

      // Theta distribution
      const thetaRanges = [
        { min: -Infinity, max: -1.5, label: 'Below Avg', color: '#F44336' },
        { min: -1.5, max: -0.5, label: 'Low Avg', color: '#FF9800' },
        { min: -0.5, max: 0.5, label: 'Average', color: '#FFC107' },
        { min: 0.5, max: 1.5, label: 'Above Avg', color: '#8BC34A' },
        { min: 1.5, max: Infinity, label: 'Advanced', color: '#4CAF50' },
      ];

      const thetaDistribution = thetaRanges.map(range => ({
        range: range.label,
        count: allSubmissions.filter((s: any) => {
          const theta = s.raschData?.finalTheta || 0;
          return theta > range.min && theta <= range.max;
        }).length,
        color: range.color,
      }));

      // Accuracy by difficulty (aggregate from responses)
      const difficultyStats: any = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };
      allSubmissions.forEach((sub: any) => {
        sub.responses?.forEach((r: any) => {
          if (r.difficulty && difficultyStats[r.difficulty]) {
            difficultyStats[r.difficulty].total++;
            if (r.isCorrect) difficultyStats[r.difficulty].correct++;
          }
        });
      });

      const difficultyAccuracy = [
        {
          difficulty: 'Easy',
          accuracy: difficultyStats.easy.total > 0 ? Math.round((difficultyStats.easy.correct / difficultyStats.easy.total) * 100) : 0,
          count: difficultyStats.easy.total,
          color: '#4CAF50'
        },
        {
          difficulty: 'Medium',
          accuracy: difficultyStats.medium.total > 0 ? Math.round((difficultyStats.medium.correct / difficultyStats.medium.total) * 100) : 0,
          count: difficultyStats.medium.total,
          color: '#FF9800'
        },
        {
          difficulty: 'Hard',
          accuracy: difficultyStats.hard.total > 0 ? Math.round((difficultyStats.hard.correct / difficultyStats.hard.total) * 100) : 0,
          count: difficultyStats.hard.total,
          color: '#F44336'
        },
      ];

      // Accuracy by Bloom level
      const bloomStats: any = { 1: { correct: 0, total: 0 }, 2: { correct: 0, total: 0 }, 3: { correct: 0, total: 0 } };
      allSubmissions.forEach((sub: any) => {
        sub.responses?.forEach((r: any) => {
          if (r.bloomLevel && bloomStats[r.bloomLevel]) {
            bloomStats[r.bloomLevel].total++;
            if (r.isCorrect) bloomStats[r.bloomLevel].correct++;
          }
        });
      });

      const bloomAccuracy = [
        {
          level: 'L1: Remember',
          accuracy: bloomStats[1].total > 0 ? Math.round((bloomStats[1].correct / bloomStats[1].total) * 100) : 0,
          count: bloomStats[1].total,
          color: '#2196F3'
        },
        {
          level: 'L2: Understand',
          accuracy: bloomStats[2].total > 0 ? Math.round((bloomStats[2].correct / bloomStats[2].total) * 100) : 0,
          count: bloomStats[2].total,
          color: '#9C27B0'
        },
        {
          level: 'L3: Apply',
          accuracy: bloomStats[3].total > 0 ? Math.round((bloomStats[3].correct / bloomStats[3].total) * 100) : 0,
          count: bloomStats[3].total,
          color: '#FF5722'
        },
      ];

      // Performance timeline (last 14 days)
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (13 - i));
        return date;
      });

      const performanceTimeline = last14Days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const daySubmissions = allSubmissions.filter((sub: any) => {
          if (!sub.submittedAt) return false;
          const subDate = sub.submittedAt.toDate?.() || sub.submittedAt;
          const subDateStr = new Date(subDate).toISOString().split('T')[0];
          return subDateStr === dateStr;
        });

        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avgTheta: daySubmissions.length > 0
            ? parseFloat((daySubmissions.reduce((sum: number, s: any) => sum + (s.raschData?.finalTheta || 0), 0) / daySubmissions.length).toFixed(2))
            : 0,
          avgAccuracy: daySubmissions.length > 0
            ? Math.round(daySubmissions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / daySubmissions.length)
            : 0,
          count: daySubmissions.length,
        };
      });

      // Top performers (highest theta)
      const studentPerformance = new Map<string, { name: string; theta: number[]; accuracy: number[] }>();
      allSubmissions.forEach((sub: any) => {
        if (!studentPerformance.has(sub.studentId)) {
          studentPerformance.set(sub.studentId, {
            name: sub.studentName || 'Unknown',
            theta: [],
            accuracy: []
          });
        }
        const existing = studentPerformance.get(sub.studentId)!;
        existing.theta.push(sub.raschData?.finalTheta || 0);
        existing.accuracy.push(sub.score || 0);
      });

      const studentAverages = Array.from(studentPerformance.entries()).map(([id, data]) => ({
        id,
        name: data.name,
        theta: data.theta.reduce((a, b) => a + b, 0) / data.theta.length,
        accuracy: data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length,
      }));

      const topPerformers = studentAverages
        .sort((a, b) => b.theta - a.theta)
        .slice(0, 5)
        .map(s => ({
          name: s.name,
          theta: parseFloat(s.theta.toFixed(2)),
          accuracy: Math.round(s.accuracy),
        }));

      const atRiskStudents = studentAverages
        .filter(s => s.theta < -0.5)
        .sort((a, b) => a.theta - b.theta)
        .slice(0, 5)
        .map(s => ({
          name: s.name,
          theta: parseFloat(s.theta.toFixed(2)),
          accuracy: Math.round(s.accuracy),
        }));

      // Assessment breakdown
      const assessmentMap = new Map(assessments.map(a => [a.id, a.title]));
      const assessmentStatsMap = new Map<string, { submissions: number; totalTheta: number; totalAccuracy: number }>();

      allSubmissions.forEach((sub: any) => {
        const existing = assessmentStatsMap.get(sub.assessmentId) || { submissions: 0, totalTheta: 0, totalAccuracy: 0 };
        existing.submissions++;
        existing.totalTheta += sub.raschData?.finalTheta || 0;
        existing.totalAccuracy += sub.score || 0;
        assessmentStatsMap.set(sub.assessmentId, existing);
      });

      const assessmentStats = Array.from(assessmentStatsMap.entries())
        .map(([id, stats]) => ({
          name: assessmentMap.get(id) || 'Unknown',
          submissions: stats.submissions,
          avgTheta: parseFloat((stats.totalTheta / stats.submissions).toFixed(2)),
          avgAccuracy: Math.round(stats.totalAccuracy / stats.submissions),
        }))
        .sort((a, b) => b.submissions - a.submissions);

      setAnalyticsData({
        totalSubmissions,
        totalStudents,
        averageTheta: parseFloat(avgTheta.toFixed(2)),
        averageAccuracy: Math.round(avgAccuracy),
        thetaDistribution,
        difficultyAccuracy,
        bloomAccuracy,
        performanceTimeline,
        topPerformers,
        atRiskStudents,
        assessmentStats,
      });

      console.log('✅ Analytics loaded successfully');

    } catch (error) {
      console.error('Error loading analytics:', error);
      setAnalyticsData(createEmptyAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const createEmptyAnalytics = (): AnalyticsData => ({
    totalSubmissions: 0,
    totalStudents: 0,
    averageTheta: 0,
    averageAccuracy: 0,
    thetaDistribution: [],
    difficultyAccuracy: [],
    bloomAccuracy: [],
    performanceTimeline: [],
    topPerformers: [],
    atRiskStudents: [],
    assessmentStats: [],
  });

  if (loading) {
    return (
      <div className="page-content">
        <div className="container">
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div style={{ marginBottom: '20px' }}>
              <SmartToyIcon style={{ fontSize: '64px', color: '#A47C48' }} />
            </div>
            <div style={{ fontSize: '18px', color: '#4B2E05' }}>
              Generating AI-powered analytics...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData || analyticsData.totalSubmissions === 0) {
    return (
      <div className="page-content">
        <div className="container">
          <h1 className="page-title mb-6">Analytics Dashboard</h1>
          <div className="alert" style={{ backgroundColor: '#FFF9E6', border: '2px solid #FFC107' }}>
            <h3 style={{ margin: 0, marginBottom: '10px', color: '#F57C00', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChartIcon fontSize="small" /> No Analytics Data Available
            </h3>
            <p style={{ margin: 0, color: '#666' }}>
              Analytics will appear once students start submitting assessments. Create assessments and share them with your students to get started!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        <h1 className="page-title mb-6" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <BarChartIcon style={{ fontSize: '40px' }} /> Advanced Analytics Dashboard
        </h1>

        {/* Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Total Submissions" subtitle="All submissions">
            <div className="stat-number">{analyticsData.totalSubmissions}</div>
          </Card>
          <Card title="Unique Students" subtitle="Students analyzed">
            <div className="stat-number">{analyticsData.totalStudents}</div>
          </Card>
          <Card title="Average Ability (θ)" subtitle="Rasch model">
            <div className="stat-number" style={{ color: analyticsData.averageTheta >= 0 ? '#4CAF50' : '#FF9800' }}>
              {analyticsData.averageTheta.toFixed(2)}
            </div>
          </Card>
          <Card title="Average Accuracy" subtitle="Overall performance">
            <div className="stat-number" style={{
              color: analyticsData.averageAccuracy >= 70 ? '#4CAF50' : analyticsData.averageAccuracy >= 50 ? '#FF9800' : '#F44336'
            }}>
              {analyticsData.averageAccuracy}%
            </div>
          </Card>
        </div>

        {/* Performance Timeline */}
        {analyticsData.performanceTimeline.some(d => d.count > 0) && (
          <div className="chart-container mb-8">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUpIcon fontSize="small" /> Performance Trend - Last 14 Days (Rasch θ)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.performanceTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="date" stroke="#4B2E05" fontSize={11} angle={-45} textAnchor="end" height={70} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[-2, 2]} />
                <Tooltip />
                <Line type="monotone" dataKey="avgTheta" stroke="#2196F3" strokeWidth={3} name="Avg Theta" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Theta Distribution */}
        <div className="grid grid-3 gap-6 mb-8">
          <div className="chart-container">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <EmojiEventsIcon fontSize="small" /> Ability Distribution (θ)
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.thetaDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="range" stroke="#4B2E05" fontSize={10} />
                <YAxis stroke="#4B2E05" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analyticsData.thetaDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MenuBookIcon fontSize="small" /> Accuracy by Difficulty
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.difficultyAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="difficulty" stroke="#4B2E05" fontSize={12} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {analyticsData.difficultyAccuracy.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SchoolIcon fontSize="small" /> Accuracy by Bloom Level
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analyticsData.bloomAccuracy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                <XAxis dataKey="level" stroke="#4B2E05" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                  {analyticsData.bloomAccuracy.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performers & At-Risk Students */}
        <div className="grid grid-2 gap-6 mb-8">
          {analyticsData.topPerformers.length > 0 && (
            <Card title="Top Performers" subtitle="Highest Rasch θ">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '18px', fontWeight: '600' }}>
                <EmojiEventsIcon style={{ color: '#FFD700' }} /> Top Performers
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #A47C48' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Student</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>θ</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.topPerformers.map((student, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E8D5A8' }}>
                        <td style={{ padding: '8px' }}>{student.name}</td>
                        <td style={{ textAlign: 'center', padding: '8px', color: '#4CAF50', fontWeight: '600' }}>
                          {student.theta.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{student.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {analyticsData.atRiskStudents.length > 0 && (
            <Card title="At-Risk Students" subtitle="Need intervention">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '18px', fontWeight: '600' }}>
                <WarningIcon style={{ color: '#FF9800' }} /> At-Risk Students
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #A47C48' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Student</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>θ</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.atRiskStudents.map((student, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #E8D5A8' }}>
                        <td style={{ padding: '8px' }}>{student.name}</td>
                        <td style={{ textAlign: 'center', padding: '8px', color: '#F44336', fontWeight: '600' }}>
                          {student.theta.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px' }}>{student.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Assessment Breakdown */}
        {analyticsData.assessmentStats.length > 0 && (
          <Card title="Assessment Performance" subtitle="Breakdown by assessment">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '18px', fontWeight: '600' }}>
              <AssessmentIcon /> Assessment Performance
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #A47C48' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>Assessment</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Submissions</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Avg θ</th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>Avg Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.assessmentStats.map((assessment, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E8D5A8' }}>
                      <td style={{ padding: '8px' }}>{assessment.name}</td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>{assessment.submissions}</td>
                      <td style={{ textAlign: 'center', padding: '8px', fontWeight: '600', color: assessment.avgTheta >= 0 ? '#4CAF50' : '#FF9800' }}>
                        {assessment.avgTheta.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px' }}>{assessment.avgAccuracy}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TeacherAnalytics;
