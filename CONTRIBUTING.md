# QuantumXfer Development Guidelines

## 📋 Overview

This document outlines the development workflow, branching strategy, and contribution guidelines for the QuantumXfer Enterprise project.

---

## 🌿 Branching Strategy

### Branch Types

#### Main Branch
- **`main`** - Production-ready code
- Protected branch with required reviews
- All features must be merged via Pull Request
- CI/CD tests must pass before merge

#### Feature Branches
- **Format**: `feature/issue-{number}-{short-description}`
- **Example**: `feature/issue-85-docker-ssh-test-server`
- One feature branch per GitHub issue
- Created from latest `main` branch
- Deleted after merge

#### Hotfix Branches
- **Format**: `hotfix/issue-{number}-{short-description}`
- **Example**: `hotfix/issue-123-security-patch`
- For critical production fixes
- Created from `main`, merged to `main`

---

## 🔄 Development Workflow

### 1. Start New Work

#### Always sync with latest main
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Create feature branch from latest main
git checkout -b feature/issue-{number}-{description}
```

**❌ DON'T:**
- Create branches from outdated main
- Create branches from other feature branches
- Reuse old feature branches

**✅ DO:**
- Always start from latest main
- Use descriptive branch names
- Include issue number in branch name

### 2. Link to GitHub Issue

#### Every feature branch must have an associated GitHub issue

**Before starting work:**
1. Check if GitHub issue exists
2. If not, create new issue with:
   - Clear title
   - Detailed description
   - Acceptance criteria
   - Priority label (P0, P1, P2)
   - Type label (bug, feature, enhancement, documentation)

**Issue Template:**
```markdown
## Description
Brief description of the feature/fix

## Problem Statement
What problem does this solve?

## Proposed Solution
How will this be implemented?

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests added/updated
- [ ] Documentation updated

## Related Issues
Links to parent/related issues
```

### 3. Development Process

#### Write Code
```bash
# Make changes
# Write tests
# Update documentation
```

#### Commit Frequently
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add SSH connection pooling - Issue #85

- Implemented connection pool with max size
- Added connection reuse logic
- Updated tests for pooling scenarios
- Added documentation for pool configuration

Related: Issue #74"
```

**Commit Message Format:**
```
<Short summary> - Issue #<number>

- Bullet point 1
- Bullet point 2
- Testing information
- Documentation updates

Related: Issue #<parent>, Issue #<related>
```

#### Post Interim Updates to GitHub Issue

**Update frequency:**
- When starting work
- After significant progress
- When blocked or changing approach
- Before creating PR
- After addressing PR feedback

**Update template:**
```markdown
**Status Update (YYYY-MM-DD):**

**Progress:**
- ✅ Completed task 1
- ✅ Completed task 2
- 🔄 In progress: task 3

**Test Results:**
- 42/42 integration tests passing
- Coverage: 90%+
- Performance: 15s total

**Dependencies:**
- Requires Docker Desktop
- Uses ghcr.io/linuxserver/openssh-server:latest

**Changes:**
- Changed approach from Option B to Option C
- Added GitHub Actions workflow
- Updated documentation

**Next Steps:**
- Create PR
- Review CI results
- Merge to main
```

**Example commands:**
```bash
# Quick status update
gh issue comment {number} -b "Started implementation. Created feature branch feature/issue-{number}."

# Progress update
gh issue comment {number} -b "✅ Progress Update:
- SSH server container working
- All 42 tests passing
- Documentation updated
Next: Create PR"

# Blocker update
gh issue comment {number} -b "**Blocker**: Docker not installed. Installing Docker Desktop..."

# Completion update
gh issue comment {number} -b "**✅ Complete**: All tasks done. PR ready for review."
```

### 4. Testing

#### Before committing
```bash
# Run all tests
npm test

# Run integration tests
npm run test:integration:ssh

# Check linting
npm run lint

# Build successfully
npm run build
```

#### Post test results to issue
```bash
gh issue comment {number} -b "**Test Results:**
- Unit tests: 350+ passing
- Integration tests: 42 passing (13.15s)
- Coverage: 90%+
- Build: Success"
```

### 5. Documentation

#### Always update documentation
- **Code changes** → Update inline comments
- **New features** → Update README.md
- **Test changes** → Update TESTING-GUIDE.md
- **API changes** → Update API documentation
- **Configuration** → Update relevant guides

#### Post documentation updates
```bash
gh issue comment {number} -b "**Documentation Updated:**
- README.md: Added testing section
- INTEGRATION-TESTING-GUIDE.md: Created new guide (300+ lines)
- TESTING-GUIDE.md: Added Docker workflow"
```

### 6. Create Pull Request

#### PR Requirements
✅ **Must Have:**
- Associated GitHub issue
- All tests passing locally
- Documentation updated
- Descriptive PR title and description
- Commits properly formatted

#### PR Title Format
```
[Issue #{number}] Brief description of changes
```

**Examples:**
- `[Issue #85] Add Docker-based SSH test server`
- `[Issue #74] Implement integration testing infrastructure`

#### PR Description Template
```markdown
## Related Issue
Closes #85

## Description
Brief description of changes

## Changes Made
- Change 1
- Change 2
- Change 3

## Test Results
- Unit tests: 350+ passing
- Integration tests: 42 passing
- Coverage: 90%+

## Documentation
- [x] README.md updated
- [x] INTEGRATION-TESTING-GUIDE.md created
- [x] Code comments added

## Checklist
- [x] Tests added/updated
- [x] Documentation updated
- [x] Linting passes
- [x] Build succeeds
- [x] CI tests pass
- [x] Issue updated with progress

## Screenshots (if applicable)
Screenshots or output logs
```

#### Create PR
```bash
# Push feature branch
git push origin feature/issue-{number}-{description}

# Create PR via CLI
gh pr create --title "[Issue #{number}] Description" \
  --body-file .github/pull_request_template.md \
  --base main \
  --head feature/issue-{number}-{description}

# Or create via GitHub web interface
```

### 7. Code Review Process

#### As PR Author
- Address all review comments
- Post updates to GitHub issue
- Run tests after changes
- Update PR description if scope changes

#### Post review updates
```bash
gh issue comment {number} -b "**PR Review Update:**
- Addressed all review comments
- Fixed linting issues
- Added requested tests
- Updated documentation
PR ready for re-review"
```

### 8. Merge and Cleanup

#### After PR approval
```bash
# Merge via GitHub (squash and merge preferred)
# Or via CLI
gh pr merge {number} --squash

# Delete feature branch
git branch -d feature/issue-{number}-{description}
git push origin --delete feature/issue-{number}-{description}

# Close issue if not auto-closed
gh issue close {number} -c "Completed in PR #{pr-number}. All acceptance criteria met."
```

#### Sync main
```bash
# Switch to main
git checkout main

# Pull latest (includes your merged PR)
git pull origin main
```

---

## 📊 Issue Management

### Issue Lifecycle

1. **Open** → Issue created with description
2. **In Progress** → Feature branch created, work started
3. **Blocked** → Post blocker to issue with details
4. **Review** → PR created, awaiting review
5. **Merged** → PR merged to main
6. **Closed** → Issue completed

### Issue Updates

#### When to post updates
- ✅ Starting work
- ✅ Significant progress (daily/per milestone)
- ✅ Test results
- ✅ Dependency changes
- ✅ Implementation approach changes
- ✅ Blockers encountered
- ✅ PR created
- ✅ PR review feedback
- ✅ Completion

#### Update categories

**Status Updates:**
```bash
gh issue comment {number} -b "**Status**: Started implementation"
gh issue comment {number} -b "**Status**: 50% complete - SSH server working"
gh issue comment {number} -b "**Status**: Ready for review"
```

**Test Results:**
```bash
gh issue comment {number} -b "**Test Results**:
- Unit: 350+ passing ✅
- Integration: 42 passing ✅
- Coverage: 90%+ ✅"
```

**Dependencies:**
```bash
gh issue comment {number} -b "**Dependencies Added**:
- Docker Desktop required
- ghcr.io/linuxserver/openssh-server:latest"
```

**Implementation Changes:**
```bash
gh issue comment {number} -b "**Implementation Change**:
Changed from Option B (MockSSHServer) to Option C (Docker).
Reason: More realistic testing with real SSH protocol."
```

**Blockers:**
```bash
gh issue comment {number} -b "**⚠️ Blocker**: Docker not installed.
Action: Installing Docker Desktop.
ETA: 30 minutes"
```

---

## 🧪 Testing Requirements

### Before Creating PR

#### Required Tests
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ New tests added for new features
- ✅ Coverage maintained/improved
- ✅ No linting errors
- ✅ Build succeeds

#### Test Commands
```bash
# Quick check
npm test && npm run lint && npm run build

# Full test suite
npm test -- --run
npm run test:integration:ssh
npm run test:coverage
npm run lint
npm run build
```

---

## 📝 Documentation Requirements

### Required Documentation Updates

#### For New Features
- [ ] README.md - Feature description
- [ ] User guide - Usage instructions
- [ ] API documentation - If applicable
- [ ] Code comments - Inline documentation

#### For Bug Fixes
- [ ] CHANGELOG.md - Bug fix noted
- [ ] Documentation - If behavior changed
- [ ] Tests - Regression tests added

#### For Infrastructure Changes
- [ ] Setup guides updated
- [ ] CI/CD documentation updated
- [ ] Deployment guides updated

---

## ✅ Checklist Before PR

### Code Quality
- [ ] Code follows project style guide
- [ ] No console.log or debugging code
- [ ] Error handling implemented
- [ ] Edge cases considered

### Testing
- [ ] All tests passing locally
- [ ] New tests added
- [ ] Integration tests run successfully
- [ ] Coverage maintained/improved

### Documentation
- [ ] README.md updated
- [ ] Code comments added
- [ ] User guides updated
- [ ] API docs updated (if applicable)

### Git
- [ ] Commits properly formatted
- [ ] Branch created from latest main
- [ ] No merge conflicts
- [ ] Feature branch pushed

### GitHub
- [ ] Issue updated with progress
- [ ] PR description complete
- [ ] Linked to issue
- [ ] CI checks passing

---

## 🚫 Common Mistakes to Avoid

### ❌ Don't
- Create branches from outdated main
- Work without associated issue
- Commit without testing
- Skip documentation updates
- Create PR without updating issue
- Merge without review
- Leave stale branches
- Ignore CI failures

### ✅ Do
- Always sync with latest main
- Create issue before starting work
- Test before committing
- Update documentation
- Post interim updates to issue
- Wait for review approval
- Delete merged branches
- Fix CI failures immediately

---

## 📞 Getting Help

### When Stuck
1. Check existing documentation
2. Search closed issues for similar problems
3. Post question as issue comment
4. Ask in team channels

### Resources
- [README.md](README.md) - Project overview
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Testing setup
- [INTEGRATION-TESTING-GUIDE.md](INTEGRATION-TESTING-GUIDE.md) - Integration tests
- [GitHub Issues](https://github.com/shavali-arc/quantumxfer/issues) - Issue tracker

---

## 🔄 Workflow Summary

```
1. Sync main → git checkout main && git pull origin main
2. Create issue → gh issue create
3. Create branch → git checkout -b feature/issue-{number}-{desc}
4. Code + Test → Make changes, run tests
5. Update issue → gh issue comment {number}
6. Commit → git commit -m "Message - Issue #{number}"
7. Push → git push origin feature/issue-{number}-{desc}
8. Create PR → gh pr create
9. Review → Address feedback, update issue
10. Merge → Squash and merge via GitHub
11. Cleanup → Delete branch, close issue
12. Sync main → git pull origin main
```

---

## 📊 Example: Complete Workflow

```bash
# 1. Start fresh
git checkout main
git pull origin main

# 2. Create issue (via web or CLI)
gh issue create --title "Add Redis caching" --body "..."

# 3. Create feature branch
git checkout -b feature/issue-123-redis-caching

# 4. Post start update
gh issue comment 123 -b "Started work. Branch: feature/issue-123-redis-caching"

# 5. Make changes, write tests
# ... code changes ...

# 6. Test
npm test
npm run test:integration:ssh

# 7. Post test results
gh issue comment 123 -b "Tests passing: 42/42 integration, 360+ unit tests"

# 8. Commit
git add .
git commit -m "Add Redis caching - Issue #123

- Implemented Redis connection pool
- Added caching for SSH connections
- Updated tests
- Added documentation"

# 9. Push
git push origin feature/issue-123-redis-caching

# 10. Create PR
gh pr create --title "[Issue #123] Add Redis caching" --base main

# 11. Post PR link to issue
gh issue comment 123 -b "PR created: #125"

# 12. After merge, cleanup
git checkout main
git pull origin main
git branch -d feature/issue-123-redis-caching
gh issue close 123 -c "Completed in PR #125"
```

---

**Last Updated**: December 14, 2025  
**Maintainer**: QuantumXfer Team  
**Version**: 1.0
