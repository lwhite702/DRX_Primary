
#!/bin/sh

# Install pre-push hook
HOOK_PATH=".git/hooks/pre-push"
echo "Setting up pre-push hook at $HOOK_PATH..."

cat > "$HOOK_PATH" << 'EOF'
#!/bin/sh

# Get current branch
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

# skip if not main
if [ "$current_branch" != "main" ]; then
  exit 0
fi

# Get list of file changes in outgoing commits
changed_files=$(git diff --name-only origin/main...HEAD)

# Check if code files are changed
code_changed=$(echo "$changed_files" | grep -E "\.(ts|tsx|js|jsx)$")

if [ -n "$code_changed" ]; then
  # If code changed, require package.json or CHANGELOG.md change
  version_changed=$(echo "$changed_files" | grep -E "(package.json|CHANGELOG.md)")
  
  if [ -z "$version_changed" ]; then
    echo "❌ ERROR: You are pushing code changes to main without updating package.json or CHANGELOG.md."
    echo "Please bump the version and update the changelog."
    exit 1
  fi
fi

exit 0
EOF

chmod +x "$HOOK_PATH"
echo "✅ Pre-push hook installed. Pushes to main will now enforce version updates."
