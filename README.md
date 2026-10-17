# Sichuan Alley website

This is the production repository for the [Sichuan Alley Singapore website](https://sichuanalley.com.sg/). The site is a static Tumult Hype export. A Python standard-library script prepares it for publication; no application build or package installation is needed. GitHub Pages serves the custom domain `sichuanalley.com.sg`.

Pushes to `main` automatically deploy the website to GitHub Pages through [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). The workflow runs the publishing tests, then [`scripts/prepare_site.py`](scripts/prepare_site.py). Only the prepared `_site/` directory is published: the branded `index.html`, the unchanged `sichuanalley website.hyperesources/` directory, the production navigation script, `.nojekyll`, the root favicon files, and the existing Google verification file.

For a future designer export, replace `index.html`, `.nojekyll` and the entire `sichuanalley website.hyperesources/` directory with the new export, review the changes, and commit them to `main`. Preserve the generated directory name and structure exactly, including its space: the HTML and Hype scripts refer to those paths.

## Production branding

[`site/seo-head.html`](site/seo-head.html) is the source of truth for the production title, Open Graph brand metadata, canonical URL and `WebSite` JSON-LD. The publishing script replaces the export's title and conflicting brand tags without modifying the original export or its page body. Keep this template and `site/icons/` when importing designer updates. If an export includes a `WebSite` entity inside a mixed JSON-LD graph, the script fails explicitly so the graph can be merged deliberately without losing other entities.

[`site/icons/`](site/icons/) contains the full original Sichuan Alley logo (`sichuan-alley-logo.svg`), a 96×96 PNG, and an ICO with 16×16, 32×32 and 48×48 versions. Both raster files use the original logo, proportionally centered on the website's `#FCFBF6` background. Icons are published as `favicon.png` and `favicon.ico` in the site's root, independently of the Hype resource directory. Relative favicon links support both the custom domain and the GitHub Pages project path.

[`site/hype-hash-router.js`](site/hype-hash-router.js) restores hash navigation, direct scene URLs and browser history for production. Preparation copies it unchanged to `_site/hype-hash-router.js` and adds one blocking script at the end of the prepared head, after designer head code and before the generated Hype script in the body. Preserve this script and the publishing injection during designer updates; make compatibility fixes here while keeping the raw export unchanged. A missing script stops preparation before replacing the previous `_site/` output.

## Local verification and preview

Run with Python 3.9 or newer from this repository:

```sh
python -m unittest discover -s tests -v
python scripts/prepare_site.py
python -m http.server 8000 --directory _site
```

If Node.js is already installed, `node tests/test_hype_hash_router.cjs` also checks the runtime without installing packages.

Open `http://localhost:8000/` to preview the actual published website, including its title, favicon and navigation. On desktop and mobile, follow the updated site's navigation and check direct scene URLs, refresh, Back/Forward and rapid navigation for the correct scene and scroll position. Check Far East and Capitol location sections, reservation/takeaway links and galleries. Resolve compatibility issues in the production script and recheck before publishing, then repeat these checks on the live site after deployment. Viewing the raw export directly still shows the designer's original metadata and behavior. Preparation rebuilds only the generated `_site/` directory, removing obsolete files from previous previews. Do not put hand-maintained files there.

## Google Search follow-up

After a successful Pages deployment, check the homepage and both favicon URLs for HTTP 200 responses and verify the live page's title is `Sichuan Alley Singapore`. Validate the homepage's `WebSite` JSON-LD with [Schema Markup Validator](https://validator.schema.org/).

The canonical URL, `og:url` and JSON-LD `url` in `site/seo-head.html` use `https://sichuanalley.com.sg/`. [`site/verification/`](site/verification/) preserves the original site's Google verification file; keep it during designer updates. The domain owner can use [Google Search Console](https://search.google.com/search-console) to test the live homepage and request indexing. Search branding is assessed on the custom domain: [site names](https://developers.google.com/search/docs/appearance/site-names), [favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search).
