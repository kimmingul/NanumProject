import { type ReactNode, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextBox, Button, CheckBox, ValidationGroup, Validator } from 'devextreme-react';
import { RequiredRule, EmailRule } from 'devextreme-react/validator';
import { useAuth } from '@/hooks';
import '@/styles/auth-common.css';
import './LoginPage.css';

export default function LoginPage(): ReactNode {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        await signIn({ email, password });

        // Redirect to original location or dashboard
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid email or password');
      } finally {
        setLoading(false);
      }
    },
    [email, password, signIn, navigate, location],
  );

  return (
    <div className="auth-page login-page">
      {/* Decorative elements */}
      <div className="auth-decoration auth-decoration--1" />
      <div className="auth-decoration auth-decoration--2" />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand">
              <div className="auth-brand-icon">
                <i className="dx-icon-chart" />
              </div>
              <span className="auth-brand-text">Nanum</span>
            </div>
            <h1>Welcome back</h1>
            <p>Sign in to your account to continue</p>
          </div>

          <ValidationGroup>
            <form onSubmit={handleSubmit} className="auth-form" aria-labelledby="login-heading">
              {error && (
                <div role="alert" aria-live="polite" className="auth-error">
                  <span className="auth-error-icon" aria-hidden="true">
                    <i className="dx-icon-warning" />
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <div className="auth-form-group">
                <label htmlFor="email">Email</label>
                <TextBox
                  id="email"
                  value={email}
                  onValueChanged={(e) => setEmail(e.value)}
                  placeholder="Enter your email"
                  stylingMode="outlined"
                  mode="email"
                  disabled={loading}
                >
                  <Validator>
                    <RequiredRule message="Email is required" />
                    <EmailRule message="Invalid email format" />
                  </Validator>
                </TextBox>
              </div>

              <div className="auth-form-group">
                <label htmlFor="password">Password</label>
                <TextBox
                  id="password"
                  value={password}
                  onValueChanged={(e) => setPassword(e.value)}
                  placeholder="Enter your password"
                  mode="password"
                  stylingMode="outlined"
                  disabled={loading}
                >
                  <Validator>
                    <RequiredRule message="Password is required" />
                  </Validator>
                </TextBox>
              </div>

              <div className="auth-options">
                <CheckBox
                  value={rememberMe}
                  onValueChanged={(e) => setRememberMe(e.value)}
                  text="Remember me"
                  disabled={loading}
                />
                <a href="/reset-password" className="auth-link">
                  Forgot password?
                </a>
              </div>

              <Button
                text={loading ? 'Signing in...' : 'Sign In'}
                type="default"
                stylingMode="contained"
                useSubmitBehavior={true}
                width="100%"
                disabled={loading}
              />

              <div className="auth-footer">
                Don't have an account?{' '}
                <a href="/signup" className="auth-link">
                  Sign up
                </a>
              </div>
            </form>
          </ValidationGroup>
        </div>
      </div>
    </div>
  );
}
