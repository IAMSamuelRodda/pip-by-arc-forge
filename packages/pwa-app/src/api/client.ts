/**
 * API Client for Pip backend
 */

import { useAuthStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

interface ChatResponse {
  message: string;
  sessionId: string;
  metadata?: {
    tokensUsed?: number;
  };
}

// Chat history types
interface ChatSummary {
  sessionId: string;
  projectId?: string | null;
  title: string;
  previewText: string | null;
  messageCount: number;
  createdAt: number;
  updatedAt: number;
  isBookmarked: boolean;
}

interface ChatSession {
  sessionId: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: number;
  updatedAt: number;
}

interface AuthStatus {
  connected: boolean;
  expired?: boolean;
  tenantName?: string;
  tenantId?: string;
}

interface DocumentInfo {
  name: string;
  type: string;
  chunks: number;
  totalChars: number;
}

interface DocumentListItem {
  docName: string;
  docType: string;
  chunkCount: number;
  createdAt: number;
}

// Response styles (Claude.ai pattern)
type ResponseStyleId = 'normal' | 'formal' | 'concise' | 'explanatory' | 'learning';

interface ResponseStyleOption {
  id: ResponseStyleId;
  name: string;
  description: string;
}

interface StyleInfo {
  name: string;
  description: string;
}

// Personalities (deferred feature)
type PersonalityId = 'adelaide' | 'pippin';

interface UserSettings {
  permissionLevel: 0 | 1 | 2 | 3;
  responseStyle: ResponseStyleId;
  requireConfirmation: boolean;
  dailyEmailSummary: boolean;
  require2FA: boolean;
  vacationModeUntil?: number;
  personality: PersonalityId;
}

interface PersonalityInfo {
  name: string;
  description: string;
  greeting: string;
  role: string;
}

interface PersonalityOption {
  id: PersonalityId;
  name: string;
  description: string;
  greeting: string;
}

export const api = {
  /**
   * Send a chat message
   */
  async chat(message: string, sessionId?: string, projectId?: string, model?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ message, sessionId, projectId, model }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.details || error.error || 'Chat request failed');
    }

    return response.json();
  },

  /**
   * Check Xero authentication status
   */
  async getAuthStatus(): Promise<AuthStatus> {
    const response = await fetch(`${API_BASE}/auth/status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to check auth status');
    }
    return response.json();
  },

  /**
   * Get Xero OAuth URL
   * Note: Since this requires auth, we pass token as a query param
   * (The backend will redirect, so we can't use headers)
   */
  getXeroAuthUrl(): string {
    const token = useAuthStore.getState().token;
    if (token) {
      return `${API_BASE}/auth/xero?token=${encodeURIComponent(token)}`;
    }
    return `${API_BASE}/auth/xero`;
  },

  /**
   * Check server health
   */
  async health(): Promise<{ status: string; uptime: number }> {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  },

  /**
   * Upload a business context document
   */
  async uploadDocument(file: File, docType?: string): Promise<{ success: boolean; document: DocumentInfo }> {
    const formData = new FormData();
    formData.append('file', file);
    if (docType) {
      formData.append('docType', docType);
    }

    const response = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Document upload failed');
    }

    return response.json();
  },

  /**
   * List uploaded documents
   */
  async listDocuments(): Promise<{ documents: DocumentListItem[] }> {
    const response = await fetch(`${API_BASE}/api/documents`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to list documents');
    }
    return response.json();
  },

  /**
   * Delete a document
   */
  async deleteDocument(docName: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docName)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete document');
    }
  },

  /**
   * Get available response styles
   */
  async getStyles(): Promise<{ styles: ResponseStyleOption[] }> {
    const response = await fetch(`${API_BASE}/api/settings/styles`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get styles');
    }
    return response.json();
  },

  /**
   * Get available personalities (deferred feature)
   */
  async getPersonalities(): Promise<{ personalities: PersonalityOption[] }> {
    const response = await fetch(`${API_BASE}/api/settings/personalities`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get personalities');
    }
    return response.json();
  },

  /**
   * Get user settings
   */
  async getSettings(): Promise<{ settings: UserSettings; styleInfo: StyleInfo; personalityInfo: PersonalityInfo }> {
    const response = await fetch(`${API_BASE}/api/settings`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get settings');
    }
    return response.json();
  },

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<{ settings: UserSettings; styleInfo: StyleInfo; personalityInfo: PersonalityInfo }> {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(error.error || 'Failed to update settings');
    }
    return response.json();
  },

  // ============================================================================
  // Chat History (Epic 2.2)
  // ============================================================================

  /**
   * List all chat sessions
   */
  async listChats(limit?: number, projectId?: string | null): Promise<{ sessions: ChatSummary[] }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (projectId !== undefined) params.set('projectId', projectId ?? '');
    const queryString = params.toString();
    const response = await fetch(`${API_BASE}/api/sessions${queryString ? `?${queryString}` : ''}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to list chats');
    }
    return response.json();
  },

  /**
   * Get a chat session with messages
   */
  async getChat(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get chat');
    }
    return response.json();
  },

  /**
   * Rename a chat
   */
  async renameChat(sessionId: string, title: string): Promise<{ sessionId: string; title: string }> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      throw new Error('Failed to rename chat');
    }
    return response.json();
  },

  /**
   * Delete a chat
   */
  async deleteChat(sessionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete chat');
    }
    return response.json();
  },

  /**
   * Toggle bookmark status for a chat
   */
  async bookmarkChat(sessionId: string): Promise<{ sessionId: string; isBookmarked: boolean }> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/bookmark`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to bookmark chat');
    }
    return response.json();
  },

  /**
   * Move a chat to a project or remove from project
   * @param projectId - Project ID to move to, or null to remove from project
   */
  async moveToProject(sessionId: string, projectId: string | null): Promise<{ success: boolean; session: { sessionId: string; projectId: string | null } }> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/project`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ projectId }),
    });
    if (!response.ok) {
      throw new Error('Failed to move chat to project');
    }
    return response.json();
  },

  /**
   * Pre-warm Ollama model and wait for completion
   * Call when user selects Ollama to reduce first-message latency
   * @param model - The specific model to warm up (e.g., "deepseek-r1:14b")
   * @returns Promise that resolves when model is loaded, rejects on error
   */
  async warmupOllama(model?: string): Promise<{ success: boolean; model?: string; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/models/ollama/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      return response.json();
    } catch {
      return { success: false, error: 'Failed to warmup model' };
    }
  },

  /**
   * Check Ollama status
   */
  async getOllamaStatus(): Promise<{ available: boolean; models?: string[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/models/ollama/status`);
      return response.json();
    } catch {
      return { available: false, error: 'Failed to check Ollama status' };
    }
  },

  /**
   * Get accessible models for the current user
   * Returns models filtered by user's role, tier, and feature flags
   */
  async getAccessibleModels(): Promise<{
    models: Array<{ id: string; name: string; provider: string }>;
    defaultModelId?: string;
    userTier: string;
    userRole: string;
  }> {
    const response = await fetch(`${API_BASE}/api/chat/models`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get accessible models');
    }
    return response.json();
  },
};

// Memory types
interface MemoryStatus {
  summary: string | null;
  summaryGeneratedAt: number | null;
  isStale: boolean;
  editCount: number;
  entityCount: number;
  observationCount: number;
}

interface MemoryEdit {
  entityName: string;
  observation: string;
  createdAt: number;
}

export const memoryApi = {
  /**
   * Get memory summary and stats
   */
  async getMemory(projectId?: string): Promise<MemoryStatus> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const response = await fetch(`${API_BASE}/api/memory${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get memory');
    }
    return response.json();
  },

  /**
   * Add a user edit (explicit memory request)
   */
  async addEdit(entityName: string, content: string, projectId?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/api/memory/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ entityName, content, projectId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to add edit' }));
      throw new Error(error.error || 'Failed to add memory edit');
    }
    return response.json();
  },

  /**
   * List all user edits
   */
  async getEdits(projectId?: string): Promise<{ edits: MemoryEdit[] }> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const response = await fetch(`${API_BASE}/api/memory/edits${params}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get memory edits');
    }
    return response.json();
  },

  /**
   * Delete a specific user edit
   */
  async deleteEdit(entityName: string, observation: string, projectId?: string): Promise<{ success: boolean }> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const response = await fetch(
      `${API_BASE}/api/memory/edits/${encodeURIComponent(entityName)}/${encodeURIComponent(observation)}${params}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete edit');
    }
    return response.json();
  },

  /**
   * Clear all user edits
   */
  async clearEdits(projectId?: string): Promise<{ success: boolean; deleted: number }> {
    const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    const response = await fetch(`${API_BASE}/api/memory/edits${params}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to clear edits');
    }
    return response.json();
  },

  /**
   * Generate a new summary using Claude
   */
  async generateSummary(projectId?: string): Promise<{
    success: boolean;
    summary: string;
    entityCount: number;
    observationCount: number;
    generatedAt: number;
  }> {
    const response = await fetch(`${API_BASE}/api/memory/summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ projectId }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate summary' }));
      throw new Error(error.error || 'Failed to generate summary');
    }
    return response.json();
  },
};

// Project types (Epic 2.3)
interface Project {
  id: string;
  name: string;
  description?: string;
  xeroTenantId?: string;
  instructions?: string;
  chatCount?: number;
  createdAt: number;
  updatedAt: number;
}

interface CreateProjectInput {
  name: string;
  description?: string;
  xeroTenantId?: string;
}

interface UpdateProjectInput {
  name?: string;
  description?: string;
  xeroTenantId?: string;
  instructions?: string;
}

// Gmail integration types
interface GmailStatus {
  connected: boolean;
  expired?: boolean;
  email?: string;
  expiresAt?: number;
}

export const gmailApi = {
  /**
   * Get Gmail connection status
   */
  async getStatus(): Promise<GmailStatus> {
    const response = await fetch(`${API_BASE}/auth/google/gmail/status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get Gmail status');
    }
    return response.json();
  },

  /**
   * Get Gmail OAuth URL for connecting
   * Since this requires auth and redirects, we pass token as query param
   */
  getConnectUrl(): string {
    const token = useAuthStore.getState().token;
    if (token) {
      return `${API_BASE}/auth/google/gmail?token=${encodeURIComponent(token)}`;
    }
    return `${API_BASE}/auth/google/gmail`;
  },

  /**
   * Disconnect Gmail
   */
  async disconnect(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/auth/google/gmail/disconnect`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect Gmail');
    }
    return response.json();
  },

  /**
   * Refresh Gmail tokens
   */
  async refresh(): Promise<{ success: boolean; expiresAt: number }> {
    const response = await fetch(`${API_BASE}/auth/google/gmail/refresh`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Refresh failed' }));
      throw new Error(error.message || error.error || 'Failed to refresh Gmail tokens');
    }
    return response.json();
  },
};

// Google Sheets integration types
interface SheetsStatus {
  connected: boolean;
  expired?: boolean;
  email?: string;
  expiresAt?: number;
}

export const sheetsApi = {
  /**
   * Get Google Sheets connection status
   */
  async getStatus(): Promise<SheetsStatus> {
    const response = await fetch(`${API_BASE}/auth/google/sheets/status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get Google Sheets status');
    }
    return response.json();
  },

  /**
   * Get Google Sheets OAuth URL for connecting
   */
  getConnectUrl(): string {
    const token = useAuthStore.getState().token;
    if (token) {
      return `${API_BASE}/auth/google/sheets?token=${encodeURIComponent(token)}`;
    }
    return `${API_BASE}/auth/google/sheets`;
  },

  /**
   * Disconnect Google Sheets
   */
  async disconnect(): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/auth/google/sheets/disconnect`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to disconnect Google Sheets');
    }
    return response.json();
  },

  /**
   * Refresh Google Sheets tokens
   */
  async refresh(): Promise<{ success: boolean; expiresAt: number }> {
    const response = await fetch(`${API_BASE}/auth/google/sheets/refresh`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Refresh failed' }));
      throw new Error(error.message || error.error || 'Failed to refresh Google Sheets tokens');
    }
    return response.json();
  },
};

// Connector types and unified API
type ConnectorType = 'xero' | 'gmail' | 'google_sheets';
type PermissionLevel = 0 | 1 | 2 | 3;

interface ConnectorStatus {
  connected: boolean;
  expired?: boolean;
  refreshFailed?: boolean;  // True if auto-refresh failed, needs manual reconnect
  details?: string;
  expiresAt?: number;
}

interface AllConnectorStatuses {
  xero: ConnectorStatus;
  gmail: ConnectorStatus;
  google_sheets: ConnectorStatus;
}

interface ConnectorPermission {
  connector: ConnectorType;
  permissionLevel: PermissionLevel;
  levelName: string;
  availableLevels: Record<number, string>;
  updatedAt?: number;
}

interface AllConnectorPermissions {
  connectorPermissions: Record<ConnectorType, {
    permissionLevel: PermissionLevel;
    levelName: string;
    updatedAt?: number;
  }>;
  availableLevels: Record<ConnectorType, Record<number, string>>;
}

export const connectorApi = {
  /**
   * Get status of all connectors
   */
  async getStatuses(): Promise<AllConnectorStatuses> {
    const response = await fetch(`${API_BASE}/api/connectors/status`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get connector statuses');
    }
    return response.json();
  },

  /**
   * Get permissions for all connectors
   */
  async getPermissions(): Promise<AllConnectorPermissions> {
    const response = await fetch(`${API_BASE}/api/settings/connectors`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get connector permissions');
    }
    return response.json();
  },

  /**
   * Update permission for a specific connector
   */
  async updatePermission(connector: ConnectorType, permissionLevel: PermissionLevel): Promise<ConnectorPermission> {
    const response = await fetch(`${API_BASE}/api/settings/connectors/${connector}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ permissionLevel }),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(error.error || 'Failed to update connector permission');
    }
    return response.json();
  },

  /**
   * Get OAuth URLs for connecting
   */
  getConnectUrl(connector: ConnectorType): string {
    const token = useAuthStore.getState().token;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

    switch (connector) {
      case 'xero':
        return `${API_BASE}/auth/xero${tokenParam}`;
      case 'gmail':
        return `${API_BASE}/auth/google/gmail${tokenParam}`;
      case 'google_sheets':
        return `${API_BASE}/auth/google/sheets${tokenParam}`;
    }
  },

  /**
   * Disconnect a connector
   */
  async disconnect(connector: ConnectorType): Promise<{ success: boolean }> {
    let url: string;
    switch (connector) {
      case 'xero':
        url = `${API_BASE}/auth/disconnect`;
        break;
      case 'gmail':
        url = `${API_BASE}/auth/google/gmail/disconnect`;
        break;
      case 'google_sheets':
        url = `${API_BASE}/auth/google/sheets/disconnect`;
        break;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to disconnect ${connector}`);
    }
    return response.json();
  },
};

export const projectApi = {
  /**
   * List all projects
   */
  async listProjects(): Promise<{ projects: Project[] }> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to list projects');
    }
    return response.json();
  },

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Create failed' }));
      throw new Error(error.error || 'Failed to create project');
    }
    return response.json();
  },

  /**
   * Get a project by ID
   */
  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to get project');
    }
    return response.json();
  },

  /**
   * Update a project
   */
  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Update failed' }));
      throw new Error(error.error || 'Failed to update project');
    }
    return response.json();
  },

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Delete failed' }));
      throw new Error(error.error || 'Failed to delete project');
    }
    return response.json();
  },
};

export type { ResponseStyleId, ResponseStyleOption, StyleInfo, PersonalityId, UserSettings, PersonalityInfo, PersonalityOption, MemoryStatus, MemoryEdit, ChatSummary, ChatSession, Project, CreateProjectInput, UpdateProjectInput, GmailStatus };
