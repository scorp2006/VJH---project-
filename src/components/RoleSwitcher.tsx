import React from "react";

interface RoleSwitcherProps {
  currentRole: "teacher" | "student";
  onRoleChange: (role: "teacher" | "student") => void;
}

const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentRole,
  onRoleChange,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: "10px",
        right: "10px",
        zIndex: 1000,
        background: "white",
        padding: "8px",
        borderRadius: "4px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        border: "1px solid #ddd",
      }}
    >
      <button
        onClick={() =>
          onRoleChange(currentRole === "teacher" ? "student" : "teacher")
        }
        style={{
          padding: "6px 12px",
          border: "none",
          borderRadius: "4px",
          background: currentRole === "teacher" ? "#007bff" : "#28a745",
          color: "white",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        Switch to {currentRole === "teacher" ? "Student" : "Teacher"}
      </button>
    </div>
  );
};

export default RoleSwitcher;
