# Contributing to FocusFlow

Thanks for helping improve FocusFlow!

## Good contributions
- Bug fixes with a clear reproduction case
- Accessibility and responsive UI improvements
- Tests for task, timer, and analytics behavior
- Documentation improvements

## Before opening a pull request
1. Check existing issues and discuss larger changes first.
2. Fork the repository and create a focused branch.
3. Install dependencies with `npm install`.
4. Run the available checks:
   ```bash
   npm run lint
   npx vitest run
   npm run build
   ```
5. Describe the behavior changed and include screenshots for UI updates.

## Safety and data handling
- Never commit `.env` files, credentials, Supabase service-role keys, or personal data.
- Keep database access protected by Row Level Security.
- Do not weaken authentication or authorization to make a test pass.

## Pull request checklist
- [ ] The change is focused and documented.
- [ ] Relevant tests pass.
- [ ] Guest mode still works where applicable.
- [ ] Authenticated data remains scoped to the signed-in user.
- [ ] No secrets are included.
