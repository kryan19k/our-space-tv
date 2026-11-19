## What changed and why

## How I tested it

- TV model / firmware (if the change touches the TV):
- [ ] `npx tsc -b`, `npm run lint`, `npm run format:check` pass in `launcher/`
- [ ] I rebuilt `tv/` (`npm run build:site`) if the launcher changed
- [ ] No tokens, IP addresses or personal data in the diff
