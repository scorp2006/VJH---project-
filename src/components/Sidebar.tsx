import React from "react";
import { Link, useLocation } from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import SchoolIcon from '@mui/icons-material/School';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import "./Sidebar.css";

interface SidebarProps {
  userRole: "teacher" | "student";
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();

  const teacherNavItems = [
    { path: "/teacher/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { path: "/teacher/classrooms", label: "My Classrooms", icon: <SchoolIcon /> },
    { path: "/teacher/analytics", label: "Analytics", icon: <BarChartIcon /> },
  ];

  const studentNavItems = [
    { path: "/student/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { path: "/student/classrooms", label: "Joined Classes", icon: <SchoolIcon /> },
    { path: "/student/submissions", label: "Submission History", icon: <AssignmentIcon /> },
  ];

  const navItems = userRole === "teacher" ? teacherNavItems : studentNavItems;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">EduPortal</h2>
        <div className="sidebar-user">
          <span className="sidebar-user-icon"><PersonIcon /></span>
          <span className="sidebar-user-role">{userRole}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={`nav-link ${
                  location.pathname === item.path ? "active" : ""
                }`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
