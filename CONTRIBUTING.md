# Contributing

Thanks for helping. Small, focused changes are easiest to review.

## Before you start

- For anything bigger than a bug fix, open an issue first so we can agree on the approach.
- If you are reporting a TV problem, include your TV model, firmware version, and what the remote
  said. Never paste your pairing token, and blank out IP addresses if you prefer.

## Setup

```bash
git clone https://github.com/<you>/our-space-tv
cd our-space-tv/launcher
npm ci
npm run dev
```

The phone remote (`index.html` in the repository root) has no build step. Serve the repository with
any static server (`npx serve .`) and open it on your phone, or open it from a local network
address your phone can reach.

## Checks

Run these in `launcher/` before opening a pull request. CI runs the same:

```bash
npx tsc -b
npm run lint
npm run format:check      # npm run format fixes it
npm run build:site        # rebuilds ../tv; commit the result if the launcher changed
```

## Guidelines

- **No new runtime dependencies** without a clear reason. The launcher ships to a TV with a slow
  browser.
- **No secrets or personal data** in code, tests, docs or screenshots (tokens, IPs, locations,
  calendar links).
- **Test on a real TV** when you touch TV requests, navigation or video. Say which model you used.
- Keep the phone remote dependency-free and in a single file.
- Follow the existing style. Prettier formats the launcher; two-space indentation everywhere.
- Update the docs if behaviour changes.

## Adding an app

Add it to `APPS` in `index.html` with its `NAME_SPACE` and `APP_ID`, and add a logo to
`launcher/public/logos/` if you have one with a compatible licence. Document where the ids came from
in [docs/how-it-works.md](docs/how-it-works.md).

## Pull requests

Describe what changed and why, how you tested it, and on which TV. Keep unrelated cleanups out.
