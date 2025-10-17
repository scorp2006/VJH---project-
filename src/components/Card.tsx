import React from "react";

interface CardProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = "",
  onClick,
}) => {
  return (
    <div
      className={`card ${className} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="card-content">{children}</div>}
    </div>
  );
};

export default Card;
