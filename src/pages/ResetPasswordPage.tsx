import { type ReactNode, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextBox, Button, ValidationGroup, Validator } from 'devextreme-react';
import { RequiredRule, EmailRule } from 'devextreme-react/validator';
import { supabase } from '@/lib/supabase';
import '@/styles/auth-common.css';
import './ResetPasswordPage.css';

/**
 * Detects if the current URL hash contains a Supabase recovery token.
 */
function isRecoveryCallback(): boolean {
  return window.location.hash.includes('type=recovery');
}

export default function ResetPasswordPage(): ReactNode {
  const navigate = useNavigate();

  const [mode, setMode] = useState<'request' | 'update' | 'loading'>(isRecoveryCallback() ? 'loading' : 'request');
  const [sessionReady, setSessionReady] = useState(false);

  // Request mode state
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Update mode state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Wait for Supabase to process the recovery token from the URL hash
  useEffect(() => {
    if (!isRecoveryCallback()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setSessionReady(true);
        setMode('update');
      } else if (event === 'SIGNED_IN' && session) {
        // Some versions fire SIGNED_IN instead of PASSWORD_RECOVERY
        setSessionReady(true);
        setMode('update');
      }
    });

    // Fallback: check if session is already available (token was fast)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
        setMode('update');
      }
    });

    // Timeout fallback after 10 seconds
    const timeout = setTimeout(() => {
      if (!sessionReady) {
        setMode('update');
        setError('Session may not be ready. Please try requesting a new reset link.');
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);

      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send reset email');
      } finally {
        setLoading(false);
      }
    },
    [email],
  );

  const handleUpdateSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Verify session exists before attempting update
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Recovery session expired. Please request a new reset link.');
        return;
      }

      setLoading(true);
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) throw updateError;

        setUpdateSuccess(true);
        setTimeout(() => navigate('/projects'), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update password');
      } finally {
        setLoading(false);
      }
    },
    [newPassword, confirmPassword, navigate],
  );

  // --- Loading: waiting for recovery session ---
  if (mode === 'loading') {
    return (
      <div className="auth-page reset-password-page">
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
              <h1>Verifying...</h1>
              <p>Processing your recovery link, please wait.</p>
            </div>
            <div className="reset-loading">
              <div className="reset-spinner" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Update password mode ---
  if (mode === 'update') {
    return (
      <div className="auth-page reset-password-page">
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
              <h1>Set New Password</h1>
              <p>Enter your new password below</p>
            </div>

            {updateSuccess ? (
              <div role="status" aria-live="polite" className="auth-success">
                <div className="auth-success-icon" aria-hidden="true">
                  <i className="dx-icon-check" />
                </div>
                <h3>Password Updated!</h3>
                <p>Your password has been changed successfully.</p>
                <p>Redirecting to projects...</p>
              </div>
            ) : (
              <ValidationGroup>
                <form onSubmit={handleUpdateSubmit} className="auth-form">
                  {error && (
                    <div role="alert" aria-live="polite" className="auth-error">
                      <span className="auth-error-icon" aria-hidden="true">
                        <i className="dx-icon-warning" />
                      </span>
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="auth-form-group">
                    <label htmlFor="new-password">New Password</label>
                    <TextBox
                      id="new-password"
                      value={newPassword}
                      onValueChanged={(e) => setNewPassword(e.value)}
                      placeholder="Enter new password (min 6 characters)"
                      stylingMode="outlined"
                      mode="password"
                      disabled={loading}
                    >
                      <Validator>
                        <RequiredRule message="Password is required" />
                      </Validator>
                    </TextBox>
                  </div>

                  <div className="auth-form-group">
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <TextBox
                      id="confirm-password"
                      value={confirmPassword}
                      onValueChanged={(e) => setConfirmPassword(e.value)}
                      placeholder="Confirm new password"
                      stylingMode="outlined"
                      mode="password"
                      disabled={loading}
                    >
                      <Validator>
                        <RequiredRule message="Please confirm your password" />
                      </Validator>
                    </TextBox>
                  </div>

                  <Button
                    text={loading ? 'Updating...' : 'Update Password'}
                    type="default"
                    stylingMode="contained"
                    useSubmitBehavior={true}
                    width="100%"
                    disabled={loading}
                  />

                  <div className="auth-footer">
                    <a href="/reset-password" className="auth-link">
                      Request a new reset link
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

  // --- Request reset email mode ---
  return (
    <div className="auth-page reset-password-page">
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
            <h1>Reset Password</h1>
            <p>Enter your email to receive a password reset link</p>
          </div>

          {success ? (
            <div role="status" aria-live="polite" className="auth-success">
              <div className="auth-success-icon" aria-hidden="true">
                <i className="dx-icon-email" />
              </div>
              <h3>Check your email!</h3>
              <p>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p>Please check your inbox and follow the instructions.</p>
              <a href="/login" className="auth-link reset-back-btn">
                Back to Sign In
              </a>
            </div>
          ) : (
            <ValidationGroup>
              <form onSubmit={handleRequestSubmit} className="auth-form">
                {error && (
                  <div role="alert" aria-live="polite" className="auth-error">
                    <span className="auth-error-icon" aria-hidden="true">
                      <i className="dx-icon-warning" />
                    </span>
                    <span>{error}</span>
                  </div>
                )}

                <div className="auth-form-group">
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

                <div className="auth-footer">
                  <a href="/login" className="auth-link">
                    Back to Sign In
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
