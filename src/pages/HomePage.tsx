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
          <h1>Welcome to NanumProject</h1>
          <p className="subtitle">Gantt-based Project Management</p>
          <p className="description">
            Plan, track, and manage projects with a Gantt timeline.
            TeamGantt 데이터를 마이그레이션하여 프로젝트/태스크/멤버를 한 곳에서 운영합니다.
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
