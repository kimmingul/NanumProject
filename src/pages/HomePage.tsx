import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'devextreme-react';
import './HomePage.css';

export default function HomePage(): ReactNode {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to Nanum Project</h1>
          <p className="subtitle">Clinical Trial Project Management</p>
          <p className="description">
            Comprehensive project management for clinical trials.
            Gantt charts, task boards, team collaboration, and audit logging built-in.
          </p>
          
          <div className="cta-buttons">
            <Button
              text="Get Started"
              type="default"
              stylingMode="contained"
              onClick={() => navigate('/signup')}
              width={160}
            />
            <Button
              text="Sign In"
              type="normal"
              stylingMode="outlined"
              onClick={() => navigate('/login')}
              width={160}
            />
          </div>

          <div className="features">
            <div className="feature">
              <i className="dx-icon-check"></i>
              <span>Multi-Tenancy</span>
            </div>
            <div className="feature">
              <i className="dx-icon-check"></i>
              <span>Role-Based Access Control</span>
            </div>
            <div className="feature">
              <i className="dx-icon-check"></i>
              <span>Multi-Factor Authentication</span>
            </div>
            <div className="feature">
              <i className="dx-icon-check"></i>
              <span>Comprehensive Audit Logs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
