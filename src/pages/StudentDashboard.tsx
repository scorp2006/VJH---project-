import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import BarChartIcon from '@mui/icons-material/BarChart';
import InboxIcon from '@mui/icons-material/Inbox';

interface DashboardStats {
  totalClassrooms: number;
  totalAssessments: number;
  averageScore: number;
  pendingTasks: number;
}

interface PerformanceTrend {
  date: string;
  score: number;
  assessments: number;
}

interface RecentActivity {
  id: string;
  type: 'submission' | 'new_assessment' | 'completed';
  title: string;
  subtitle: string;
  timestamp: Date;
}

interface UpcomingAssessment {
  id: string;
  title: string;
  classroomName: string;
  publishedAt: Date;
  classroomId: string;
}

const StudentDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClassrooms: 0,
    totalAssessments: 0,
    averageScore: 0,
    pendingTasks: 0,
  });
  const [performanceData, setPerformanceData] = useState<PerformanceTrend[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [upcomingAssessments, setUpcomingAssessments] = useState<UpcomingAssessment[]>([]);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Loading student dashboard data...');

      // Load classrooms where student is a member
      const classroomsSnapshot = await getDocs(collection(db, 'classrooms'));
      const enrolledClassrooms = classroomsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((classroom: any) => classroom.members?.includes(currentUser.id));

      // Load all submissions for this student
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('studentId', '==', currentUser.id)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const allSubmissions = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate average score
      const totalScore = allSubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0);
      const avgScore = allSubmissions.length > 0 ? Math.round(totalScore / allSubmissions.length) : 0;

      // Get submitted assessment IDs
      const submittedAssessmentIds = new Set(allSubmissions.map((sub: any) => sub.assessmentId));

      // Load all published assessments for enrolled classrooms
      const classroomIds = enrolledClassrooms.map((c: any) => c.id);
      let allAssessments: any[] = [];

      if (classroomIds.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < classroomIds.length; i += batchSize) {
          const batch = classroomIds.slice(i, i + batchSize);
          const assessmentsQuery = query(
            collection(db, 'assessments'),
            where('classroomId', 'in', batch),
            where('status', '==', 'published')
          );
          const assessmentsSnapshot = await getDocs(assessmentsQuery);
          allAssessments.push(...assessmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      }

      // Calculate pending tasks (assessments not yet submitted)
      const pendingCount = allAssessments.filter((assessment: any) =>
        !submittedAssessmentIds.has(assessment.id)
      ).length;

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

        const dayScore = daySubmissions.length > 0
          ? daySubmissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0) / daySubmissions.length
          : 0;

        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: Math.round(dayScore),
          assessments: daySubmissions.length,
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
          id: sub.id,
          type: 'submission',
          title: 'Assessment submitted',
          subtitle: `${sub.assessmentName || 'Assessment'} - Score: ${sub.score || 0}%`,
          timestamp: sub.submittedAt?.toDate?.() || sub.submittedAt || new Date(),
        });
      });

      // Recent assessments (newly published)
      const recentAssessments = allAssessments
        .filter((a: any) => !submittedAssessmentIds.has(a.id))
        .sort((a: any, b: any) => {
          const aDate = a.publishedAt?.toDate?.() || a.publishedAt || new Date(0);
          const bDate = b.publishedAt?.toDate?.() || b.publishedAt || new Date(0);
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
        .slice(0, 2);

      recentAssessments.forEach((assessment: any) => {
        const classroom: any = enrolledClassrooms.find((c: any) => c.id === assessment.classroomId);
        activities.push({
          id: assessment.id,
          type: 'new_assessment',
          title: 'New assessment available',
          subtitle: `${assessment.title} - ${classroom ? classroom.name : 'Classroom'}`,
          timestamp: assessment.publishedAt?.toDate?.() || assessment.publishedAt || new Date(),
        });
      });

      // Sort all activities by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Get upcoming assessments (not submitted)
      const upcoming = allAssessments
        .filter((a: any) => !submittedAssessmentIds.has(a.id))
        .sort((a: any, b: any) => {
          const aDate = a.publishedAt?.toDate?.() || a.publishedAt || new Date(0);
          const bDate = b.publishedAt?.toDate?.() || b.publishedAt || new Date(0);
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
        .slice(0, 3)
        .map((assessment: any) => {
          const classroom: any = enrolledClassrooms.find((c: any) => c.id === assessment.classroomId);
          return {
            id: assessment.id,
            title: assessment.title,
            classroomName: classroom ? classroom.name : 'Classroom',
            publishedAt: assessment.publishedAt?.toDate?.() || assessment.publishedAt || new Date(),
            classroomId: assessment.classroomId,
          };
        });

      // Update state
      setStats({
        totalClassrooms: enrolledClassrooms.length,
        totalAssessments: allSubmissions.length,
        averageScore: avgScore,
        pendingTasks: pendingCount,
      });

      setPerformanceData(trend);
      setRecentActivity(activities.slice(0, 3));
      setUpcomingAssessments(upcoming);

      console.log('✅ Student dashboard data loaded successfully');

    } catch (error) {
      console.error('Error loading student dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'submission': return <CheckCircleIcon fontSize="small" />;
      case 'new_assessment': return <AssessmentIcon fontSize="small" />;
      case 'completed': return <EmojiEventsIcon fontSize="small" />;
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
              Loading your dashboard...
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
          <Card title="Classrooms Joined" subtitle="Active enrollments">
            <div className="stat-number">
              {stats.totalClassrooms}
            </div>
          </Card>
          <Card title="Assessments Completed" subtitle="Finished assessments">
            <div className="stat-number">
              {stats.totalAssessments}
            </div>
          </Card>
          <Card title="Average Score" subtitle="Overall performance">
            <div className="stat-number">
              {stats.averageScore}%
            </div>
          </Card>
          <Card title="Pending Tasks" subtitle="Assessments to complete">
            <div className="stat-number">{stats.pendingTasks}</div>
          </Card>
        </div>

        {/* Charts Section */}
        {performanceData.length > 0 && performanceData.some(d => d.assessments > 0) ? (
          <div className="grid grid-2 gap-6">
            {/* Performance Trend Chart */}
            <div className="chart-container">
              <h3 className="chart-title">My Performance Trend - Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#A47C48"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#4B2E05"
                    fontSize={12}
                  />
                  <YAxis stroke="#4B2E05" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#F5E8C7",
                      border: "2px solid #A47C48",
                      borderRadius: "8px",
                      color: "#4B2E05",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#A47C48"
                    strokeWidth={3}
                    dot={{ fill: "#A47C48", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#A47C48", strokeWidth: 2 }}
                    name="Score (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Assessment Progress Chart */}
            <div className="chart-container">
              <h3 className="chart-title">Assessment Activity - Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#A47C48"
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#4B2E05"
                    fontSize={12}
                  />
                  <YAxis stroke="#4B2E05" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#F5E8C7",
                      border: "2px solid #A47C48",
                      borderRadius: "8px",
                      color: "#4B2E05",
                    }}
                  />
                  <Bar
                    dataKey="assessments"
                    fill="#A47C48"
                    radius={[4, 4, 0, 0]}
                    name="Assessments Completed"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="alert" style={{ marginBottom: '30px', backgroundColor: '#FFF9E6', border: '2px solid #FFC107' }}>
            <p style={{ margin: 0, color: '#F57C00', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChartIcon fontSize="small" /> No activity data yet. Performance trends will appear once you complete assessments.
            </p>
          </div>
        )}

        {/* Recent Activity and Upcoming Assessments */}
        <div className="grid grid-2 gap-6 mt-8">
          {/* Recent Activity */}
          <Card title="Recent Activity" subtitle="Your latest updates">
            {recentActivity.length > 0 ? (
              <div className="activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">{getActivityIcon(activity.type)}</div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-subtitle">{activity.subtitle}</div>
                      <div className="activity-time">{getTimeAgo(activity.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ marginBottom: '10px' }}>
                  <InboxIcon style={{ fontSize: '48px', color: '#A47C48' }} />
                </div>
                <p>No recent activity yet. Start completing assessments!</p>
              </div>
            )}
          </Card>

          {/* Upcoming Assessments */}
          <Card title="Upcoming Assessments" subtitle="Available to complete">
            {upcomingAssessments.length > 0 ? (
              <div className="assignment-list">
                {upcomingAssessments.map((assessment) => (
                  <div key={assessment.id} className="assignment-item">
                    <div className="assignment-info">
                      <div className="assignment-title">{assessment.title}</div>
                      <div className="assignment-class">{assessment.classroomName}</div>
                    </div>
                    <div className="assignment-deadline">
                      <span className="deadline-label">Published:</span>
                      <span className="deadline-date">
                        {assessment.publishedAt.toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => navigate(`/student/classroom/${assessment.classroomId}/assessments`)}
                      style={{ marginTop: '8px' }}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <div style={{ marginBottom: '10px' }}>
                  <CheckCircleIcon style={{ fontSize: '48px', color: '#4CAF50' }} />
                </div>
                <p>All caught up! No pending assessments.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
