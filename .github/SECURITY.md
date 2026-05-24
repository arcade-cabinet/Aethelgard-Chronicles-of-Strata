# Security Policy

## Supported Versions

The most recent minor release line receives security patches. Earlier
lines are best-effort only.

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| 0.3.x   | :white_check_mark: |
| < 0.3   | :x:                |

## Reporting a Vulnerability

Please **do not open a public issue** for security reports.

Two private channels:

1. **GitHub Security Advisory** (preferred) — open a draft advisory at
   [github.com/jbogaty/Aethelgard-Chronicles-of-Strata/security/advisories/new](https://github.com/jbogaty/Aethelgard-Chronicles-of-Strata/security/advisories/new).
   This gives you an embargo channel + a single thread for the patch
   coordination.

2. **Email** — `jonbogaty@gmail.com` with subject prefix
   `[aethelgard-security]`. PGP key on request.

## Response SLA

- **Acknowledgement** within 72 hours.
- **Triage + severity decision** within 7 days.
- **Patch + coordinated disclosure** within 30 days for HIGH/CRITICAL,
  90 days for MEDIUM, best-effort for LOW.

If you have not received an acknowledgement within 7 days, please
re-send via the alternate channel above — the email filter may have
caught it.

## Scope

In scope:

- Aethelgard web build (GitHub Pages deploy)
- Aethelgard Android APK (debug + future release)
- Any code under `src/` or the published artifact
- CI workflows under `.github/workflows/`

Out of scope:

- Issues in third-party assets (KayKit / Kenney packs) — report
  upstream.
- DoS via brute-force on the locally-running game (the game is
  single-player offline; there is no server).
- Findings that require physical access to an unlocked device.

## What Counts as a Security Issue

The game is offline single-player with no network calls and no
telemetry. Realistic threats include:

- Tampered save files (a rooted Android device modifying SQLite rows)
  that crash the game or escalate privileges.
- Prototype-pollution / RCE via the snapshot deserialise path.
- WebView / Capacitor escape (script in the bundle gaining native
  privileges beyond what the manifest grants).
- Build-time supply-chain (a malicious dependency injecting code into
  the production bundle).

Issues that are NOT security:

- Game-balance exploits (cheesy strategies are gameplay, not bugs).
- Save-game editing for personal use (the game is single-player; you
  may edit your own saves).
- Performance issues that don't crash the game.

## Disclosure Coordination

Once a patch lands we credit reporters in the CHANGELOG entry +
release notes unless you ask for anonymity.
