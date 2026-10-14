# Sichuan Alley website

This is the production repository for the [Sichuan Alley Singapore website](https://theforeignproject.github.io/sichuanalley-website/). The site is a static Tumult Hype export. A Python standard-library script prepares it for publication; no application build or package installation is needed. A custom domain has not yet been configured.

Pushes to `main` automatically deploy the website to GitHub Pages through [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). The workflow runs the publishing tests, then [`scripts/prepare_site.py`](scripts/prepare_site.py). Only the prepared `_site/` directory is published: the branded `index.html`, the unchanged `sichuanalley website.hyperesources/` directory, `.nojekyll`, and the root favicon files.

For a future designer export, replace `index.html`, `.nojekyll` and the entire `sichuanalley website.hyperesources/` directory with the new export, review the changes, and commit them to `main`. Preserve the generated directory name and structure exactly, including its space: the HTML and Hype scripts refer to those paths.

## Production branding

[`site/seo-head.html`](site/seo-head.html) is the source of truth for the production title, Open Graph brand metadata, canonical URL and `WebSite` JSON-LD. The publishing script replaces the export's title and conflicting brand tags without modifying the original export or its page body. Keep this template and `site/icons/` when importing designer updates. If an export includes a `WebSite` entity inside a mixed JSON-LD graph, the script fails explicitly so the graph can be merged deliberately without losing other entities.

[`site/icons/`](site/icons/) contains the full original Sichuan Alley logo (`sichuan-alley-logo.svg`), a 96×96 PNG, and an ICO with 16×16, 32×32 and 48×48 versions. Both raster files use the original logo, proportionally centered on the website's `#FCFBF6` background. Icons are published as `favicon.png` and `favicon.ico` in the site's root, independently of the Hype resource directory. Relative favicon links support both the current GitHub Pages project path and a future custom domain.

## Local verification and preview

Run with Python 3.9 or newer from this repository:

```sh
python -m unittest discover -s tests -v
python scripts/prepare_site.py
python -m http.server 8000 --directory _site
```

Open `http://localhost:8000/` to preview the actual published website, including its title and favicon. Viewing the raw export directly still shows the designer's original metadata. Preparation rebuilds only the generated `_site/` directory, removing obsolete files from previous previews. Do not put hand-maintained files there.

## Google Search follow-up

After a successful Pages deployment, check the homepage and both favicon URLs for HTTP 200 responses and verify the live page's title is `Sichuan Alley Singapore`. Validate the homepage's `WebSite` JSON-LD with [Schema Markup Validator](https://validator.schema.org/).

When a custom domain is connected, update the canonical URL, `og:url` and JSON-LD `url` in `site/seo-head.html`. The domain owner can then use [Google Search Console](https://search.google.com/search-console) to test the live homepage and request indexing. Google does not support independent site names for subdirectories, so search branding is assessed after the custom-domain launch: [site names](https://developers.google.com/search/docs/appearance/site-names), [favicon requirements](https://developers.google.com/search/docs/appearance/favicon-in-search).