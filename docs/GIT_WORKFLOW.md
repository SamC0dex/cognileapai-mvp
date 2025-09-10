# Git Workflow

This workflow minimizes friction and keeps work reviewable.

## One-Time Setup
- git init
- git remote add origin <your-repo-url>
- git config user.name "Your Name"
- git config user.email "you@example.com"

## Per Phase
1) Create branch: git checkout -b feature/phase-<n>-<name>
2) Work and commit often: git add -A && git commit -m "feat: <message>"
3) Push: git push -u origin feature/phase-<n>-<name>
4) Open PR on GitHub. Use the template (see .github/pull_request_template.md).
5) After review, squash merge.

## Useful Commands
- Show status: git status
- Show recent commits: git --no-pager log --oneline -n 15
- See diff: git --no-pager diff
- Undo last commit (keep changes): git reset --soft HEAD~1

## Branch Naming
- feature/<task>
- fix/<task>
- chore/<task>

## Commit Style
- Conventional commits (feat, fix, chore, refactor, docs, test)

