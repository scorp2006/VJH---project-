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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Card from "../components/Card";
import {
  teacherDashboardStats,
  samplePerformanceData,
} from "../data/sampleData";

const TeacherAnalytics: React.FC = () => {
  // Sample analytics data
  const classPerformanceData = [
    {
      name: "Advanced Mathematics",
      averageScore: 87,
      students: 24,
      assignments: 8,
    },
    {
      name: "Computer Science Fundamentals",
      averageScore: 82,
      students: 32,
      assignments: 12,
    },
    {
      name: "Physics Laboratory",
      averageScore: 89,
      students: 18,
      assignments: 6,
    },
  ];

  const monthlyStats = [
    { month: "Jan", students: 45, assignments: 15, submissions: 120 },
    { month: "Feb", students: 52, assignments: 18, submissions: 156 },
    { month: "Mar", students: 68, assignments: 22, submissions: 198 },
    { month: "Apr", students: 74, assignments: 25, submissions: 225 },
  ];

  const assignmentTypeDistribution = [
    { name: "PDF", value: 35, color: "#A47C48" },
    { name: "Quiz", value: 25, color: "#8B6B3A" },
    { name: "Code", value: 20, color: "#6B4E3D" },
    { name: "Text", value: 15, color: "#4B2E05" },
    { name: "Link", value: 5, color: "#2E1A05" },
  ];

  const studentEngagementData = [
    { week: "Week 1", activeStudents: 45, submissions: 28 },
    { week: "Week 2", activeStudents: 52, submissions: 41 },
    { week: "Week 3", activeStudents: 48, submissions: 38 },
    { week: "Week 4", activeStudents: 55, submissions: 47 },
    { week: "Week 5", activeStudents: 62, submissions: 52 },
    { week: "Week 6", activeStudents: 58, submissions: 49 },
  ];

  return (
    <div className="page-content">
      <div className="container">
        <h1 className="page-title mb-6">Analytics Dashboard</h1>

        {/* Overview Cards */}
        <div className="grid grid-4 mb-8">
          <Card title="Total Students" subtitle="Across all classes">
            <div className="stat-number">
              {teacherDashboardStats.totalStudents}
            </div>
          </Card>
          <Card title="Active Classrooms" subtitle="Currently teaching">
            <div className="stat-number">
              {teacherDashboardStats.totalClassrooms}
            </div>
          </Card>
          <Card title="Assignments Created" subtitle="This semester">
            <div className="stat-number">
              {teacherDashboardStats.totalAssignments}
            </div>
          </Card>
          <Card title="Average Performance" subtitle="Class average">
            <div className="stat-number">
              {teacherDashboardStats.averagePerformance}%
            </div>
          </Card>
        </div>

        {/* Class Performance Chart */}
        <div className="grid grid-2 gap-6 mb-8">
          <div className="chart-container">
            <h3 className="chart-title">Class Performance Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classPerformanceData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#A47C48"
                  opacity={0.3}
                />
                <XAxis
                  dataKey="name"
                  stroke="#4B2E05"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#4B2E05" fontSize={12} domain={[70, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#F5E8C7",
                    border: "2px solid #A47C48",
                    borderRadius: "8px",
                    color: "#4B2E05",
                  }}
                />
                <Bar
                  dataKey="averageScore"
                  fill="#A47C48"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="chart-title">Assignment Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={assignmentTypeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {assignmentTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Engagement and Monthly Growth */}
        <div className="grid grid-2 gap-6 mb-8">
          <div className="chart-container">
            <h3 className="chart-title">Student Engagement Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={studentEngagementData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#A47C48"
                  opacity={0.3}
                />
                <XAxis dataKey="week" stroke="#4B2E05" fontSize={12} />
                <YAxis stroke="#4B2E05" fontSize={12} />
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
                  dataKey="activeStudents"
                  stroke="#A47C48"
                  strokeWidth={3}
                  dot={{ fill: "#A47C48", strokeWidth: 2, r: 4 }}
                  name="Active Students"
                />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="#8B6B3A"
                  strokeWidth={3}
                  dot={{ fill: "#8B6B3A", strokeWidth: 2, r: 4 }}
                  name="Submissions"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="chart-title">Monthly Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#A47C48"
                  opacity={0.3}
                />
                <XAxis dataKey="month" stroke="#4B2E05" fontSize={12} />
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
                  dataKey="students"
                  fill="#A47C48"
                  radius={[4, 4, 0, 0]}
                  name="Students"
                />
                <Bar
                  dataKey="assignments"
                  fill="#8B6B3A"
                  radius={[4, 4, 0, 0]}
                  name="Assignments"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Class Details Table */}
        <div className="analytics-table-container">
          <Card
            title="Class Performance Details"
            subtitle="Detailed breakdown by classroom"
          >
            <div className="analytics-table">
              <div className="table-header">
                <div className="table-cell">Class Name</div>
                <div className="table-cell">Students</div>
                <div className="table-cell">Assignments</div>
                <div className="table-cell">Avg Score</div>
                <div className="table-cell">Engagement</div>
              </div>
              {classPerformanceData.map((classData, index) => (
                <div key={index} className="table-row">
                  <div className="table-cell">{classData.name}</div>
                  <div className="table-cell">{classData.students}</div>
                  <div className="table-cell">{classData.assignments}</div>
                  <div className="table-cell">{classData.averageScore}%</div>
                  <div className="table-cell">
                    <div className="engagement-bar">
                      <div
                        className="engagement-fill"
                        style={{ width: `${classData.averageScore}%` }}
                      ></div>
                    </div>
                    <span className="engagement-text">
                      {classData.averageScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;
