/**
 * API Client for Zero Agent backend
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

interface ChatResponse {
  message: string;
  sessionId: string;
  metadata?: {
    tokensUsed?: number;
  };
}

interface AuthStatus {
  connected: boolean;
  expired?: boolean;
  tenantName?: string;
  tenantId?: string;
}

export const api = {
  /**
   * Send a chat message
   */
  async chat(message: string, sessionId?: string): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, sessionId }),
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
    const response = await fetch(`${API_BASE}/auth/status`);
    if (!response.ok) {
      throw new Error('Failed to check auth status');
    }
    return response.json();
  },

  /**
   * Get Xero OAuth URL
   */
  getXeroAuthUrl(): string {
    return `${API_BASE}/auth/xero`;
  },

  /**
   * Check server health
   */
  async health(): Promise<{ status: string; uptime: number }> {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  },
};
