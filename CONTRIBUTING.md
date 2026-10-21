# Contributing

This is a personal static blog. External code contributions are welcome, but content and personal assets are maintained by the owner.

## Before you commit

```bash
python .github/scripts/check_public_repo.py
```

Optional pre-commit hook:

```bash
pip install pre-commit && pre-commit install
```

## Rules

- Do not commit PATs, tokens, `.env` files, server details, private drafts, or personal data that should not be public.
- Drafts are stored in the public `content/posts.json`; treat every draft as public.
- The `admin/` passphrase gate is a convenience guard, not authentication. Writing to GitHub still requires a fine-grained PAT.
- Keep third-party scripts pinned and review supply-chain changes; the admin page can access a locally stored PAT.
- Content and personal images are copyright the author unless stated otherwise.

## Security

Report vulnerabilities privately via [SECURITY.md](SECURITY.md), not a public issue.
