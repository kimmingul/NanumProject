import { type ReactNode, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextBox, Button, ValidationGroup, Validator } from 'devextreme-react';
import { RequiredRule, EmailRule, StringLengthRule, CompareRule } from 'devextreme-react/validator';
import { useAuth } from '@/hooks';
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
  }, [formData, signUp, navigate]);

  const updateField = (field: keyof typeof formData) => (e: { value?: string }) => {
    setFormData((prev) => ({ ...prev, [field]: e.value ?? '' }));
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-card">
          <div className="signup-header">
            <h1>Create Account</h1>
            <p>Join NanumAuth today</p>
          </div>

          {success ? (
            <div className="success-message">
              <h3>Account created successfully!</h3>
              <p>Please check your email to verify your account.</p>
              <p>Redirecting to login...</p>
            </div>
          ) : (
            <ValidationGroup>
              <form onSubmit={handleSubmit} className="signup-form">
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="form-group">
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

                <div className="form-group">
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

                <div className="form-group">
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
                  <small className="form-hint">
                    Minimum 8 characters
                  </small>
                </div>

                <div className="form-group">
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
                      <CompareRule 
                        comparisonTarget={() => formData.password}
                        message="Passwords do not match" 
                      />
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

                <div className="login-link">
                  Already have an account?{' '}
                  <a href="/login">Sign in</a>
                </div>
              </form>
            </ValidationGroup>
          )}
        </div>
      </div>
    </div>
  );
}
