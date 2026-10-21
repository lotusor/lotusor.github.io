# Security Policy

## Reporting

Please report suspected vulnerabilities privately through GitHub Security Advisories:

<https://github.com/lotusor/lotusor.github.io/security/advisories/new>

Do not open a public issue for a vulnerability. Do not include real credentials, tokens, or private user data in a report.

## Scope

- XSS or content injection in the static site or admin editor
- PAT / credential leakage paths
- Supply-chain issues in third-party scripts loaded by the site
- Unintended exposure of private drafts or personal data

## Notes

- `admin/` is a local convenience editor. Its passphrase gate is not an authentication boundary; write access requires a fine-grained PAT supplied by the maintainer.
- Drafts are stored in the public `content/posts.json`; they are not confidential.
- If a token is ever committed, rotate it first, then purge the git history and notify GitHub Support.
