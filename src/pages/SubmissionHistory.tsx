import React, { useState } from "react";
import Card from "../components/Card";
import {
  sampleSubmissions,
  sampleAssignments,
  sampleClassrooms,
} from "../data/sampleData";

const SubmissionHistory: React.FC = () => {
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "completed"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "assignment">("date");

  // Get all submissions for the current student (assuming student ID "s1")
  const studentSubmissions = sampleSubmissions.filter(
    (s) => s.studentId === "s1"
  );

  // Filter and sort submissions
  const filteredSubmissions = studentSubmissions
    .filter((submission) => {
      if (filterStatus === "all") return true;
      return submission.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime()
          );
        case "score":
          return (b.score || 0) - (a.score || 0);
        case "assignment":
          const assignmentA = sampleAssignments.find(
            (as) => as.id === a.assignmentId
          );
          const assignmentB = sampleAssignments.find(
            (as) => as.id === b.assignmentId
          );
          return (
            assignmentA?.title.localeCompare(assignmentB?.title || "") || 0
          );
        default:
          return 0;
      }
    });

  const getAssignmentInfo = (assignmentId: string) => {
    return sampleAssignments.find((a) => a.id === assignmentId);
  };

  const getClassroomInfo = (classroomId: string) => {
    return sampleClassrooms.find((c) => c.id === classroomId);
  };

  const getStatusColor = (status: string, score?: number) => {
    if (status === "completed" && score !== undefined) {
      if (score >= 90) return "status-excellent";
      if (score >= 80) return "status-good";
      if (score >= 70) return "status-average";
      return "status-poor";
    }
    return status === "completed" ? "status-completed" : "status-pending";
  };

  const getStatusText = (status: string, score?: number) => {
    if (status === "completed" && score !== undefined) {
      return `${score}%`;
    }
    return status === "completed" ? "Completed" : "Pending";
  };

  const calculateOverallStats = () => {
    const completed = studentSubmissions.filter(
      (s) => s.status === "completed"
    );
    const pending = studentSubmissions.filter((s) => s.status === "pending");
    const averageScore =
      completed.length > 0
        ? completed.reduce((sum, s) => sum + (s.score || 0), 0) /
          completed.length
        : 0;

    return {
      total: studentSubmissions.length,
      completed: completed.length,
      pending: pending.length,
      averageScore: Math.round(averageScore),
    };
  };

  const stats = calculateOverallStats();

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
                <label className="filter-label">Filter by Status:</label>
                <select
                  className="filter-select"
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(
                      e.target.value as "all" | "pending" | "completed"
                    )
                  }
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Sort by:</label>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "date" | "score" | "assignment")
                  }
                >
                  <option value="date">Date</option>
                  <option value="score">Score</option>
                  <option value="assignment">Assignment</option>
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
              {filterStatus === "all"
                ? "You haven't submitted any assignments yet."
                : `No ${filterStatus} submissions found.`}
            </p>
          </div>
        ) : (
          <div className="submissions-list">
            {filteredSubmissions.map((submission) => {
              const assignment = getAssignmentInfo(submission.assignmentId);
              const classroom = assignment
                ? getClassroomInfo(assignment.classroomId)
                : null;

              if (!assignment || !classroom) return null;

              return (
                <Card
                  key={submission.id}
                  title={assignment.title}
                  subtitle={`${classroom.name} • ${classroom.subject}`}
                  className="submission-card"
                >
                  <div className="submission-content">
                    <div className="submission-description">
                      <p className="assignment-description">
                        {assignment.description}
                      </p>
                    </div>

                    <div className="submission-details">
                      <div className="detail-row">
                        <span className="detail-label">Assignment Type:</span>
                        <span
                          className={`assignment-type type-${assignment.type.toLowerCase()}`}
                        >
                          {assignment.type}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Submitted:</span>
                        <span className="detail-value">
                          {submission.submittedAt
                            ? new Date(
                                submission.submittedAt
                              ).toLocaleDateString()
                            : "Not submitted"}
                        </span>
                      </div>

                      <div className="detail-row">
                        <span className="detail-label">Deadline:</span>
                        <span className="detail-value">
                          {new Date(assignment.deadline).toLocaleDateString()}
                        </span>
                      </div>

                      {submission.feedback && (
                        <div className="detail-row">
                          <span className="detail-label">Feedback:</span>
                          <span className="detail-value feedback-text">
                            {submission.feedback}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="submission-footer">
                    <div className="submission-status">
                      <span
                        className={`status-badge ${getStatusColor(
                          submission.status,
                          submission.score
                        )}`}
                      >
                        {getStatusText(submission.status, submission.score)}
                      </span>
                    </div>

                    <div className="submission-actions">
                      {submission.status === "completed" &&
                        submission.score !== undefined && (
                          <div className="score-display">
                            <span className="score-label">Score:</span>
                            <span className="score-value">
                              {submission.score}%
                            </span>
                          </div>
                        )}
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
