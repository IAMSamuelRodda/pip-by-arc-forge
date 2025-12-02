/**
 * Settings Page - Safety settings and user preferences
 * Arc Forge dark theme
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, memoryApi } from '../api/client';
import type { ResponseStyleId, ResponseStyleOption, MemoryStatus } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ManageMemoryModal } from '../components/ManageMemoryModal';
import { ProjectsSettingsPanel } from '../components/ProjectsSettingsPanel';

type PermissionLevel = 0 | 1 | 2 | 3;

interface Settings {
  permissionLevel: PermissionLevel;
  responseStyle: ResponseStyleId;
  requireConfirmation: boolean;
  dailyEmailSummary: boolean;
  require2FA: boolean;
  vacationModeUntil?: number;
}

const PERMISSION_LEVELS: { level: PermissionLevel; name: string; description: string; color: string }[] = [
  {
    level: 0,
    name: 'Read-Only',
    description: 'View invoices, reports, and contacts. No changes to Xero data.',
    color: 'text-green-400',
  },
  {
    level: 1,
    name: 'Create Drafts',
    description: 'Create draft invoices and contacts. Drafts require manual approval in Xero.',
    color: 'text-blue-400',
  },
  {
    level: 2,
    name: 'Approve & Update',
    description: 'Approve drafts, update invoices and contacts, record payments.',
    color: 'text-yellow-400',
  },
  {
    level: 3,
    name: 'Full Access',
    description: 'All operations including void and delete. Use with caution.',
    color: 'text-red-400',
  },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Check for #projects hash to auto-expand projects section
  const initialSection = location.hash === '#projects' ? 'projects' : null;
  const [expandedSection, setExpandedSection] = useState<string | null>(initialSection);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [styles, setStyles] = useState<ResponseStyleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Memory state
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // Load settings, styles, and memory on mount
  useEffect(() => {
    loadSettings();
    loadStyles();
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      const result = await memoryApi.getMemory();
      setMemory(result);
    } catch (err) {
      console.error('Failed to load memory:', err);
    }
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.getSettings();
      setSettings(result.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStyles = async () => {
    try {
      const result = await api.getStyles();
      setStyles(result.styles);
    } catch (err) {
      console.error('Failed to load styles:', err);
    }
  };

  const updatePermissionLevel = async (level: PermissionLevel) => {
    if (!settings) return;

    // Confirm if upgrading to higher level
    if (level > settings.permissionLevel) {
      const levelInfo = PERMISSION_LEVELS.find((l) => l.level === level);
      if (!confirm(`Upgrade to "${levelInfo?.name}"?\n\n${levelInfo?.description}\n\nThis grants Pip more access to modify your Xero data.`)) {
        return;
      }
    }

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      const result = await api.updateSettings({ permissionLevel: level });
      setSettings(result.settings);
      setSuccess('Permission level updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateStyle = async (responseStyle: ResponseStyleId) => {
    if (!settings || settings.responseStyle === responseStyle) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      const result = await api.updateSettings({ responseStyle });
      setSettings(result.settings);
      setSuccess(`Style changed to ${result.styleInfo.name}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update style');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen bg-arc-bg-primary font-mono">
      {/* Header */}
      <header className="bg-arc-bg-secondary border-b border-arc-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-arc-text-secondary hover:text-arc-accent transition-colors"
            >
              &larr; Back
            </button>
            <h1 className="text-lg font-semibold text-arc-text-primary">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-arc-text-secondary">
              {user?.name || user?.email?.split('@')[0] || 'User'}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-2 py-1 text-arc-text-dim hover:text-arc-text-secondary transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              &times;
            </button>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-6 bg-green-900/30 border border-green-800 rounded-lg px-4 py-3">
            <p className="text-sm text-green-400">{success}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-2 text-arc-text-secondary">
              <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-arc-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="mt-3 text-sm text-arc-text-secondary">Loading settings...</p>
          </div>
        ) : settings ? (
          <div className="space-y-8">
            {/* Safety Settings Section */}
            <section>
              <h2 className="text-lg font-medium text-arc-text-primary mb-2">Safety Settings</h2>
              <p className="text-sm text-arc-text-secondary mb-6">
                Control what Pip can do with your Xero data. Start with read-only and upgrade as needed.
              </p>

              {/* Permission Level Cards */}
              <div className="space-y-3">
                {PERMISSION_LEVELS.map(({ level, name, description, color }) => {
                  const isSelected = settings.permissionLevel === level;
                  const isHigher = level > settings.permissionLevel;

                  return (
                    <button
                      key={level}
                      onClick={() => updatePermissionLevel(level)}
                      disabled={isSaving}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-arc-accent/10 border-arc-accent'
                          : 'bg-arc-bg-tertiary border-arc-border hover:border-arc-accent/50'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-3">
                          <span className={`font-medium ${isSelected ? 'text-arc-accent' : color}`}>
                            Level {level}: {name}
                          </span>
                          {isSelected && (
                            <span className="text-xs bg-arc-accent text-arc-bg-primary px-2 py-0.5 rounded">
                              Current
                            </span>
                          )}
                          {isHigher && (
                            <span className="text-xs text-arc-text-dim">
                              &uarr; Upgrade
                            </span>
                          )}
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          isSelected ? 'border-arc-accent bg-arc-accent' : 'border-arc-border'
                        }`}>
                          {isSelected && (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-arc-bg-primary text-xs">&#10003;</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-arc-text-secondary">{description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Warning for high permission levels */}
              {settings.permissionLevel >= 2 && (
                <div className="mt-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-4 py-3">
                  <p className="text-sm text-yellow-400">
                    <strong>Warning:</strong> At this permission level, Pip can modify your Xero data.
                    {settings.permissionLevel === 3 && ' This includes voiding invoices and deleting contacts.'}
                    {' '}Always verify Pip&apos;s suggestions before approving changes.
                  </p>
                </div>
              )}
            </section>

            {/* Response Style Section */}
            <section>
              <h2 className="text-lg font-medium text-arc-text-primary mb-2">Response Style</h2>
              <p className="text-sm text-arc-text-secondary mb-4">
                Choose how Pip formats and delivers responses.
              </p>

              {/* Dropdown selector (Claude.ai pattern) */}
              <div className="relative">
                <select
                  value={settings.responseStyle}
                  onChange={(e) => updateStyle(e.target.value as ResponseStyleId)}
                  disabled={isSaving}
                  className={`w-full p-4 rounded-xl border bg-arc-bg-tertiary border-arc-border
                    text-arc-text-primary appearance-none cursor-pointer
                    hover:border-arc-accent/50 focus:border-arc-accent focus:outline-none
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {/* Dropdown arrow */}
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-arc-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Style description */}
              {settings.responseStyle && (
                <p className="mt-3 text-sm text-arc-text-dim">
                  {styles.find(s => s.id === settings.responseStyle)?.description}
                </p>
              )}
            </section>

            {/* Memory Section */}
            <section>
              <h2 className="text-lg font-medium text-arc-text-primary mb-2">Memory</h2>
              <p className="text-sm text-arc-text-secondary mb-6">
                Pip learns about you and your preferences from your conversations.
              </p>

              <button
                onClick={() => setIsMemoryModalOpen(true)}
                className="w-full text-left p-4 rounded-xl bg-arc-bg-tertiary border border-arc-border hover:border-arc-accent/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-arc-text-primary">Manage memory</span>
                    <p className="text-sm text-arc-text-secondary mt-1">
                      {memory?.entityCount
                        ? `${memory.entityCount} memories stored`
                        : 'No memories yet'}
                      {memory?.editCount ? ` · ${memory.editCount} edits` : ''}
                    </p>
                  </div>
                  <span className="text-arc-text-secondary">&rarr;</span>
                </div>
              </button>
            </section>

            {/* Projects Section */}
            <section id="projects">
              <button
                onClick={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
                className="w-full flex items-center justify-between mb-2"
              >
                <h2 className="text-lg font-medium text-arc-text-primary">Projects</h2>
                <svg
                  className={`w-5 h-5 text-arc-text-secondary transition-transform ${
                    expandedSection === 'projects' ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <p className="text-sm text-arc-text-secondary mb-4">
                Organize your conversations by client or context.
              </p>

              {expandedSection === 'projects' && <ProjectsSettingsPanel />}
            </section>

            {/* Info Section */}
            <section className="bg-arc-bg-tertiary border border-arc-border rounded-xl p-6">
              <h3 className="text-sm font-medium text-arc-text-primary mb-3">Why Safety Settings?</h3>
              <div className="space-y-2 text-sm text-arc-text-secondary">
                <p>
                  Xero has <strong className="text-arc-accent">no user-accessible restore</strong>.
                  Deleted or voided data is permanently lost.
                </p>
                <p>
                  These settings ensure Pip can only perform actions you&apos;ve explicitly authorized.
                  Start with read-only and upgrade only when needed.
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-arc-bg-secondary border-t border-arc-border py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-arc-text-dim">
            Pip by Arc Forge &bull; Your data stays in your Xero account
          </p>
        </div>
      </footer>

      {/* Memory Modal */}
      <ManageMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => {
          setIsMemoryModalOpen(false);
          loadMemory(); // Reload memory stats when modal closes
        }}
      />
    </div>
  );
}
