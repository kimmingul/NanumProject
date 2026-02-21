import { type ReactNode, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextBox, Button, ValidationGroup, Validator } from 'devextreme-react';
import { RequiredRule, EmailRule, StringLengthRule, CompareRule } from 'devextreme-react/validator';
import { useAuth } from '@/hooks';
import '@/styles/auth-common.css';
import './SignUpPage.css';

export default function SignUpPage(): ReactNode {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        await signUp({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        });

        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create account');
      } finally {
        setLoading(false);
      }
    },
    [formData, signUp, navigate],
  );

  const updateField = (field: keyof typeof formData) => (e: { value?: string }) => {
    setFormData((prev) => ({ ...prev, [field]: e.value ?? '' }));
  };

  return (
    <div className="auth-page signup-page">
      {/* Decorative elements */}
      <div className="auth-decoration auth-decoration--1" />
      <div className="auth-decoration auth-decoration--2" />

      <div className="auth-container">
        <div className="auth-card signup-card">
          <div className="auth-header">
            <div className="auth-brand">
              <div className="auth-brand-icon">
                <i className="dx-icon-chart" />
              </div>
              <span className="auth-brand-text">Nanum</span>
            </div>
            <h1>Create Account</h1>
            <p>Join Nanum Project today</p>
          </div>

          {success ? (
            <div role="status" aria-live="polite" className="auth-success">
              <div className="auth-success-icon" aria-hidden="true">
                <i className="dx-icon-check" />
              </div>
              <h3>Account created successfully!</h3>
              <p>Please check your email to verify your account.</p>
              <p>Redirecting to login...</p>
            </div>
          ) : (
            <ValidationGroup>
              <form onSubmit={handleSubmit} className="auth-form" aria-labelledby="signup-heading">
                {error && (
                  <div role="alert" aria-live="polite" className="auth-error">
                    <span className="auth-error-icon" aria-hidden="true">
                      <i className="dx-icon-warning" />
                    </span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="auth-form-group">
                  <label htmlFor="fullName">Full Name</label>
                  <TextBox
                    id="fullName"
                    value={formData.fullName}
                    onValueChanged={updateField('fullName')}
                    placeholder="Enter your full name"
                    stylingMode="outlined"
                    disabled={loading}
                  >
                    <Validator>
                      <RequiredRule message="Full name is required" />
                      <StringLengthRule min={2} message="Name must be at least 2 characters" />
                    </Validator>
                  </TextBox>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="email">Email</label>
                  <TextBox
                    id="email"
                    value={formData.email}
                    onValueChanged={updateField('email')}
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
                    value={formData.password}
                    onValueChanged={updateField('password')}
                    placeholder="Create a password"
                    mode="password"
                    stylingMode="outlined"
                    disabled={loading}
                  >
                    <Validator>
                      <RequiredRule message="Password is required" />
                      <StringLengthRule min={8} message="Password must be at least 8 characters" />
                    </Validator>
                  </TextBox>
                  <small className="auth-form-hint">Minimum 8 characters</small>
                </div>

                <div className="auth-form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <TextBox
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onValueChanged={updateField('confirmPassword')}
                    placeholder="Confirm your password"
                    mode="password"
                    stylingMode="outlined"
                    disabled={loading}
                  >
                    <Validator>
                      <RequiredRule message="Please confirm your password" />
                      <CompareRule comparisonTarget={() => formData.password} message="Passwords do not match" />
                    </Validator>
                  </TextBox>
                </div>

                <Button
                  text={loading ? 'Creating Account...' : 'Sign Up'}
                  type="default"
                  stylingMode="contained"
                  useSubmitBehavior={true}
                  width="100%"
                  disabled={loading}
                />

                <div className="auth-footer">
                  Already have an account?{' '}
                  <a href="/login" className="auth-link">
                    Sign in
                  </a>
                </div>
              </form>
            </ValidationGroup>
          )}
        </div>
      </div>
    </div>
  );
}
