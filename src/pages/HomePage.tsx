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
          <h1>Welcome to NanumAuth</h1>
          <p className="subtitle">Enterprise-grade Identity as a Service</p>
          <p className="description">
            Secure authentication and authorization for your applications.
            Multi-tenant, RBAC, MFA, and comprehensive audit logging built-in.
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
