#!/bin/bash
# Local Deploy Script - Run from development machine
# Usage: ./deploy/deploy-local.sh
#
# Pre-flight checks:
# 1. Ensures all changes are committed
# 2. Pushes to remote
# 3. SSHs to VPS and runs deploy

set -e

VPS_HOST="root@170.64.169.203"
VPS_PATH="/opt/pip"

echo "🔍 Pre-flight checks..."
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "❌ Uncommitted changes detected:"
  git status --short
  echo ""
  read -p "Would you like to commit these changes? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter commit message: " commit_msg
    git add -A
    git commit -m "$commit_msg

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
  else
    echo "❌ Cannot deploy with uncommitted changes. Please commit first."
    exit 1
  fi
fi

# Check for unpushed commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "none")

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "📤 Pushing changes to remote..."
  git push origin main
  echo ""
fi

echo "✅ Local repo is clean and synced"
echo ""

# Deploy to VPS
echo "🚀 Deploying to VPS..."
ssh $VPS_HOST "cd $VPS_PATH && ./deploy/deploy.sh"
