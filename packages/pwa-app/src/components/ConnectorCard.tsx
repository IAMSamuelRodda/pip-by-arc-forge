/**
 * ConnectorCard - Reusable card for connector management
 *
 * Shows connection status, permission levels, and connect/disconnect actions
 * for each service (Xero, Gmail, Google Sheets).
 */

import { useState } from 'react';

type ConnectorType = 'xero' | 'gmail' | 'google_sheets';
type PermissionLevel = 0 | 1 | 2 | 3;

interface ConnectorStatus {
  connected: boolean;
  expired?: boolean;
  details?: string;
  expiresAt?: number;
}

interface ConnectorCardProps {
  connector: ConnectorType;
  displayName: string;
  icon: React.ReactNode;
  status: ConnectorStatus;
  permission: {
    level: PermissionLevel;
    levelName: string;
    availableLevels: Record<number, string>;
  };
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
  onPermissionChange: (level: PermissionLevel) => Promise<void>;
  disabled?: boolean;
}

// Permission level colors
const LEVEL_COLORS: Record<number, string> = {
  0: 'text-green-400',
  1: 'text-blue-400',
  2: 'text-yellow-400',
  3: 'text-red-400',
};

export function ConnectorCard({
  connector: _connector,
  displayName,
  icon,
  status,
  permission,
  onConnect,
  onDisconnect,
  onPermissionChange,
  disabled = false,
}: ConnectorCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handlePermissionChange = async (newLevel: PermissionLevel) => {
    if (newLevel === permission.level) return;

    // Confirm if upgrading to higher level
    if (newLevel > permission.level) {
      const levelName = permission.availableLevels[newLevel];
      if (!confirm(`Upgrade ${displayName} to "${levelName}"?\n\nThis grants Pip more access to modify your ${displayName} data.`)) {
        return;
      }
    }

    setIsUpdating(true);
    try {
      await onPermissionChange(newLevel);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${displayName}?\n\nYou'll need to reconnect to use ${displayName} features.`)) {
      return;
    }

    setIsDisconnecting(true);
    try {
      await onDisconnect();
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Get unique permission levels (some connectors have duplicate level names)
  const uniqueLevels = Object.entries(permission.availableLevels)
    .reduce((acc, [level, name]) => {
      const existing = acc.find(([, n]) => n === name);
      if (!existing) {
        acc.push([level, name]);
      }
      return acc;
    }, [] as [string, string][]);

  const hasMultipleLevels = uniqueLevels.length > 1;
  const isDisabled = disabled || isUpdating || isDisconnecting;

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        status.connected
          ? 'bg-arc-bg-tertiary border-arc-border'
          : 'bg-arc-bg-secondary border-arc-border/50'
      }`}
    >
      {/* Header: Icon, Name, Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-xl">
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-arc-text-primary">{displayName}</h3>
            {status.connected ? (
              <p className="text-sm text-arc-text-secondary">
                {status.details || 'Connected'}
                {status.expired && (
                  <span className="ml-2 text-yellow-400">(Expired)</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-arc-text-dim">Not connected</p>
            )}
          </div>
        </div>

        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full ${
          status.connected
            ? status.expired
              ? 'bg-yellow-400'
              : 'bg-green-400'
            : 'bg-arc-border'
        }`} />
      </div>

      {/* Content: Permission selector or Connect button */}
      {status.connected ? (
        <div className="space-y-3">
          {/* Permission Level */}
          <div>
            <label className="text-xs text-arc-text-dim mb-1 block">Permission</label>
            {hasMultipleLevels ? (
              <div className="relative">
                <select
                  value={permission.level}
                  onChange={(e) => handlePermissionChange(Number(e.target.value) as PermissionLevel)}
                  disabled={isDisabled}
                  className={`w-full p-2 rounded-lg border bg-arc-bg-primary border-arc-border
                    text-arc-text-primary text-sm appearance-none cursor-pointer
                    hover:border-arc-accent/50 focus:border-arc-accent focus:outline-none
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uniqueLevels.map(([level, name]) => (
                    <option key={level} value={level}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-arc-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            ) : (
              <p className={`text-sm ${LEVEL_COLORS[permission.level] || 'text-arc-text-secondary'}`}>
                {permission.levelName}
              </p>
            )}
          </div>

          {/* Disconnect button */}
          <button
            onClick={handleDisconnect}
            disabled={isDisabled}
            className={`text-sm text-arc-text-dim hover:text-red-400 transition-colors ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        /* Connect button */
        <button
          onClick={onConnect}
          disabled={isDisabled}
          className={`w-full p-2 rounded-lg bg-arc-accent text-arc-bg-primary font-medium text-sm
            hover:bg-arc-accent/90 transition-colors
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Connect {displayName}
        </button>
      )}
    </div>
  );
}

// Connector icons as simple emoji/text - can be replaced with proper SVG icons
export const CONNECTOR_ICONS: Record<ConnectorType, React.ReactNode> = {
  xero: <span style={{ color: '#13B5EA' }}>X</span>,
  gmail: <span style={{ color: '#EA4335' }}>✉</span>,
  google_sheets: <span style={{ color: '#0F9D58' }}>▦</span>,
};

// Display names
export const CONNECTOR_NAMES: Record<ConnectorType, string> = {
  xero: 'Xero',
  gmail: 'Gmail',
  google_sheets: 'Google Sheets',
};
