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
} from "recharts";
import Card from "../components/Card";
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SchoolIcon from '@mui/icons-material/School';
import BarChartIcon from '@mui/icons-material/BarChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShowChartIcon from '@mui/icons-material/ShowChart';

interface DashboardStats {
  totalClassrooms: number;
  totalStudents: number;
  totalAssessments: number;
  averageTheta: number;
  averageAccuracy: number;
  totalSubmissions: number;
}

interface PerformanceTrend {
  date: string;
  avgTheta: number;
  avgAccuracy: number;
  submissions: number;
}

interface RecentActivity {
  type: 'assessment' | 'submission' | 'classroom';
  title: string;
  description: string;
  timestamp: Date;
}

const TeacherDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClassrooms: 0,
    totalStudents: 0,
    totalAssessments: 0,
    averageTheta: 0,
    averageAccuracy: 0,
    totalSubmissions: 0,
  });
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceTrend[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Loading teacher dashboard data...');

      // Load classrooms
      const classroomsQuery = query(
        collection(db, 'classrooms'),
        where('teacherId', '==', currentUser.id)
      );
      const classroomsSnapshot = await getDocs(classroomsQuery);
      const classrooms = classroomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Count unique students across all classrooms
      const allStudents = new Set<string>();
      classrooms.forEach((classroom: any) => {
        if (classroom.members) {
          classroom.members.forEach((studentId: string) => allStudents.add(studentId));
        }
      });

      // Load assessments
      const assessmentsQuery = query(
        collection(db, 'assessments'),
        where('teacherId', '==', currentUser.id)
      );
      const assessmentsSnapshot = await getDocs(assessmentsQuery);
      const assessments = assessmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Load submissions for teacher's assessments
      const assessmentIds = assessments.map((a: any) => a.id);
      let allSubmissions: any[] = [];

      if (assessmentIds.length > 0) {
        // Firebase has a limit of 10 items in 'in' queries, so we batch them
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
      }

      // Calculate average theta and accuracy from submissions
      let totalTheta = 0;
      let totalAccuracy = 0;
      allSubmissions.forEach((sub: any) => {
        if (sub.raschData?.finalTheta !== undefined) {
          totalTheta += sub.raschData.finalTheta;
        }
        if (sub.score !== undefined) {
          totalAccuracy += sub.score;
        }
      });

      const avgTheta = allSubmissions.length > 0 ? totalTheta / allSubmissions.length : 0;
      const avgAccuracy = allSubmissions.length > 0 ? totalAccuracy / allSubmissions.length : 0;

      // Calculate performance trend (last 7 days)
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      const trend: PerformanceTrend[] = last7Days.map(date => {
        const dateStr = date.toISOString().split('T')[0];
        const daySubmissions = allSubmissions.filter((sub: any) => {
          if (!sub.submittedAt) return false;
          const subDate = sub.submittedAt.toDate?.() || sub.submittedAt;
          const subDateStr = new Date(subDate).toISOString().split('T')[0];
          return subDateStr === dateStr;
        });

        const dayTheta = daySubmissions.length > 0
          ? daySubmissions.reduce((sum: number, sub: any) => sum + (sub.raschData?.finalTheta || 0), 0) / daySubmissions.length
          : 0;

        const dayAccuracy = daySubmissions.length > 0
          ? daySubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0) / daySubmissions.length
          : 0;

        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          avgTheta: parseFloat(dayTheta.toFixed(2)),
          avgAccuracy: Math.round(dayAccuracy),
          submissions: daySubmissions.length,
        };
      });

      // Generate recent activity
      const activities: RecentActivity[] = [];

      // Recent submissions
      const recentSubmissions = allSubmissions
        .sort((a: any, b: any) => {
          const aDate = a.submittedAt?.toDate?.() || a.submittedAt || new Date(0);
          const bDate = b.submittedAt?.toDate?.() || b.submittedAt || new Date(0);
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
        .slice(0, 3);

      recentSubmissions.forEach((sub: any) => {
        activities.push({
          type: 'submission',
          title: 'New submission received',
          description: `${sub.studentName || 'Student'} submitted ${sub.assessmentName || 'assessment'}`,
          timestamp: sub.submittedAt?.toDate?.() || sub.submittedAt || new Date(),
        });
      });

      // Recent assessments
      const recentAssessments = assessments
        .sort((a: any, b: any) => {
          const aDate = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const bDate = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
        .slice(0, 2);

      recentAssessments.forEach((assessment: any) => {
        activities.push({
          type: 'assessment',
          title: 'New assessment created',
          description: `${assessment.title} - ${assessment.questions?.length || 0} questions`,
          timestamp: assessment.createdAt?.toDate?.() || assessment.createdAt || new Date(),
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Update state
      setStats({
        totalClassrooms: classrooms.length,
        totalStudents: allStudents.size,
        totalAssessments: assessments.length,
        averageTheta: parseFloat(avgTheta.toFixed(2)),
        averageAccuracy: Math.round(avgAccuracy),
        totalSubmissions: allSubmissions.length,
      });

      setPerformanceTrend(trend);
      setRecentActivity(activities.slice(0, 5));

      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assessment': return <AssessmentIcon fontSize="small" />;
      case 'submission': return <CheckCircleIcon fontSize="small" />;
      case 'classroom': return <SchoolIcon fontSize="small" />;
      default: return <BarChartIcon fontSize="small" />;
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
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
              Loading dashboard analytics...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        {/* Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Total Classrooms" subtitle="Active classrooms">
            <div className="stat-number">{stats.totalClassrooms}</div>
          </Card>
          <Card title="Total Students" subtitle="Enrolled students">
            <div className="stat-number">{stats.totalStudents}</div>
          </Card>
          <Card title="Total Assessments" subtitle="Created assessments">
            <div className="stat-number">{stats.totalAssessments}</div>
          </Card>
          <Card title="Average Ability (θ)" subtitle="Rasch model estimate">
            <div className="stat-number" style={{ color: stats.averageTheta >= 0 ? '#4CAF50' : '#FF9800' }}>
              {stats.averageTheta.toFixed(2)}
            </div>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-2 mb-8">
          <Card title="Total Submissions" subtitle="All student submissions">
            <div className="stat-number">{stats.totalSubmissions}</div>
          </Card>
          <Card title="Average Accuracy" subtitle="Overall performance">
            <div className="stat-number" style={{
              color: stats.averageAccuracy >= 70 ? '#4CAF50' : stats.averageAccuracy >= 50 ? '#FF9800' : '#F44336'
            }}>
              {stats.averageAccuracy}%
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        {performanceTrend.length > 0 && performanceTrend.some(d => d.submissions > 0) ? (
          <div className="grid grid-2 gap-6 mb-8">
            {/* Theta Trend Chart */}
            <div className="chart-container">
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUpIcon fontSize="small" /> Average Ability (θ) Trend - Last 7 Days
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#4B2E05" fontSize={12} />
                  <YAxis stroke="#4B2E05" fontSize={12} domain={[-2, 2]} />
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
                    dataKey="avgTheta"
                    stroke="#2196F3"
                    strokeWidth={3}
                    dot={{ fill: '#2196F3', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2196F3', strokeWidth: 2 }}
                    name="Avg Theta"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Submission Volume Chart */}
            <div className="chart-container">
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShowChartIcon fontSize="small" /> Submission Volume - Last 7 Days
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#A47C48" opacity={0.3} />
                  <XAxis dataKey="date" stroke="#4B2E05" fontSize={12} />
                  <YAxis stroke="#4B2E05" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#F5E8C7',
                      border: '2px solid #A47C48',
                      borderRadius: '8px',
                      color: '#4B2E05',
                    }}
                  />
                  <Bar
                    dataKey="submissions"
                    fill="#A47C48"
                    radius={[4, 4, 0, 0]}
                    name="Submissions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="alert" style={{ marginBottom: '30px', backgroundColor: '#FFF9E6', border: '2px solid #FFC107' }}>
            <p style={{ margin: 0, color: '#F57C00', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChartIcon fontSize="small" /> No submission data yet. Performance trends will appear once students complete assessments.
            </p>
          </div>
        )}

        {/* Recent Activity */}
        <div className="mt-8">
          <Card title="Recent Activity" subtitle="Latest updates">
            {recentActivity.length > 0 ? (
              <div className="activity-list">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-subtitle">{activity.description}</div>
                      <div className="activity-time">{getTimeAgo(activity.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ marginBottom: '10px' }}>
                  <AssessmentIcon style={{ fontSize: '48px', color: '#A47C48' }} />
                </div>
                <p>No recent activity. Create an assessment to get started!</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
