#!/usr/bin/env bash
# HITL (Human-in-the-Loop) feedback loop template
# Used by /vt-debug Phase 1, strategy #10 — when no automated loop is possible.
# Copy this file, fill in your steps, and run it to gate manual verification.

set -euo pipefail

STEP_NUM=0

step() {
  STEP_NUM=$((STEP_NUM + 1))
  echo ""
  echo "=== Step ${STEP_NUM}: $1 ==="
  read -rp "Press Enter when done (Ctrl-C to abort)... "
}

assert() {
  local desc="$1"
  shift
  if "$@"; then
    echo "PASS: ${desc}"
  else
    echo "FAIL: ${desc}"
    exit 1
  fi
}

# --- Fill in your steps below ---

# step "Open the app and navigate to the affected page"

# step "Trigger the bug using the reproduction steps"
# assert "Error message appears in the console" grep -q "ERROR" /tmp/app.log

# step "Verify the expected behavior after the fix"
# assert "Response status is 200" curl -sf -o /dev/null http://localhost:3000/api/health

# step "Check for regressions in related functionality"

# --- End of steps ---

echo ""
echo "All steps passed."
