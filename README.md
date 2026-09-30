# MITSI

MITSI is a browser-based tool for assessing the carbon footprint of an IT service.
It combines the assessment scope, hardware inventory, and energy consumption to
estimate embodied and operational emissions.

## Local development

Use Node.js 24, npm, and Make. No backend or environment file is required.

```sh
git clone git@github.com:EPFL-ENAC/vps-mitsi.git
cd vps-mitsi
make install
make run-frontend
```

Open the URL printed by Quasar, normally <http://localhost:9000>.

Assessments are saved in this browser's local storage using **Save**. The store also
supports versioned JSON import/export for backups and transfers; drafts are not
sent to a backend.

## Checks and builds

Run these commands from `frontend/`:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

The production SPA is written to `frontend/dist/spa/`. See the
[frontend README](frontend/README.md) for formatting and deployment details.

## Deployment

- **Kubernetes:** `.github/workflows/deploy.yml` uses the EPFL ENAC reusable
  deployment workflow on pushes to `dev` and `stage` and version tags matching
  `v*.*.*`. It builds the `frontend/` Docker context and serves the SPA with nginx.
  The Dockerfile, nginx configuration, and executable entrypoint remain part of
  this deployment. The entrypoint still generates a legacy `env.js`, which MITSI
  does not load or require.
- **GitHub Pages:** `.github/workflows/pages.yml` builds on pushes to `main` or
  manual dispatch, with `PUBLIC_PATH=/vps-mitsi/`, and publishes `frontend/dist/spa/`.
