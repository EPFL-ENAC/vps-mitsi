# MITSI frontend

Vue, Quasar, and Pinia application for assessing an IT service's embodied and
operational carbon emissions. Assessments use browser-local storage and versioned
JSON import/export through the assessment store; no backend or `.env` is required.

## Development

Use Node.js 24 and npm. From this directory:

```sh
npm install
npm run dev
```

Alternatively, run `make install` and `make run-frontend` from the repository root.
Quasar prints the development URL, normally <http://localhost:9000>.

## Validation

```sh
npm test
npm run typecheck
npm run lint
```

To check formatting without modifying or staging files:

```sh
npx --no -- prettier --check "src/**/*.{ts,vue,scss}" --ignore-path .gitignore
```

`npm run format` invokes the existing Lefthook command, which rewrites and stages
matching files. Use it only when those changes are intended.

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
