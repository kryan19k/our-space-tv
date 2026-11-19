# Security policy

## What to know

Our Space controls a TV on your home network using a pairing token. The token lives in your phone's
browser and on the TV; it is never sent to a web server. Anyone who can read it can control the TV
while they are on your network. See "Privacy and security" in the [README](README.md).

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Use GitHub's private reporting:
**Security → Report a vulnerability** on this repository. Include what you found, how to reproduce
it, and the impact. You will get a reply as soon as the maintainers can.

Examples worth reporting: a way for another website to read the token, script injection through a
setting or news headline, or a way to make the TV open a malicious page without the owner's phone.

## Supported versions

Only the latest `main` is supported.
