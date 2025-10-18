import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

interface SidebarProps {
  userRole: "teacher" | "student";
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
  const location = useLocation();

  const teacherNavItems = [
    { path: "/teacher/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/teacher/classrooms", label: "My Classrooms", icon: "🏫" },
    { path: "/teacher/analytics", label: "Analytics", icon: "📈" },
  ];

  const studentNavItems = [
    { path: "/student/dashboard", label: "Dashboard", icon: "📊" },
    { path: "/student/classrooms", label: "Joined Classes", icon: "🏫" },
    { path: "/student/submissions", label: "Submission History", icon: "📋" },
  ];

  const navItems = userRole === "teacher" ? teacherNavItems : studentNavItems;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-title">EduPortal</h2>
        <div className="sidebar-user">
          <span className="sidebar-user-icon">👤</span>
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
