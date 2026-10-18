# MITSI frontend

Vue, Quasar, and Pinia application for assessing an IT service's embodied and
operational carbon emissions. Assessments use browser-local storage and versioned
JSON import/export through the assessment store; no backend or `.env` is required.

## Development

Use Node.js 24 and npm. Run `make install` and `make run-frontend` from the repository root.
Quasar prints the development URL, normally <http://localhost:9000>.

## Validation

Run these commands from `frontend/`:

```sh
npm run check          # Formatting, lint, types, then tests
npm run format:check   # Check source formatting without changing files
npm run lint           # Lint source files without applying fixes
npm run typecheck      # Check TypeScript types
npm test              # Run the test suite
npm run format        # Format source files without staging them
```

npm scripts define the checks; Lefthook, Make, and CI call those scripts. Lint and
formatting currently cover `src/`. The pre-commit hook checks formatting, lint, and
types when matching source files are staged. Run `npm run format` and stage the
changes yourself when formatting needs fixing.

## Production builds

```sh
# Root-hosted deployment (Kubernetes/nginx)
npm run build

# GitHub Pages deployment
PUBLIC_PATH=/vps-mitsi/ npm run build
```

Both commands write the SPA to `dist/spa/`. The configured public path also applies
to the EPFL header logo.

The Kubernetes workflow builds this directory using `Dockerfile`, `nginx.conf`,
and `entrypoint.sh`. The entrypoint starts nginx and retains legacy `env.js`
generation; the frontend does not load that file. The GitHub Pages workflow sets
its public path and publishes the built SPA with a fallback HTML page. See the
[root README](../README.md#deployment) for workflow triggers.
