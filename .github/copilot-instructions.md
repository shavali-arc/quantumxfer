# GitHub Copilot Instructions for QuantumXfer

## Git Workflow Guidelines

### Branch Strategy
- **NEVER push changes directly to the `main` branch**
- Always create a feature branch for new work
- Branch naming convention: `feature/issue-<number>-<short-description>`
  - Example: `feature/issue-88-fix-e2e-tests`

### Feature Branch Workflow

1. **Before Starting Work:**
   ```bash
   git checkout main
   git pull origin main  # ALWAYS sync with remote main first
   git checkout -b feature/issue-<number>-<description>
   ```
   
   **Important**: Always ensure your local main branch is up to date with the remote main branch before creating a new feature branch.

2. **Create GitHub Issue First:**
   - Every feature branch must have a corresponding GitHub issue
   - Issue should include:
     - Clear problem description
     - Acceptance criteria
     - Proposed solution (if known)
     - Priority label (P0-critical, P1-high, P2-medium)
     - Relevant labels (bug, enhancement, documentation, etc.)
   - **Always assign the issue to @shavali-arc**

3. **Link Branch to Issue:**
   - Reference the issue number in branch name
   - Include issue reference in commit messages: `[Issue #XX] Commit message`

4. **Create Pull Request:**
   - Every feature branch must have a corresponding PR
   - PR title should reference the issue: `[Issue #XX] Brief description`
   - PR description should include:
     - **Project context**: QuantumXfer - SSH File Transfer Client (Electron + React + TypeScript)
     - Summary of changes
     - Closes/Fixes/Resolves #XX reference
     - Testing performed
     - Screenshots/logs if applicable
   - Link PR to the issue
   - **Always assign the PR to @shavali-arc**

5. **Before Merging:**
   - Ensure all CI/CD pipelines pass (CI, Integration Tests, E2E Tests)
   - Request code review if working in a team
   - Squash commits if there are multiple small commits
   - Update documentation if needed

## Coding Guidelines

### Code Quality Standards

1. **Linting and Formatting:**
   - Always run `npm run lint` before committing
   - Fix all ESLint errors (no warnings or errors should remain)
   - Follow TypeScript strict mode rules
   - Use consistent code formatting

2. **Testing Requirements:**
   - Write unit tests for new functions/components
   - Write integration tests for API/service interactions
   - Write E2E tests for user-facing features
   - Ensure all tests pass: `npm test` and `npm run test:e2e`
   - Maintain or improve code coverage

3. **Commit Message Standards:**
   - Format: `[Issue #XX] <type>: <description>`
   - Types: feat, fix, docs, style, refactor, test, chore
   - Examples:
     - `[Issue #88] fix: Remove afterEach hooks from E2E tests`
     - `[Issue #83] feat: Add Playwright E2E testing infrastructure`
     - `[Issue #74] test: Add integration tests for SSH service`

4. **Code Review Checklist:**
   - [ ] Code follows project structure and patterns
   - [ ] No console.log or debug code left behind
   - [ ] Error handling is implemented
   - [ ] Type safety is maintained (no `any` types without justification)
   - [ ] Comments explain "why" not "what"
   - [ ] No hardcoded values (use constants/config)
   - [ ] Security considerations addressed

### TypeScript Standards

1. **Type Safety:**
   - Avoid using `any` type - use proper types or `unknown`
   - Define interfaces for complex objects
   - Use type guards for runtime type checking
   - Leverage TypeScript's strict mode

2. **Naming Conventions:**
   - Components: PascalCase (`ConnectionManager`)
   - Functions/Variables: camelCase (`handleConnection`)
   - Constants: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
   - Interfaces: PascalCase with `I` prefix (`IConnectionConfig`)
   - Types: PascalCase (`ConnectionState`)

3. **File Organization:**
   - One component per file
   - Group related files in directories
   - Use index.ts for clean exports
   - Separate types into `.d.ts` files when shared

### React Best Practices

1. **Component Design:**
   - Keep components small and focused (Single Responsibility)
   - Use functional components with hooks
   - Implement proper prop types
   - Use React.memo for expensive components

2. **State Management:**
   - Use appropriate hooks (useState, useEffect, useCallback, useMemo)
   - Avoid unnecessary re-renders
   - Keep state as local as possible
   - Use context for shared state sparingly

3. **Performance:**
   - Lazy load components when appropriate
   - Optimize expensive computations with useMemo
   - Use useCallback for function props
   - Implement virtualization for long lists

### Electron Best Practices

1. **Security:**
   - Use contextBridge for IPC communication
   - Never expose Node.js APIs directly to renderer
   - Validate all IPC messages
   - Implement CSP (Content Security Policy)

2. **IPC Communication:**
   - Define clear IPC channels
   - Use typed IPC message interfaces
   - Handle errors in both main and renderer
   - Implement timeouts for async operations

3. **Process Separation:**
   - Keep heavy operations in main process
   - Use workers for CPU-intensive tasks
   - Minimize renderer process workload

## Testing Guidelines

### Unit Tests (Vitest)
- Test individual functions and components
- Mock external dependencies
- Aim for 80%+ code coverage
- Use descriptive test names: `should return error when connection fails`

### Integration Tests (Vitest)
- Test service interactions
- Test API endpoints
- Test data flows
- Use realistic test data

### E2E Tests (Playwright)
- Test complete user workflows
- Test critical paths first
- Use page object pattern for complex UIs
- Keep tests independent and isolated
- Clean up after each test

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.spec.ts` in `tests/e2e/`

## CI/CD Guidelines

### Pipeline Requirements
All pipelines must pass before merging:
1. **CI (Lint and Build)** - Linting and TypeScript compilation
2. **Integration Tests** - Service and API tests
3. **E2E Tests** - End-to-end Playwright tests

### Handling Pipeline Failures
1. Never ignore failing tests
2. Fix the root cause, don't skip tests
3. If a test is flaky, investigate and fix it
4. Add issue reference in commits that fix test failures

## Documentation Standards

### Code Documentation
- Document complex logic with comments
- Use JSDoc for public APIs and exported functions
- Keep README.md up to date
- Document breaking changes

### Commit Documentation
- Reference issues in commits
- Explain "why" in commit messages for non-obvious changes
- Update CHANGELOG.md for user-facing changes

### PR Documentation
- Include before/after for UI changes
- Document testing steps
- List any breaking changes
- Update relevant documentation files

## Issue Management

### Issue Creation
- Use descriptive titles with context: `[CI/CD] E2E Tests Failing - Playwright Syntax Error`
- Include problem description, steps to reproduce, expected behavior
- Add relevant labels
- Assign priority (P0-critical, P1-high, P2-medium)
- Assign to yourself or team member

### Issue Updates - Keep Living Documentation
**Issues should serve as living documents that track progress, analysis, and decisions throughout development.**

#### Regular Update Cadence
- **Daily (during active development):** Add brief progress comments
- **Upon discovery:** Document analysis findings, root causes, or blockers
- **Before implementation:** Post solution approach and technical plan
- **After milestones:** Update acceptance criteria completion status
- **On blockers:** Document investigation results and proposed resolution

#### Interim Data to Capture in Issue Comments

1. **Analysis & Investigation**
   ```
   ## Analysis
   - Root Cause: [What caused the issue, findings from investigation]
   - Affected Components: [List affected files/modules]
   - Impact Assessment: [Scope of impact, severity]
   - Dependencies Discovered: [External dependencies, breaking changes]
   - Example: "Found that IPC timeout was hardcoded to 5s, causing issues with large file transfers"
   ```

2. **Root Cause Documentation**
   ```
   ## Root Cause
   - Issue: [Specific problem identified]
   - When: [Under what conditions does it occur]
   - Why: [Underlying reason]
   - Scope: [Percentage of users/features affected]
   - Example: "SSH key import fails with PPK format due to missing format handler in ssh-key-manager.js"
   ```

3. **Solution Architecture**
   ```
   ## Solution Planned
   - Approach: [High-level strategy]
   - Components to Modify: [Files/modules involved]
   - New Interfaces/Types: [TypeScript types to add]
   - Breaking Changes: [Any API changes]
   - Rollback Plan: [How to revert if needed]
   - Example: "Add PPK format handler to ssh-key-manager.js using crypto module for PEM conversion"
   ```

4. **Technical Design Details**
   ```
   ## Implementation Plan
   - Step 1: [Specific task with file references]
   - Step 2: [Next step with expected output]
   - Estimated Effort: [Time estimate]
   - Known Risks: [Potential issues and mitigation]
   - Testing Strategy: [How to validate the fix]
   ```

5. **Progress Tracking**
   ```
   ## Progress
   - [x] Analysis completed
   - [ ] Design review
   - [ ] Implementation started (50% complete)
   - [ ] Testing in progress
   - [ ] Code review pending
   - [ ] Ready for merge
   
   Last Updated: [date] - [brief status]
   ```

6. **Findings & Decisions**
   ```
   ## Key Decisions
   - Decision: [What was chosen and why]
   - Alternatives Considered: [Other options evaluated]
   - Rationale: [Why this is the best approach]
   - Trade-offs: [What we gain/lose]
   ```

#### Comment Guidelines
- Use markdown formatting for readability
- Include code snippets, error messages, or logs when relevant (sanitize sensitive data)
- Reference commit SHAs or file paths for context
- Tag collaborators with @mention when seeking review or input
- Update status in comments instead of editing original description if possible (preserves history)

#### Example Issue Update Flow
```
## Issue #101 - Key Generator Component

### Initial Creation (Dec 20)
[Original requirements and acceptance criteria]

### Dec 20 - Analysis Comment
"Reviewed existing SSH key manager utility. Found that:
- window.electronAPI.sshKeys.generate() is ready
- Need to create React form component with Tailwind styling
- Should follow pattern from existing ProfileEditor component"

### Dec 21 - Design Comment
"Solution Plan:
1. Create src/components/KeyGenerator.tsx
2. Form fields: type selector, bits selector, comment, passphrase
3. Use existing UI patterns from src/components/ProfileEditor.tsx
4. Integrate with window.electronAPI.sshKeys.generate() IPC handler"

### Dec 21 - Progress Comment
"Implementation Progress:
- [x] Component scaffold created
- [x] Form fields implemented
- [ ] Error handling (in progress - 50% complete)
- [ ] Unit tests pending
- Encountered: TypeScript types for key options need refinement"

### Dec 22 - Final Comment
"Implementation complete! Summary:
- Component: src/components/KeyGenerator.tsx (280 lines)
- Tests: 18 unit tests (100% coverage)
- Ready for: Code review in PR #106
- Related files: Types updated in electron.d.ts, Preload API exposed"
```

### Issue Updates - Link to Work Items
- Link feature branches to issues using commit messages: `[Issue #XX]`
- Add PR link to issue when PR is created: "Implemented in PR #YYY"
- Cross-reference related issues: "Related to: Issue #ZZZ"
- Update related issues with blockers or dependencies

### Closing Issues
- Close with PR reference: `Closes #XX` or `Fixes #XX` in PR description
- Verify all acceptance criteria marked complete before closing
- Document final status in closing comment if not obvious from commits
- Archive decision history in issue for future reference

## Project-Specific Guidelines

### QuantumXfer SSH Client
- Always handle SSH errors gracefully
- Implement connection timeouts
- Validate user inputs before SSH operations
- Log errors for debugging but don't expose sensitive data
- Test with various SSH server configurations

### File Transfer Features
- Implement progress indicators for large files
- Support cancellation of transfers
- Handle network interruptions
- Validate file paths and permissions
- Show clear error messages to users

## Quick Reference Commands

```bash
# Start development
npm run dev

# Run linting
npm run lint

# Run tests
npm test                    # Unit & Integration tests
npm run test:e2e            # E2E tests
npm run test:e2e:headed     # E2E with UI

# Build
npm run build

# Create feature branch
git checkout -b feature/issue-XX-description

# Commit with issue reference
git commit -m "[Issue #XX] type: description"

# Push feature branch
git push origin feature/issue-XX-description

# Create PR
gh pr create --title "[Issue #XX] Title" --body "Description"
```

## Important Reminders

⚠️ **NEVER commit directly to main branch**
✅ **ALWAYS create an issue first**
✅ **ALWAYS create a feature branch**
✅ **ALWAYS create a PR before merging**
✅ **ALWAYS ensure all CI/CD pipelines pass**
✅ **ALWAYS run linting before committing**
✅ **ALWAYS write tests for new features**
✅ **ALWAYS reference issues in commits and PRs**

---

**Last Updated:** December 20, 2025
**Maintained By:** QuantumXfer Development Team
