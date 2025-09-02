# Universal AI Agent Workflow & Git Policy (Flutter)

**Purpose:**
- Standardize workflow, commit/push hygiene, and documentation lifecycle for any Flutter app managed by AI agents (Discuss, Analyse, Implement).

---

## 1. Branch & Commit Conventions
- Branch names: `exp/YYYYMMDD-desc`, `refactor/YYYYMMDD-desc`, `feat/YYYYMMDD-desc`, `hotfix/YYYYMMDD-desc`
- Tag/release: `vYYYYMMDD-rcN` or `vMAJOR.MINOR` for stable releases
- Commit messages: `<type>: short summary (note#X)`
  - Types: fix, feat, refactor, docs, chore

---

## 2. Mandatory Git Hygiene
**Final Commit Checklist:**
1. Run `git status` (check for untracked/changed files)
2. Run `git add .` (stage all changes)
3. Run `git commit -m "<message>"`
4. Run `git push origin <branch>`
5. Run `git status` again (verify clean state)
6. Check GitHub online for sync
- Never leave untracked files before a final push
- Always resolve errors before final commit/push (`dart analyze <file>`)

---

## 3. Documentation Lifecycle Policy
- **Pre-Implementation:**
  - Analysis doc, implementation plan, memo, rollback, test strategy
- **During Implementation:**
  - Checkpoint docs, issue log, decision log, test results
- **Post-Implementation:**
  - Archive current plans, delete previous phase docs, update changelog, preserve rollback, clean active docs

---

## 4. File & Cleanup Policy
- Remove empty/placeholder files before final commit/push
- Archive completed phases promptly
- Keep only current phase docs active
- Validate navigation and information integrity

---

## 5. Enforcement & Success Metrics
- All changes must be committed and pushed
- Documentation review is part of code review
- No empty files, broken links, or untracked files allowed
- Archive grows with each phase, active docs trend downward

---

**This workflow is universal for any Flutter app managed by AI agents.**
- Ensures clean repo, clear documentation, and reliable history.
- Add this file to every new project as `/github/copilot/UNIVERSAL_AI_AGENT_WORKFLOW.md`.
