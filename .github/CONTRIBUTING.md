# Contributing to Video Conference App

Thank you for considering contributing! Please read these guidelines before opening an issue or submitting a pull request.

---

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. Make your changes, commit with clear messages, and push to your fork.
4. Open a Pull Request against `main`.

---

## Development Setup

### Backend (Spring Boot / Kotlin)

```bash
cd backend
./gradlew bootRun
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

---

## Code Style

- **Backend**: Follow standard Kotlin conventions. Run `./gradlew ktlintCheck` before committing.
- **Frontend**: ESLint is configured. Run `npm run lint` before committing.

---

## Commit Messages

Use concise, imperative commit messages:

```
feat: add screen sharing support
fix: resolve ICE candidate race condition
docs: update WebRTC setup guide
```

---

## Pull Requests

- Keep PRs focused — one feature or fix per PR.
- Fill out the PR template fully, including checking the **CLA checkbox**.
- All CI checks must pass before a PR can be merged.

---

## Contributor License Agreement (CLA)

All contributors must agree to the [Contributor License Agreement](.github/CLA.md) by checking the box in the PR template. This protects both you and the project.

---

## Reporting Issues

Open an issue using the GitHub Issues tab. Include:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Java/Node version)

---

## Code of Conduct

Be respectful and constructive. Harassment or discrimination of any kind will not be tolerated.
