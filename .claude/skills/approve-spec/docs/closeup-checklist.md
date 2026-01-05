# Epic Close-Up Checklist

This checklist is automatically added as the final task for each epic. It ensures quality, documentation, and pattern extraction before closing.

---

## Checklist Categories

### 1. Verification & Testing

```bash
# Run these commands and verify all pass:
npm test                    # Or: swift test
npm run typecheck          # TypeScript check
npm run lint               # Linting
npm run build              # Build verification
```

**Verify:**
- [ ] All unit tests pass
- [ ] Build succeeds without errors
- [ ] No TypeScript/linting errors
- [ ] Manual smoke test of new functionality
- [ ] Edge cases tested (null, empty, error states)

### 2. Code Review & Refactor

**Code Quality:**
- [ ] No code duplication (extract to shared utilities if found)
- [ ] Consistent patterns with existing codebase
- [ ] No dead code, debug logs, or commented-out code
- [ ] Proper error handling throughout
- [ ] No potential performance issues (N+1 queries, memory leaks)

**Best Practices:**
- [ ] Functions are small and focused
- [ ] Types are properly defined (no `any`)
- [ ] Async operations properly awaited
- [ ] Resources properly cleaned up

### 3. Documentation

**Required Updates:**
- [ ] Update `docs/guides/` if new workflows introduced
- [ ] Add usage examples for new APIs/patterns
- [ ] Update `CLAUDE.md` if workflow changes
- [ ] Document new environment variables or config
- [ ] Update README if user-facing changes

**Code Documentation:**
- [ ] Complex logic has explanatory comments
- [ ] Public APIs have JSDoc/DocC comments
- [ ] Non-obvious decisions documented

### 4. Pattern Extraction

**Identify Reusables:**
- [ ] Extract common patterns to shared services/utilities
- [ ] Update agent prompts with new knowledge (`.claude/agents/`)
- [ ] Add debugging patterns to `.claude/debug-knowledge/`
- [ ] Create templates for new file types (`.claude/templates/`)

**Knowledge Transfer:**
- [ ] Update relevant SME agent prompts if domain knowledge gained
- [ ] Document any workarounds or gotchas discovered

### 5. Integration Check

**Compatibility:**
- [ ] No regressions in existing features
- [ ] Dependencies are up-to-date
- [ ] Backward compatible (or breaking changes documented)
- [ ] Works with all supported platforms/browsers

**Data:**
- [ ] Database migrations tested (up and down)
- [ ] No data loss scenarios
- [ ] Proper data validation in place

### 6. Cleanup

**Remove Temporary Artifacts:**
- [ ] Clean up git worktrees: `git worktree prune`
- [ ] Remove any temporary test files
- [ ] No stray `.md` files in project root
- [ ] Agent output files in correct location (`docs/features/`)

**Dependencies:**
- [ ] Remove unused dependencies from package.json
- [ ] No console.log statements left in production code

### 7. Git Merge & Cleanup

**Auto-Merge Epic Branch:**

```bash
# Ensure epic branch is up to date
git checkout epic/<epic-id>
git pull origin epic/<epic-id>

# Switch to main and pull latest
git checkout main
git pull origin main

# Merge with --no-ff for visibility in history
git merge epic/<epic-id> --no-ff -m "Merge epic/<epic-id>: <epic title>

Completed tasks:
- <task-id>: <title>
- <task-id>: <title>

Closes: <epic-id>"
```

**Conflict Resolution:**

If merge conflicts occur:
1. List conflicting files: `git diff --name-only --diff-filter=U`
2. Display conflict details to user
3. Options:
   - [ ] User resolves manually, then continue merge
   - [ ] Abort merge and keep epic branch open: `git merge --abort`

```bash
# After user resolves conflicts
git add .
git commit -m "Merge epic/<epic-id>: <epic title> (resolved conflicts)"
```

**Push & Cleanup:**

```bash
# Push merged main to remote
git push origin main

# Delete epic branch locally
git branch -d epic/<epic-id>

# Delete epic branch remotely
git push origin --delete epic/<epic-id>

# Prune any remaining worktrees
git worktree prune
```

**Checklist:**
- [ ] Epic branch merged to main with `--no-ff`
- [ ] All conflicts resolved (if any)
- [ ] Changes pushed to origin
- [ ] Epic branch deleted locally
- [ ] Epic branch deleted from remote
- [ ] Worktrees cleaned up

---

## Conditional Checks

### For UI/Frontend Features
- [ ] Accessibility verified (keyboard navigation, screen reader)
- [ ] Responsive design tested
- [ ] Dark mode support (if applicable)
- [ ] Loading states implemented
- [ ] Error states have user-friendly messages

### For API/Backend Features
- [ ] API responses follow established patterns
- [ ] Rate limiting considered
- [ ] Authentication/authorization verified
- [ ] Input validation complete

### For Database Features
- [ ] Indexes added for query performance
- [ ] RLS policies tested (Supabase)
- [ ] Migration is reversible
- [ ] Seed data updated if needed

### For Security-Sensitive Features
- [ ] No secrets in code
- [ ] Proper authentication checks
- [ ] Input sanitization
- [ ] OWASP top 10 considerations

---

## Completion Criteria

**Ready to close epic when:**
1. All verification commands pass
2. No blocking issues in code review
3. Documentation is complete
4. Patterns extracted and documented
5. No integration regressions
6. Cleanup completed
7. Epic branch merged to main and cleaned up

**Report Format:**
```
## Close-Up Report

### Verification
- Tests: PASS (X tests)
- Build: PASS
- Lint: PASS

### Documentation Updated
- docs/guides/feature-name.md
- CLAUDE.md (workflow section)

### Patterns Extracted
- Created shared utility: src/utils/newHelper.ts
- Updated typescript-agent with new pattern

### Issues Found & Resolved
- Fixed: [brief description]

### Ready to Close: YES/NO
```

---

## Agent Instructions

When assigned as `agent:test` for the close-up task:

1. Run all verification commands
2. Review code changes in this epic
3. Check documentation completeness
4. Identify any extractable patterns
5. Perform cleanup
6. Report findings in standard format

**Do NOT:**
- Make code changes (only report issues)
- Skip any checklist items
- Close epic without user confirmation
