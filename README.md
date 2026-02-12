# Prism Tooling – Public Build

This repository is the **public-only** bundle of the Prism design system tooling. It contains the compiled assets that power our GitHub Pages site.

## Workflow
1. When we want to release an update, we run this export script from the private GitLab repository:
   ```bash
   pnpm run build
   node scripts/deploy-to-github.mjs \
     --remote https://github.com/OTA-Insight/prism-tooling \
     --branch main \
     --force
   ```
   The deploy script copies the freshly built `dist/` folder into a temporary directory, initializes a clean Git repo, commits the contents, and pushes them here.
2. GitHub Pages is configured to serve this repo’s `main` branch, so every push immediately updates the public documentation site.

## What’s Included
- Static HTML pages (`index.html`, `pages/**`)
- JavaScript bundles for the palette and token tools (`js/**`)
- Styles and fonts (`styles/**`, `vendor/prism-foundation/**`)
- Pre-built design tokens/illustrations/icons required by the tooling
- `.nojekyll` sentinel so GitHub Pages serves files verbatim

If you need to change any functionality or regenerate assets, make the edits in the private repository, run the build, and re-run the deploy script above. Do **not** edit files directly in this repo, as they’ll be overwritten on the next deployment.
