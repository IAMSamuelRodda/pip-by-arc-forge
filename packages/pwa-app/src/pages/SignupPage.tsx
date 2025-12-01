/**
 * Signup Page - Account creation with invite code
 * Arc Forge dark theme
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const signup = useAuthStore((state) => state.signup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, inviteCode, name || undefined);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-arc-bg-primary font-mono flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-arc-bg-primary border-2 border-arc-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-arc-accent font-semibold">P</span>
          </div>
          <h1 className="text-2xl font-medium text-arc-text-primary">Join the beta</h1>
          <p className="text-sm text-arc-text-secondary mt-2">
            Create your account to get started with Pip
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-arc-bg-secondary border border-arc-border rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-arc-text-secondary mb-2">
                Invite Code <span className="text-arc-accent">*</span>
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors tracking-widest"
                placeholder="XXXXXXXX"
                required
                autoFocus
                maxLength={8}
              />
              <p className="text-xs text-arc-text-dim mt-1">
                Required for beta access
              </p>
            </div>

            <div>
              <label className="block text-sm text-arc-text-secondary mb-2">
                Email <span className="text-arc-accent">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-arc-text-secondary mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors"
                placeholder="Your name (optional)"
              />
            </div>

            <div>
              <label className="block text-sm text-arc-text-secondary mb-2">
                Password <span className="text-arc-accent">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors"
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm text-arc-text-secondary mb-2">
                Confirm Password <span className="text-arc-accent">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors"
                placeholder="Confirm your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 bg-arc-accent text-arc-bg-primary rounded-lg py-3 font-medium text-sm hover:bg-arc-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-arc-text-secondary mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-arc-accent hover:underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-arc-text-dim mt-4">
          by Arc Forge
        </p>
      </div>
    </div>
  );
}
