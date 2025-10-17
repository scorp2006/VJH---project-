import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./TopBar.css";

interface TopBarProps {
  title: string;
  userRole: "teacher" | "student";
  userName: string;
}

const TopBar: React.FC<TopBarProps> = ({ title, userRole, userName }) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="topbar">
      <div className="topbar-content">
        <div className="topbar-left">
          <h1 className="topbar-title">{title}</h1>
        </div>
        <div className="topbar-right">
          <div className="topbar-profile">
            <div className="profile-avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="profile-info">
              <span className="profile-name">{userName}</span>
              <span className="profile-role">{userRole}</span>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            style={{ marginLeft: '16px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
