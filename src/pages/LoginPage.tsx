import { type ReactNode, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextBox, Button, CheckBox, ValidationGroup, Validator } from 'devextreme-react';
import { RequiredRule, EmailRule } from 'devextreme-react/validator';
import { useAuth } from '@/hooks';
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [email, password, signIn, navigate, location]);

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>NanumAuth</h1>
            <p>Sign in to your account</p>
          </div>

          <ValidationGroup>
            <form onSubmit={handleSubmit} className="login-form">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-options">
                <CheckBox
                  value={rememberMe}
                  onValueChanged={(e) => setRememberMe(e.value)}
                  text="Remember me"
                  disabled={loading}
                />
                <a href="/reset-password" className="forgot-password">
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

              <div className="signup-link">
                Don't have an account?{' '}
                <a href="/signup">Sign up</a>
              </div>
            </form>
          </ValidationGroup>
        </div>
      </div>
    </div>
  );
}
