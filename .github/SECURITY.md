# Security Policy

## Supported Versions

We patch security issues in the latest release only.

| Version | Supported |
|---------|-----------|
| latest  | ✅ |
| older   | ❌ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please email a description of the issue, steps to reproduce, and potential impact to the maintainers. We will acknowledge receipt within 48 hours and aim to release a patch within 7 days for critical issues.

## Scope

gstack Studio is a local desktop application. It:
- Stores API keys in `~/.gstack/studio-config.json` (local filesystem only, never transmitted)
- Communicates with the gstack browse daemon on `localhost` only
- Does not make outbound network requests except to `localhost`

Issues related to local privilege escalation, config file exposure, or IPC injection are in scope.
