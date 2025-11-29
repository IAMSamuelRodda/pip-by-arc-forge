# Pip - Contributing Guide

> **Purpose**: Workflow guide for documentation updates and progress tracking
> **Lifecycle**: Stable (update when processes change)

**Last Updated**: 2025-11-30

---

## Documentation System

Pip uses a **markdown-based tracking system** instead of GitHub Issues. This keeps all context in the codebase and works well with AI-assisted development.

### Core Documents

| Document | Purpose | Update Frequency |
|----------|---------|------------------|
| `STATUS.md` | Current state, active work, 2-week rolling window | Daily/Weekly |
| `PROGRESS.md` | Detailed task tracking (epics, features, tasks) | On task completion |
| `ISSUES.md` | **Open** bugs, improvements, technical debt, risks | When issues arise |
| `CHANGELOG.md` | Release history + **resolved issues** (append-only) | On issue resolution/releases |
| `ARCHITECTURE.md` | System design, database schema, ADRs | When architecture changes |
| `CLAUDE.md` | AI agent navigation hub (minimal, ~100 lines) | Rarely |

**Key Principle**: ISSUES.md stays lean (open issues only). Resolved issues move to CHANGELOG.md.

### Document Workflow

```
Starting Work:
  1. Check STATUS.md for current state and priorities
  2. Check PROGRESS.md for your task's status
  3. Update task to "in_progress" in PROGRESS.md

During Work:
  - Log blockers/issues in ISSUES.md (open issues only)
  - Update STATUS.md if priorities shift

Completing Work:
  1. Update PROGRESS.md - mark task "complete"
  2. Update STATUS.md - move item to "Recent Achievements"
  3. If unresolved issues remain → log in ISSUES.md
  4. If architecture changed → update ARCHITECTURE.md

Resolving Issues:
  1. Remove resolved issue from ISSUES.md
  2. Add to CHANGELOG.md under current/next version's "Fixed" section
  3. Reference issue ID (e.g., "issue_003: Description")
```

---

## When to Update Each Document

### STATUS.md
Update when:
- Starting a new focus area
- Completing significant work
- Deployment status changes
- Priorities shift

**Structure**:
- Current Focus (what's being worked on NOW)
- Quick Overview (health of each component)
- Deployment Status (what's live)
- Known Issues (summary, details in ISSUES.md)
- Recent Achievements (last 2 weeks)
- Next Steps (prioritized)

### PROGRESS.md
Update when:
- Starting a task (mark `in_progress`)
- Completing a task (mark `complete`)
- Adding new tasks discovered during work
- Blocking issues arise

**Structure**:
- Milestones → Epics → Features → Tasks
- Each task has: ID, description, complexity, status
- Progress changelog at bottom

### ISSUES.md
Update when:
- Bug discovered → add to Open Issues
- Improvement identified → add to Open Issues
- Technical debt noted → add to Technical Debt
- Risk identified → add to Risk Registry
- Spike research needed → add to Spike Tasks
- Issue resolved → **remove from ISSUES.md, add to CHANGELOG.md**

**Structure** (open items only):
- Open Issues (bugs, improvements)
- Flagged Items (needs decomposition)
- Spike Tasks (research needed)
- Technical Debt
- Risk Registry

**Note**: No "Resolved Issues" section. Resolved issues go to CHANGELOG.md.

### ARCHITECTURE.md
Update when:
- New component added
- Database schema changes
- New ADR (Architecture Decision Record)
- Deployment architecture changes
- Technology stack changes

**Structure**:
- System Overview (diagrams)
- Technology Stack
- Database Schema
- Authentication Flow
- ADRs (numbered, dated)
- Deployment Architecture
- Recent Architecture Changes

---

## Git Workflow

### Branch Strategy

```
feature/fix/sync branches
         ↓  (PR only)
      dev branch → staging
         ↓  (PR only - main ONLY accepts PRs from dev)
     main branch → production
```

### Starting Work

```bash
# Always branch from dev (NOT main)
git checkout dev
git pull origin dev
git checkout -b feature/[feature-name]  # or fix/, sync/

# Update PROGRESS.md with task status
```

### Completing Work

```bash
# Commit with descriptive message
git commit -m "[type]: [description]

Closes #[issue-number] (if applicable)"

# Push and create PR targeting dev branch
git push -u origin feature/[feature-name]
gh pr create --base dev --head feature/[feature-name]

# Update PROGRESS.md and STATUS.md
```

### Releasing to Production

```bash
# After staging testing, create dev → main PR
gh pr create --base main --head dev --title "Release v[version]"

# This is the ONLY way to get code into main
```

---

## docs/ Folder Structure

The `docs/` folder contains supporting documentation organized by purpose:

```
docs/
├── research-notes/     # Spike research, technical investigations
│   ├── SPIKE-*.md      # Investigation spikes (time-boxed research)
│   └── PATTERN-*.md    # Reusable patterns discovered
├── samples/            # Sample data for testing/demos
├── archive/            # Old documents (preserved for reference)
└── *.md                # Active documentation
    ├── ADR-*.md        # Architecture Decision Records (detailed)
    └── [topic].md      # Topic-specific deep dives
```

**What belongs in docs/**:
- Spike research notes (SPIKE-*.md)
- Detailed ADRs that don't fit in ARCHITECTURE.md
- Implementation guides
- Integration documentation
- Sample data for testing

**What does NOT belong in docs/**:
- Current status (use STATUS.md)
- Task tracking (use PROGRESS.md)
- Issue tracking (use ISSUES.md)
- Architecture overview (use ARCHITECTURE.md)

---

## Definition of Done

### Feature Development
- [ ] Feature implemented
- [ ] Tested (manual or automated)
- [ ] PROGRESS.md updated (task complete)
- [ ] STATUS.md updated (if significant)
- [ ] ARCHITECTURE.md updated (if design changed)
- [ ] PR merged to dev

### Bug Fixes
- [ ] Root cause documented in ISSUES.md
- [ ] Fix implemented
- [ ] Issue removed from ISSUES.md
- [ ] Fix added to CHANGELOG.md (under "Fixed")
- [ ] PR merged to dev

### Spike/Research
- [ ] Research documented in `docs/research-notes/SPIKE-*.md`
- [ ] Decision recorded (in spike doc or ARCHITECTURE.md ADR)
- [ ] PROGRESS.md updated (spike complete)
- [ ] Related tasks updated with findings

---

## Quick Reference

```bash
# Development
pnpm install
pnpm dev

# Testing
pnpm test

# VPS Deployment
ssh user@vps
cd /opt/pip
git pull
docker compose build
docker compose up -d

# Check health
curl https://app.pip.arcforge.au/health
curl https://mcp.pip.arcforge.au/health
```

---

## Best Practices

1. **Check current state** before starting work (STATUS.md)
2. **Update progress** immediately when completing tasks
3. **Log issues** that you don't solve (ISSUES.md)
4. **Document decisions** in ARCHITECTURE.md ADRs
5. **Keep STATUS.md focused** - archive items older than 2 weeks
6. **Link commits to tasks** - reference task IDs in commit messages

---

## References

- `CLAUDE.md` - Quick navigation for AI agents
- `STATUS.md` - Current state (2-week window)
- `PROGRESS.md` - Detailed task tracking
- `ISSUES.md` - Bugs, improvements, risks
- `ARCHITECTURE.md` - System design and ADRs
- `CHANGELOG.md` - Release history (semantic versioning)
