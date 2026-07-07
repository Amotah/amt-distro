# Symphonic Release Build

This folder contains a release package built from the PDF:

`symphonic-release-blueprint.json`: machine-readable, up-to-date release configuration and metadata.

## Release Template Usage

This folder contains a generic release module template:

- `symphonic-release-blueprint.json`: a machine-readable, ready-to-use release configuration and metadata template.

## How to use

1. Open `symphonic-release-blueprint.json`.
2. Fill in your actual release data (title, artist, contributors, genre, label, tracks, etc.) in the `releaseTemplate` block.
3. Adjust partner, territory, and availability settings as needed for your release.
4. Use the QA checklist before final submission.

## Next steps

- Integrate this template into your app’s release creation flow for dynamic, user-driven release creation.
- Mirror these fields in your backend schema for persistent storage if needed.
