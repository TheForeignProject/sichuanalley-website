# Sichuan Alley Singapore website

Company-owned production repository: `TheForeignProject/sichuanalley-website`. This independent repository imports the working-tree files from the designer's read-only [`wimgshom/sichuanalley-website`](https://github.com/wimgshom/sichuanalley-website); it is not a fork and does not include the designer's Git history.

The current website is at **https://theforeignproject.github.io/sichuanalley-website/**. No custom domain is configured yet. This is a static Tumult Hype export: no npm install, application build or third-party Python package is needed to deploy.

## Accounts and deployment

`TheForeignProject` owns the repository, grants collaborator access, and configures Pages and any future custom domain. `WAusar` authors, commits and pushes website code to `main`. Before committing, check `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`; use an email associated with the personal GitHub account. Before pushing, confirm authentication is `WAusar`. Repository-local Git configuration must not change other projects' identities.

Pushes to `main` automatically deploy through `.github/workflows/deploy-pages.yml`; manual `workflow_dispatch` is also available. Pages publishing source must remain **GitHub Actions** (`build_type=workflow`). Tests run before `scripts/prepare_site.py`, which prepares `_site/`; only that directory is uploaded and deployed.

## Designer updates and branding

Import the source `main` at a fixed SHA into a temporary directory; compare additions, deletions and content hashes before copying. Replace `index.html`, `.nojekyll` and the complete `sichuanalley website.hyperesources/` export. Preserve spaces, Chinese filenames, generated scripts, original bytes and line endings. Remove only files known to belong to the previous designer export. Review any new root website assets and explicitly add them to publication staging. Do not copy source history, workflows, or repository-management files over company files.

Preserve `site/`, `scripts/`, `tests/`, `.github/`, this README and local skill files. Compare raw imported website files with the source using SHA-256, then run the publishing tests. Commit with a `Source-Commit: <full source SHA>` trailer and push using the personal account. If there are no changes, do not make an empty commit. Syncing is manual, without a schedule or upstream push trigger.

`site/seo-head.html` maintains the title **Sichuan Alley Singapore**, Open Graph metadata, canonical URL, favicon links and `WebSite` JSON-LD (alternate name: **Sichuan Alley**). The preparation script replaces conflicting brand tags in the published HTML while preserving the raw export and page body. A `WebSite` entity in a mixed JSON-LD graph requires deliberate merging, rather than deleting unrelated entities.

`site/icons/` stores a byte-for-byte copy of the designer's full `PastedVector.svg` logo and one-time raster exports: a 96×96 PNG and 16/32/48 ICO. The original `#231815` logo is centered on `#FCFBF6`, with its longest dimension limited to 80 pixels in the PNG. They are independent of designer updates. Relative `./favicon.png` and `./favicon.ico` URLs work under both the current project path and a future domain root.

## Local verification

With Python 3.9 or newer, from the repository root:

```sh
python -m unittest discover -s tests -v
python scripts/prepare_site.py
python -m http.server 8000 --directory _site
```

Preview http://localhost:8000/. `_site/` is generated output, not a location for hand-maintained files. Preparation replaces the previous output only after validating the required inputs and HTML. Missing resources/icons or malformed homepage structure block publication.

After each push, inspect the Actions run associated with that destination SHA. Confirm deployment succeeds and the live homepage matches **prepared `_site/index.html`**, not the raw export. Check both favicons, the generated Hype script, runtime, representative images and Chinese iframe URLs under the encoded `sichuanalley%20website.hyperesources/` path. Hype resources must still match their source bytes. Test desktop/mobile navigation, gallery, two-location reservations and takeaway links. Report upstream problems separately.

## Future custom domain

Once the domain is chosen, use the company account to bind it in this repository's Pages settings **before** changing DNS. Actions-based Pages does not use a committed `CNAME` file. Identify the authoritative DNS provider and existing records first; the domain owner makes DNS changes unless separately authorizing agent access.

For an apex domain, use these GitHub Pages records (TTL 3600 seconds):

| Type | Host | Values |
| --- | --- | --- |
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA (IPv6) | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME | `www` (or the selected subdomain) | `theforeignproject.github.io` |

Replace only conflicting website records; preserve mail and unrelated DNS. Never put a repository path in the CNAME target. Recheck the [official domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) at cutover time.

Return to `WAusar` to change canonical, `og:url` and JSON-LD `url` in `site/seo-head.html` to the final HTTPS homepage, commit and deploy. Update this README and the local sync skill's verification URL. With the company account, enable HTTPS enforcement when the certificate is ready; verify HTTPS, redirects and resources, and finish with the personal account selected.

Google does not support independent [site names](https://developers.google.com/search/docs/appearance/site-names) for subdirectories, and uses a [favicon per hostname](https://developers.google.com/search/docs/appearance/favicon-in-search). The current project URL verifies browser branding; search branding is assessed after custom-domain launch. The domain owner then verifies Google Search Console and runs **URL Inspection → Test live URL → Request indexing**. Google's final display and recrawl timing are independent of deployment success.
