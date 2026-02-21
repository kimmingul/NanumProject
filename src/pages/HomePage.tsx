import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'devextreme-react';
import '@/styles/auth-common.css';
import './HomePage.css';

export default function HomePage(): ReactNode {
  const navigate = useNavigate();

  return (
    <div className="auth-page home-page">
      {/* Decorative elements */}
      <div className="auth-decoration auth-decoration--1" />
      <div className="auth-decoration auth-decoration--2" />

      <div className="home-hero">
        <div className="home-hero-content">
          {/* Badge */}
          <div className="home-badge">
            <span className="home-badge-dot" />
            <span>Built for Modern Teams</span>
          </div>

          {/* Headline */}
          <h1 className="home-headline">
            Your Projects,{' '}
            <span className="home-headline-highlight">Perfectly Organized</span>
          </h1>

          {/* Subtitle */}
          <p className="home-subtitle">
            From planning to completion, stay in control. <br />
            Visual timelines, task boards, real-time collaboration, and secure access for your entire team.
          </p>

          {/* CTA Buttons */}
          <div className="home-cta">
            <Button
              text="Get Started"
              className="primary-cta"
              onClick={() => navigate('/signup')}
            />
            <Button
              text="Sign In"
              className="secondary-cta"
              onClick={() => navigate('/login')}
            />
          </div>

          {/* Features */}
          <div className="home-features">
            <div className="home-feature">
              <div className="home-feature-icon">
                <i className="dx-icon-group" />
              </div>
              <span className="home-feature-text">Multi-Tenancy</span>
            </div>
            <div className="home-feature">
              <div className="home-feature-icon">
                <i className="dx-icon-key" />
              </div>
              <span className="home-feature-text">Role-Based Access</span>
            </div>
            <div className="home-feature">
              <div className="home-feature-icon">
                <i className="dx-icon-lock" />
              </div>
              <span className="home-feature-text">Multi-Factor Auth</span>
            </div>
            <div className="home-feature">
              <div className="home-feature-icon">
                <i className="dx-icon-selectall" />
              </div>
              <span className="home-feature-text">Audit Logs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
