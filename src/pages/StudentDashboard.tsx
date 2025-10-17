import React from "react";
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
import {
  studentDashboardStats,
  samplePerformanceData,
} from "../data/sampleData";

const StudentDashboard: React.FC = () => {
  return (
    <div className="page-content">
      <div className="container">
        {/* Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Classrooms Joined" subtitle="Active enrollments">
            <div className="stat-number">
              {studentDashboardStats.totalClassrooms}
            </div>
          </Card>
          <Card title="Assignments Completed" subtitle="Finished assignments">
            <div className="stat-number">
              {studentDashboardStats.totalAssignments}
            </div>
          </Card>
          <Card title="Average Score" subtitle="Overall performance">
            <div className="stat-number">
              {studentDashboardStats.averagePerformance}%
            </div>
          </Card>
          <Card title="Pending Tasks" subtitle="Assignments to complete">
            <div className="stat-number">3</div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-2 gap-6">
          {/* Performance Trend Chart */}
          <div className="chart-container">
            <h3 className="chart-title">My Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={samplePerformanceData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#A47C48"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  stroke="#4B2E05"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[70, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#F5E8C7",
                    border: "2px solid #A47C48",
                    borderRadius: "8px",
                    color: "#4B2E05",
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#A47C48"
                  strokeWidth={3}
                  dot={{ fill: "#A47C48", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#A47C48", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Assignment Progress Chart */}
          <div className="chart-container">
            <h3 className="chart-title">Assignment Progress</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={samplePerformanceData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#A47C48"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  stroke="#4B2E05"
                  fontSize={12}
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis stroke="#4B2E05" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#F5E8C7",
                    border: "2px solid #A47C48",
                    borderRadius: "8px",
                    color: "#4B2E05",
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString()
                  }
                />
                <Bar
                  dataKey="assignments"
                  fill="#A47C48"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity and Upcoming Assignments */}
        <div className="grid grid-2 gap-6 mt-8">
          {/* Recent Activity */}
          <Card title="Recent Activity" subtitle="Your latest submissions">
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">✅</div>
                <div className="activity-content">
                  <div className="activity-title">Assignment submitted</div>
                  <div className="activity-subtitle">
                    Calculus Problem Set 1 - Score: 85%
                  </div>
                  <div className="activity-time">2 hours ago</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-content">
                  <div className="activity-title">New assignment available</div>
                  <div className="activity-subtitle">
                    Physics Lab Report - Computer Science Fundamentals
                  </div>
                  <div className="activity-time">1 day ago</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">🎯</div>
                <div className="activity-content">
                  <div className="activity-title">Quiz completed</div>
                  <div className="activity-subtitle">
                    Linear Algebra Quiz - Score: 92%
                  </div>
                  <div className="activity-time">3 days ago</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Assignments */}
          <Card title="Upcoming Assignments" subtitle="Due soon">
            <div className="assignment-list">
              <div className="assignment-item">
                <div className="assignment-info">
                  <div className="assignment-title">Programming Project</div>
                  <div className="assignment-class">
                    Computer Science Fundamentals
                  </div>
                </div>
                <div className="assignment-deadline">
                  <span className="deadline-label">Due:</span>
                  <span className="deadline-date">Mar 20, 2024</span>
                </div>
                <div className="assignment-status status-pending">Pending</div>
              </div>
              <div className="assignment-item">
                <div className="assignment-info">
                  <div className="assignment-title">Physics Lab Report</div>
                  <div className="assignment-class">Physics Laboratory</div>
                </div>
                <div className="assignment-deadline">
                  <span className="deadline-label">Due:</span>
                  <span className="deadline-date">Mar 18, 2024</span>
                </div>
                <div className="assignment-status status-pending">Pending</div>
              </div>
              <div className="assignment-item">
                <div className="assignment-info">
                  <div className="assignment-title">Calculus Problem Set 2</div>
                  <div className="assignment-class">Advanced Mathematics</div>
                </div>
                <div className="assignment-deadline">
                  <span className="deadline-label">Due:</span>
                  <span className="deadline-date">Mar 15, 2024</span>
                </div>
                <div className="assignment-status status-overdue">Overdue</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
