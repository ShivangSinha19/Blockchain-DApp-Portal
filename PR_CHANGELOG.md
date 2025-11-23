PR: Clean and polish static front-end, centralize styles, archive duplicates

Summary
-------
This PR cleans up the static front-end for the Decentralized Application For Counterfeit Product Detection demo. The changes focus on UI polish, accessibility, and removing duplicate top-level assets.

Key changes
- Replaced the landing welcome block with a 3-card landing UI (Manufacturer / Seller / Consumer) in `src/index.html`.
- Centralized previously inline/fragmented CSS into `src/css/style.css`. Added hover states and transitions for landing cards and QR-reader boxes.
- Replaced inline QR-reader sizing with a `.qr-box` class and added ARIA attributes and `aria-live` for scanner results.
- Fixed multiple `label for` mismatches (example: `src/addProduct.html`).
- Upgraded Font Awesome references and updated icons where applicable.
- Removed the phrase `<span>through Blockchain</span>` across multiple pages.
- Archival and cleanup:
  - Created `src/archive/removed-assets/` placeholders and moved top-level duplicated assets into an `original-top-level` subfolder.
  - Permanently removed the archived originals from `original-top-level` as requested.
- Documentation: Added repo root `README.md` with preview instructions.

Files added/edited (high level)
- Edited: `src/index.html`, `src/css/style.css`, `src/addProduct.html`, and a number of other HTML pages (accessibility fixes and icon updates).
- Added: `README.md` (repo root), `PR_CHANGELOG.md` (this file).
- Helpers (created, then removed during clean-up): `src/archivize_duplicates.ps1`, `src/run-archivize.bat` (removed).

Testing guidance
- Start a local server and manually spot-check pages:
  - `python -m http.server 8000` (or run `src/serve.bat`) from the `src/` folder.
  - Visit `index.html`, `addProduct.html`, and `verifyProducts.html`.
- Run the included lightweight checker script for link integrity and basic accessibility with Python 3:
  - `python tools/site_checker.py` (run from repo root)

Notes
- Canonical JS/CSS are located under `src/js/` and `src/css/`. Top-level duplicates were removed to reduce confusion.
- If you want the archived originals restored, they were permanently deleted per your directive; I can reconstruct replacements from canonical files if needed.

Suggested PR title
------------------
Refactor: centralize styles, improve landing UI, fix accessibility, archive duplicates

Suggested PR description
------------------------
See summary above. The branch centralizes CSS, polishes UI, and removes duplicate top-level assets. Reviewers should test the main pages and confirm the QR-reader flows and forms still function as expected.
