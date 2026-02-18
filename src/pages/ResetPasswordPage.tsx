import { type ReactNode, useState, useCallback } from 'react';
import { TextBox, Button, ValidationGroup, Validator } from 'devextreme-react';
import { RequiredRule, EmailRule } from 'devextreme-react/validator';
import { useAuth } from '@/hooks';
import './ResetPasswordPage.css';

export default function ResetPasswordPage(): ReactNode {
  const { resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword({ email });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }, [email, resetPassword]);

  return (
    <div className="reset-password-page">
      <div className="reset-container">
        <div className="reset-card">
          <div className="reset-header">
            <h1>Reset Password</h1>
            <p>Enter your email to receive a password reset link</p>
          </div>

          {success ? (
            <div className="success-message">
              <h3>Check your email!</h3>
              <p>We've sent a password reset link to <strong>{email}</strong></p>
              <p>Please check your inbox and follow the instructions.</p>
              <a href="/login" className="back-link">
                Back to Sign In
              </a>
            </div>
          ) : (
            <ValidationGroup>
              <form onSubmit={handleSubmit} className="reset-form">
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
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

                <Button
                  text={loading ? 'Sending...' : 'Send Reset Link'}
                  type="default"
                  stylingMode="contained"
                  useSubmitBehavior={true}
                  width="100%"
                  disabled={loading}
                />

                <div className="back-link">
                  <a href="/login">Back to Sign In</a>
                </div>
              </form>
            </ValidationGroup>
          )}
        </div>
      </div>
    </div>
  );
}
