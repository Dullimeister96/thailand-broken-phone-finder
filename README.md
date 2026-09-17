# Thailand Broken Phone Finder

A responsive, Thai-language dashboard for reviewing used and broken phones in Thailand. Plain HTML, CSS and JavaScript; no build step, database, external UI dependencies, or backend. Dark styling with automatic light mode based on the device setting.

The initial release includes 16 **fictional** listings from 5 example source websites. Prices are illustrative, sellers are invented, images are local placeholders, and `example.com` links are deliberately not real advertisements. No scraping or scheduled searches are implemented.

## Structure

```text
index.html             Thai dashboard and accessible detail dialog
css/style.css          Responsive layout and device-aware color themes
js/app.js              Rendering, filters, refresh and detail interaction
js/data.js             Data loading, validation and pure filter/sort logic
data/listings.json     Independently replaceable snapshot
assets/                Local demo image and favicon
.nojekyll              Serve the static files without Jekyll processing
```

## Run locally

From this directory, run `python3 -m http.server 8080` (Windows: `py -m http.server 8080`) and open http://localhost:8080. Use an HTTP server: opening `index.html` with `file://` prevents normal JSON fetching in browsers.

## Data contract

`data/listings.json` is a JSON object with:

- `schemaVersion`: currently `1`.
- `isDemo`: `true` for demonstration snapshots; set `false` with real data.
- `updatedAt`: ISO 8601 timestamp with a timezone for the entire snapshot.
- `listings`: array of listing objects.

Each listing requires a stable unique `id`, `title`, `brand`, `model`, numeric nonnegative `price`, `currency: "THB"`, `condition`, `description`, `location`, `source`, ISO 8601 `discoveredAt` and `lastCheckedAt`, boolean `isNew`, and `status` (`active`, `sold`, or `removed`). Supported brands and condition keys are defined in `js/data.js`. All eight requested condition types are included. Display labels are Thai.

Optional display fields: `url`, `image`, `imageIsPlaceholder`, `seller`, `fullDescription`, `defect`, `notes`, and ISO 8601 `publishedAt`. Image paths are relative to the page, for example `./assets/placeholder.svg`. Links accept HTTP(S), and images accept same-origin HTTP(S) or remote HTTPS. Dynamic strings are rendered with `textContent`, never inserted as HTML. Failed images use a local fallback.

Refresh fetches the JSON with `cache: "no-store"`. Invalid snapshots and network failures leave the last successfully loaded data visible and show a retry message. Filters combine with AND; text search covers model, description, defect, location and source. Brand controls available models. Statistics describe active records in the full snapshot; result count describes the filtered records. Sold/removed records are not displayed.

All dates use `Asia/Bangkok`, with Gregorian years. Demo ages are relative to `updatedAt`, so the sample stays coherent. Real data ages use the current clock. `publishedAt` determines listing age when supplied, otherwise `discoveredAt` is used. The `isNew` flag is supplied by the publisher; no arbitrary client-side cutoff is applied.

## GitHub Pages deployment

1. Create a separate public repository such as `thailand-broken-phone-finder`.
2. Commit all files in this directory at its root on `main`.
3. Open **Settings → Pages → Build and deployment**.
4. Choose **Deploy from a branch**, branch **main**, folder **/(root)**, then Save.
5. Wait for the Pages deployment to finish and open the URL shown by GitHub.

Relative CSS, module, image and JSON paths work under a repository subdirectory, e.g. `https://username.github.io/repository-name/`. No CNAME is supplied. A custom domain attached to an existing user site may affect GitHub's project-site URL routing; use the actual URL displayed in Pages settings. No CI workflow is required for branch publishing.

## Future integrations (not implemented)

A future search pipeline should validate a complete snapshot, preserve stable listing IDs and first-discovered timestamps, and replace `listings.json` atomically in a commit. Publishing that commit updates the dashboard without frontend changes. Refresh reloads data; the site does not currently poll every hour.

Keep source adapters, duplicate matching and removal/sale detection in the publisher. Add optional canonical source IDs, province codes and coordinates without changing the core UI. Price history can be a separate dataset keyed by listing ID; repair costs, profit estimates, statistics, distance search and notifications can be separate modules consuming this data boundary. None are simulated as working features in this release.

## Verification

JavaScript syntax, all 16 records, unique IDs, condition coverage, combined search/filters, sorting, new-only filtering, invalid price ranges, malformed snapshots, and repository-subpath asset references were checked. Full browser visual QA was unavailable in the initial authoring environment.
