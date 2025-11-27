# Issues Tracking

> **Purpose**: Dynamic issue tracking for bugs, improvements, and technical debt
> **Lifecycle**: Living (update when issues are discovered, resolved, or status changes)

**Last Updated**: 2025-11-27

---

## Status Guide

| Status | Meaning |
|--------|---------|
| 🔴 Open | Issue identified, not yet started |
| 🟡 In Progress | Actively being worked on |
| 🟢 Resolved | Fixed and verified |
| 🔵 Blocked | Cannot proceed due to external factors |

## Priority Guide

| Priority | Meaning |
|----------|---------|
| P0 | Critical - System broken, must fix immediately |
| P1 | High - Significant impact, fix this week |
| P2 | Medium - Should fix, can wait for next sprint |
| P3 | Low - Nice to have, backlog |

---

## Active Issues

### Bugs

None currently.

### Improvements

#### issue_001: PWA Connect Button Loading State
- **Status**: 🔴 Open
- **Priority**: P2
- **Component**: `packages/pwa-app`
- **Description**: Connect to Xero button needs better visual feedback during OAuth flow
- **Acceptance Criteria**:
  - [ ] Loading spinner during redirect
  - [ ] Disable button while connecting
  - [ ] Clear error state display
- **Notes**: Basic implementation exists, needs polish before demo

#### issue_002: Chat Message Timestamps
- **Status**: 🔴 Open
- **Priority**: P3
- **Component**: `packages/pwa-app`
- **Description**: Add timestamps to chat messages for better UX
- **Acceptance Criteria**:
  - [ ] Display relative time (e.g., "2 min ago")
  - [ ] Show full timestamp on hover
  - [ ] Consistent formatting
- **Notes**: Low priority, nice-to-have for demo

### Technical Debt

#### debt_001: No Formal Test Coverage
- **Status**: 🔴 Open
- **Priority**: P2
- **Component**: All packages
- **Description**: Project relies on manual testing only
- **Acceptance Criteria**:
  - [ ] Unit tests for agent-core
  - [ ] Integration tests for Xero client
  - [ ] E2E tests for PWA
- **Notes**: Defer until after user demo validation

---

## Resolved Issues (Last 2 Weeks)

### 2025-11-27

#### issue_fixed_001: Connect to Xero Button Not Navigating
- **Status**: 🟢 Resolved
- **Priority**: P1
- **Resolution**: Changed from `<a href>` to `window.location.href` for proper navigation
- **Commit**: (included in VPS deployment)

#### issue_fixed_002: Docker Network Connectivity
- **Status**: 🟢 Resolved
- **Priority**: P0
- **Resolution**: Added `droplet_frontend` external network to docker-compose.yml
- **Commit**: (included in deployment updates)

---

## Archived Issues

Move resolved issues here after 2 weeks.

---

## References

- **PROGRESS.md**: Project tracking (epics, features, tasks)
- **STATUS.md**: Current work snapshot (2-week rolling window)
- **GitHub Issues**: Legacy (closed) - use this file for active tracking
