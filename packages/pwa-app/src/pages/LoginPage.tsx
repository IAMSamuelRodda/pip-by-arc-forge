/**
 * Login Page - User authentication
 * Arc Forge dark theme
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-arc-bg-primary font-mono flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-arc-bg-tertiary border border-arc-border rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-arc-accent">P</span>
          </div>
          <h1 className="text-2xl font-medium text-arc-text-primary">Welcome back</h1>
          <p className="text-sm text-arc-text-secondary mt-2">
            Sign in to continue to Pip
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-arc-text-secondary mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-arc-bg-tertiary border border-arc-border rounded-lg px-4 py-3 text-sm text-arc-text-primary placeholder-arc-text-dim focus:outline-none focus:border-arc-accent transition-colors"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-6 bg-arc-accent text-arc-bg-primary rounded-lg py-3 font-medium text-sm hover:bg-arc-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-arc-text-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-arc-accent hover:underline">
            Sign up with invite code
          </Link>
        </p>

        <p className="text-center text-xs text-arc-text-dim mt-4">
          by Arc Forge
        </p>
      </div>
    </div>
  );
}
