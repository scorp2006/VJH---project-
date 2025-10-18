import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/config";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Submission {
  id: string;
  studentId: string;
  assessmentId: string;
  assessmentName: string;
  classroomId: string;
  score: number;
  submittedAt: Date;
  raschData?: any;
}

interface Assessment {
  id: string;
  title: string;
  description: string;
  classroomId: string;
}

interface Classroom {
  id: string;
  name: string;
  subject: string;
}

const SubmissionHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all">("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "assessment">("date");
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [assessments, setAssessments] = useState<Map<string, Assessment>>(new Map());
  const [classrooms, setClassrooms] = useState<Map<string, Classroom>>(new Map());

  useEffect(() => {
    if (currentUser) {
      loadSubmissionHistory();
    }
  }, [currentUser]);

  const loadSubmissionHistory = async () => {
    if (!currentUser) return;

    try {
      console.log('📊 Loading submission history...');

      // Load all submissions for this student
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('studentId', '==', currentUser.id)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const submissions: Submission[] = submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate?.() || doc.data().submittedAt || new Date(),
      })) as Submission[];

      // Get unique assessment IDs
      const assessmentIds = Array.from(new Set(submissions.map(s => s.assessmentId)));

      // Load assessments
      const assessmentsMap = new Map<string, Assessment>();
      if (assessmentIds.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < assessmentIds.length; i += batchSize) {
          const batch = assessmentIds.slice(i, i + batchSize);
          const assessmentsQuery = query(
            collection(db, 'assessments'),
            where('__name__', 'in', batch)
          );
          const assessmentsSnapshot = await getDocs(assessmentsQuery);
          assessmentsSnapshot.docs.forEach(doc => {
            assessmentsMap.set(doc.id, { id: doc.id, ...doc.data() } as Assessment);
          });
        }
      }

      // Get unique classroom IDs
      const classroomIds = Array.from(new Set(Array.from(assessmentsMap.values()).map(a => a.classroomId)));

      // Load classrooms
      const classroomsMap = new Map<string, Classroom>();
      if (classroomIds.length > 0) {
        const batchSize = 10;
        for (let i = 0; i < classroomIds.length; i += batchSize) {
          const batch = classroomIds.slice(i, i + batchSize);
          const classroomsQuery = query(
            collection(db, 'classrooms'),
            where('__name__', 'in', batch)
          );
          const classroomsSnapshot = await getDocs(classroomsQuery);
          classroomsSnapshot.docs.forEach(doc => {
            classroomsMap.set(doc.id, { id: doc.id, ...doc.data() } as Classroom);
          });
        }
      }

      setAllSubmissions(submissions);
      setAssessments(assessmentsMap);
      setClassrooms(classroomsMap);

      console.log('✅ Submission history loaded successfully');

    } catch (error) {
      console.error('Error loading submission history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort submissions
  const filteredSubmissions = allSubmissions
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case "score":
          return (b.score || 0) - (a.score || 0);
        case "assessment":
          const assessmentA = assessments.get(a.assessmentId);
          const assessmentB = assessments.get(b.assessmentId);
          return assessmentA?.title.localeCompare(assessmentB?.title || "") || 0;
        default:
          return 0;
      }
    });

  const getAssessmentInfo = (assessmentId: string) => {
    return assessments.get(assessmentId);
  };

  const getClassroomInfo = (classroomId: string) => {
    return classrooms.get(classroomId);
  };

  const getStatusColor = (score?: number) => {
    if (score !== undefined) {
      if (score >= 90) return "status-excellent";
      if (score >= 80) return "status-good";
      if (score >= 70) return "status-average";
      return "status-poor";
    }
    return "status-completed";
  };

  const getStatusText = (score?: number) => {
    if (score !== undefined) {
      return `${score}%`;
    }
    return "Completed";
  };

  const calculateOverallStats = () => {
    const averageScore =
      allSubmissions.length > 0
        ? allSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / allSubmissions.length
        : 0;

    return {
      total: allSubmissions.length,
      completed: allSubmissions.length,
      pending: 0,
      averageScore: Math.round(averageScore),
    };
  };

  const stats = calculateOverallStats();

  if (loading) {
    return (
      <div className="page-content">
        <div className="container">
          <div style={{ textAlign: 'center', paddingTop: '100px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
            <div style={{ fontSize: '18px', color: '#4B2E05' }}>
              Loading submission history...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        <h1 className="page-title mb-6">Submission History</h1>

        {/* Stats Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Total Submissions" subtitle="All assignments">
            <div className="stat-number">{stats.total}</div>
          </Card>
          <Card title="Completed" subtitle="Graded assignments">
            <div className="stat-number">{stats.completed}</div>
          </Card>
          <Card title="Pending" subtitle="Awaiting grading">
            <div className="stat-number">{stats.pending}</div>
          </Card>
          <Card title="Average Score" subtitle="Overall performance">
            <div className="stat-number">{stats.averageScore}%</div>
          </Card>
        </div>

        {/* Filters and Sorting */}
        <div className="filters-section">
          <div className="flex flex-between flex-center mb-6">
            <h2 className="section-title">Your Submissions</h2>
            <div className="filter-controls">
              <div className="filter-group">
                <label className="filter-label">Sort by:</label>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "score" | "assessment")
                  }
                >
                  <option value="date">Date</option>
                  <option value="score">Score</option>
                  <option value="assessment">Assessment</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3 className="empty-state-title">No submissions found</h3>
            <p className="empty-state-subtitle">
              You haven't submitted any assessments yet.
            </p>
          </div>
        ) : (
          <div className="submissions-list">
            {filteredSubmissions.map((submission) => {
              const assessment = getAssessmentInfo(submission.assessmentId);
              const classroom = assessment
                ? getClassroomInfo(assessment.classroomId)
                : null;

              return (
                <Card
                  key={submission.id}
                  title={submission.assessmentName || assessment?.title || 'Assessment'}
                  subtitle={classroom ? `${classroom.name} • ${classroom.subject}` : 'Classroom'}
                  className="submission-card"
                >
                  <div className="submission-content">
                    <div className="submission-description">
                      <p className="assignment-description">
                        {assessment?.description || 'Adaptive assessment using Rasch Model IRT'}
                      </p>
                    </div>

                    <div className="submission-details">
                      <div className="detail-row">
                        <span className="detail-label">Type:</span>
                        <span className="assignment-type type-quiz">
                          Adaptive Assessment
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Submitted:</span>
                        <span className="detail-value">
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Ability Level (θ):</span>
                        <span className="detail-value" style={{
                          color: (submission.raschData?.finalTheta || 0) >= 0 ? '#4CAF50' : '#FF9800',
                          fontWeight: 'bold'
                        }}>
                          {(submission.raschData?.finalTheta || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="submission-footer">
                    <div className="submission-status">
                      <span
                        className={`status-badge ${getStatusColor(submission.score)}`}
                      >
                        {getStatusText(submission.score)}
                      </span>
                    </div>

                    <div className="submission-actions">
                      <div className="score-display">
                        <span className="score-label">Score:</span>
                        <span className="score-value">
                          {submission.score}%
                        </span>
                      </div>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => navigate(`/student/results/${submission.id}`)}
                        style={{ marginLeft: '10px' }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionHistory;
