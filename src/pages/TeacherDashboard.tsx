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
  teacherDashboardStats,
  samplePerformanceData,
  classroomPerformanceData,
} from "../data/sampleData";

const TeacherDashboard: React.FC = () => {
  return (
    <div className="page-content">
      <div className="container">
        {/* Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Total Classrooms" subtitle="Active classrooms">
            <div className="stat-number">
              {teacherDashboardStats.totalClassrooms}
            </div>
          </Card>
          <Card title="Total Students" subtitle="Enrolled students">
            <div className="stat-number">
              {teacherDashboardStats.totalStudents}
            </div>
          </Card>
          <Card title="Total Assignments" subtitle="Created assignments">
            <div className="stat-number">
              {teacherDashboardStats.totalAssignments}
            </div>
          </Card>
          <Card title="Average Performance" subtitle="Student performance">
            <div className="stat-number">
              {teacherDashboardStats.averagePerformance}%
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-2 gap-6">
          {/* Performance Trend Chart */}
          <div className="chart-container">
            <h3 className="chart-title">Performance Trend</h3>
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

          {/* Assignment Completion Chart */}
          <div className="chart-container">
            <h3 className="chart-title">Assignment Completion</h3>
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

        {/* Recent Activity */}
        <div className="mt-8">
          <Card title="Recent Activity" subtitle="Latest classroom activities">
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-content">
                  <div className="activity-title">New assignment created</div>
                  <div className="activity-subtitle">
                    Calculus Problem Set 2 - Advanced Mathematics
                  </div>
                  <div className="activity-time">2 hours ago</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">👥</div>
                <div className="activity-content">
                  <div className="activity-title">New student joined</div>
                  <div className="activity-subtitle">
                    Emma Wilson joined Computer Science Fundamentals
                  </div>
                  <div className="activity-time">5 hours ago</div>
                </div>
              </div>
              <div className="activity-item">
                <div className="activity-icon">📊</div>
                <div className="activity-content">
                  <div className="activity-title">Assignment graded</div>
                  <div className="activity-subtitle">
                    Physics Lab Report - 15 submissions graded
                  </div>
                  <div className="activity-time">1 day ago</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
