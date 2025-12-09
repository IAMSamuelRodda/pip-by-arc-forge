/**
 * Settings Page - Connector management and user preferences
 * Arc Forge dark theme
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api, memoryApi, connectorApi } from '../api/client';
import type { ResponseStyleId, ResponseStyleOption, MemoryStatus } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ManageMemoryModal } from '../components/ManageMemoryModal';
import { ProjectsSettingsPanel } from '../components/ProjectsSettingsPanel';
import { ConnectorCard, CONNECTOR_ICONS, CONNECTOR_NAMES } from '../components/ConnectorCard';

type PermissionLevel = 0 | 1 | 2 | 3;
type ConnectorType = 'xero' | 'gmail' | 'google_sheets';

interface Settings {
  responseStyle: ResponseStyleId;
  requireConfirmation: boolean;
  dailyEmailSummary: boolean;
  require2FA: boolean;
  vacationModeUntil?: number;
}

interface ConnectorStatus {
  connected: boolean;
  expired?: boolean;
  details?: string;
  expiresAt?: number;
}

interface ConnectorPermission {
  permissionLevel: PermissionLevel;
  levelName: string;
  updatedAt?: number;
}

interface AllConnectorStatuses {
  xero: ConnectorStatus;
  gmail: ConnectorStatus;
  google_sheets: ConnectorStatus;
}

interface AllConnectorPermissions {
  connectorPermissions: Record<ConnectorType, ConnectorPermission>;
  availableLevels: Record<ConnectorType, Record<number, string>>;
}

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

  // Connector state
  const [connectorStatuses, setConnectorStatuses] = useState<AllConnectorStatuses | null>(null);
  const [connectorPermissions, setConnectorPermissions] = useState<AllConnectorPermissions | null>(null);

  // Memory state
  const [memory, setMemory] = useState<MemoryStatus | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // Load settings, styles, connectors, and memory on mount
  useEffect(() => {
    loadSettings();
    loadStyles();
    loadConnectors();
    loadMemory();

    // Check for OAuth callback success
    const params = new URLSearchParams(location.search);
    if (params.get('xero') === 'connected') {
      setSuccess(`Xero connected${params.get('tenant') ? ` to ${params.get('tenant')}` : ''}`);
      setTimeout(() => setSuccess(null), 5000);
      // Reload connectors to show new status
      loadConnectors();
      // Clean URL
      navigate('/settings', { replace: true });
    } else if (params.get('gmail') === 'connected') {
      setSuccess(`Gmail connected${params.get('email') ? ` as ${params.get('email')}` : ''}`);
      setTimeout(() => setSuccess(null), 5000);
      loadConnectors();
      navigate('/settings', { replace: true });
    } else if (params.get('sheets') === 'connected') {
      setSuccess(`Google Sheets connected${params.get('email') ? ` as ${params.get('email')}` : ''}`);
      setTimeout(() => setSuccess(null), 5000);
      loadConnectors();
      navigate('/settings', { replace: true });
    }
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

  const loadConnectors = async () => {
    try {
      const [statuses, permissions] = await Promise.all([
        connectorApi.getStatuses(),
        connectorApi.getPermissions(),
      ]);
      setConnectorStatuses(statuses);
      setConnectorPermissions(permissions);
    } catch (err) {
      console.error('Failed to load connectors:', err);
    }
  };

  const handleConnect = (connector: ConnectorType) => {
    window.location.href = connectorApi.getConnectUrl(connector);
  };

  const handleDisconnect = async (connector: ConnectorType) => {
    try {
      await connectorApi.disconnect(connector);
      setSuccess(`${CONNECTOR_NAMES[connector]} disconnected`);
      setTimeout(() => setSuccess(null), 3000);
      await loadConnectors();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to disconnect ${CONNECTOR_NAMES[connector]}`);
    }
  };

  const handlePermissionChange = async (connector: ConnectorType, level: PermissionLevel) => {
    try {
      await connectorApi.updatePermission(connector, level);
      setSuccess(`${CONNECTOR_NAMES[connector]} permission updated`);
      setTimeout(() => setSuccess(null), 3000);
      await loadConnectors();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to update ${CONNECTOR_NAMES[connector]} permission`);
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
    <div className="flex flex-col min-h-screen bg-arc-bg-primary font-sans">
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
            {/* Connectors Section (Top, expanded by default) */}
            <section>
              <h2 className="text-lg font-medium text-arc-text-primary mb-2">Connectors</h2>
              <p className="text-sm text-arc-text-secondary mb-6">
                Connect services and set permission levels for each.
              </p>

              {connectorStatuses && connectorPermissions ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Xero */}
                  <ConnectorCard
                    connector="xero"
                    displayName={CONNECTOR_NAMES.xero}
                    icon={CONNECTOR_ICONS.xero}
                    status={connectorStatuses.xero}
                    permission={{
                      level: connectorPermissions.connectorPermissions.xero?.permissionLevel ?? 0,
                      levelName: connectorPermissions.connectorPermissions.xero?.levelName ?? 'Read-Only',
                      availableLevels: connectorPermissions.availableLevels.xero ?? {},
                    }}
                    onConnect={() => handleConnect('xero')}
                    onDisconnect={() => handleDisconnect('xero')}
                    onPermissionChange={(level) => handlePermissionChange('xero', level)}
                  />

                  {/* Gmail */}
                  <ConnectorCard
                    connector="gmail"
                    displayName={CONNECTOR_NAMES.gmail}
                    icon={CONNECTOR_ICONS.gmail}
                    status={connectorStatuses.gmail}
                    permission={{
                      level: connectorPermissions.connectorPermissions.gmail?.permissionLevel ?? 0,
                      levelName: connectorPermissions.connectorPermissions.gmail?.levelName ?? 'Read-Only',
                      availableLevels: connectorPermissions.availableLevels.gmail ?? {},
                    }}
                    onConnect={() => handleConnect('gmail')}
                    onDisconnect={() => handleDisconnect('gmail')}
                    onPermissionChange={(level) => handlePermissionChange('gmail', level)}
                  />

                  {/* Google Sheets */}
                  <ConnectorCard
                    connector="google_sheets"
                    displayName={CONNECTOR_NAMES.google_sheets}
                    icon={CONNECTOR_ICONS.google_sheets}
                    status={connectorStatuses.google_sheets}
                    permission={{
                      level: connectorPermissions.connectorPermissions.google_sheets?.permissionLevel ?? 0,
                      levelName: connectorPermissions.connectorPermissions.google_sheets?.levelName ?? 'Read-Only',
                      availableLevels: connectorPermissions.availableLevels.google_sheets ?? {},
                    }}
                    onConnect={() => handleConnect('google_sheets')}
                    onDisconnect={() => handleDisconnect('google_sheets')}
                    onPermissionChange={(level) => handlePermissionChange('google_sheets', level)}
                  />
                </div>
              ) : (
                <div className="text-sm text-arc-text-dim">Loading connectors...</div>
              )}

              {/* Permission warning for connected services with elevated permissions */}
              {connectorStatuses && connectorPermissions && (
                (() => {
                  const hasElevatedPerms =
                    (connectorStatuses.xero.connected && (connectorPermissions.connectorPermissions.xero?.permissionLevel ?? 0) >= 2) ||
                    (connectorStatuses.google_sheets.connected && (connectorPermissions.connectorPermissions.google_sheets?.permissionLevel ?? 0) >= 2);

                  if (hasElevatedPerms) {
                    return (
                      <div className="mt-4 bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-4 py-3">
                        <p className="text-sm text-yellow-400">
                          <strong>Note:</strong> Some connectors have elevated permissions.
                          Always verify Pip&apos;s suggestions before approving changes.
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()
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
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-arc-bg-secondary border-t border-arc-border py-4">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs text-arc-text-dim">
            Pip by Arc Forge &bull; Your data stays in your connected accounts
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
