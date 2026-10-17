"""Exercise the publishing boundary without third-party dependencies."""

import importlib.util
import json
from pathlib import Path
import re
import shutil
import tempfile
import unittest
from urllib.parse import urljoin


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_site.py"


class PrepareSiteTests(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory(dir=ROOT)
        self.addCleanup(self.scratch.cleanup)
        self.source = Path(self.scratch.name)
        self.output = self.source / "_site"
        self.original = (
            b'<!DOCTYPE html>\r\n<html><head><title>sichuanalley website</title>'
            b'<meta name="viewport" content="width=440">'
            b'<style>body { background: #FCFBF6; }</style>'
            b'<script>window.designerReady = true;</script></head>\r\n'
            b'<body><script src="sichuanalley%20website.hyperesources/'
            b'sichuanalleywebsite_hype_generated_script.js?97637"></script>'
            b'<p>Caf\xc3\xa9</p></body></html>\r\n'
        )
        (self.source / "index.html").write_bytes(self.original)
        (self.source / ".nojekyll").write_bytes(b"# Static Hype export\n")
        resources = self.source / "sichuanalley website.hyperesources"
        resources.mkdir()
        (resources / "sichuanalleywebsite_hype_generated_script.js").write_bytes(b"Hype();\r\n")
        (resources / "photo.jpg").write_bytes(b"original image bytes")
        shutil.copytree(ROOT / "site", self.source / "site")
        self.router = b'"use strict";\r\nwindow.productionRouter = true;\r\n'
        (self.source / "site" / "hype-hash-router.js").write_bytes(self.router)
        verification = self.source / "site" / "verification"
        verification.mkdir(exist_ok=True)
        (verification / "google89d69245d6219e5b.html").write_bytes(
            b"google-site-verification: google89d69245d6219e5b.html\r\n")
        self.assertTrue(SCRIPT.is_file(), "Publishing script has not been implemented")
        spec = importlib.util.spec_from_file_location("prepare_site", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.prepare = module.prepare_site

    def test_publishes_brand_head_and_icons_without_changing_export(self):
        self.prepare(self.source)
        published = (self.output / "index.html").read_text(encoding="utf-8")
        self.assertEqual(re.findall(r"<title>(.*?)</title>", published), ["Sichuan Alley Singapore"])
        self.assertIn('property="og:site_name" content="Sichuan Alley Singapore"', published)
        self.assertIn('rel="canonical" href="https://sichuanalley.com.sg/"', published)
        data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', published, re.S).group(1))
        self.assertEqual(data, {
            "@context": "https://schema.org", "@type": "WebSite",
            "name": "Sichuan Alley Singapore", "alternateName": "Sichuan Alley", "url": "https://sichuanalley.com.sg/",
        })
        self.assertEqual((self.source / "index.html").read_bytes(), self.original)
        self.assertEqual((self.output / "index.html").read_bytes().split(b"</head>")[1], self.original.split(b"</head>")[1])
        self.assertIn('<meta name="viewport" content="width=440">', published)
        for path in (self.source / "sichuanalley website.hyperesources").iterdir():
            self.assertEqual((self.output / "sichuanalley website.hyperesources" / path.name).read_bytes(), path.read_bytes())
        for name in ("favicon.png", "favicon.ico"):
            self.assertEqual((self.output / name).read_bytes(), (self.source / "site" / "icons" / name).read_bytes())
        self.assertEqual(set(p.name for p in self.output.iterdir()), {"index.html", "sichuanalley website.hyperesources", "favicon.png", "favicon.ico", ".nojekyll", "google89d69245d6219e5b.html", "hype-hash-router.js"})

    def test_publishes_router_once_at_end_of_head_before_generated_hype_script(self):
        self.prepare(self.source)
        self.prepare(self.source)
        published = (self.output / "index.html").read_bytes()
        router_tag = b'<script src="hype-hash-router.js"></script>'
        self.assertEqual(published.count(router_tag), 1)
        head, body = published.split(b"</head>", 1)
        self.assertTrue(head.rstrip().endswith(router_tag))
        self.assertLess(head.index(b"window.designerReady"), head.index(router_tag))
        self.assertIn(b"sichuanalleywebsite_hype_generated_script.js", body)
        self.assertEqual((self.output / "hype-hash-router.js").read_bytes(), self.router)
        self.assertEqual((self.source / "site" / "hype-hash-router.js").read_bytes(), self.router)
        self.assertEqual((self.source / "index.html").read_bytes(), self.original)
        self.assertEqual(body, self.original.split(b"</head>", 1)[1])

    def test_missing_router_preserves_every_file_of_previous_publication(self):
        self.prepare(self.source)
        previous = {path.relative_to(self.output): path.read_bytes()
                    for path in self.output.rglob("*") if path.is_file()}
        (self.source / "site" / "hype-hash-router.js").unlink()
        with self.assertRaisesRegex(ValueError, "hype-hash-router.js"):
            self.prepare(self.source)
        self.assertEqual({path.relative_to(self.output): path.read_bytes()
                          for path in self.output.rglob("*") if path.is_file()}, previous)

    def test_preserves_search_console_verification_without_publishing_private_files(self):
        verification = self.source / "site" / "verification" / "google89d69245d6219e5b.html"
        (verification.parent / "private-backup.sql").write_bytes(b"private maintenance file")
        self.prepare(self.source)
        self.assertEqual((self.output / verification.name).read_bytes(), verification.read_bytes())
        self.assertFalse((self.output / "private-backup.sql").exists())

    def test_missing_search_console_verification_preserves_previous_publication(self):
        self.prepare(self.source)
        previous = (self.output / "index.html").read_bytes()
        (self.source / "site" / "verification" / "google89d69245d6219e5b.html").unlink()
        with self.assertRaisesRegex(ValueError, "google89d69245d6219e5b.html"):
            self.prepare(self.source)
        self.assertEqual((self.output / "index.html").read_bytes(), previous)

    def test_new_designer_export_keeps_branding_and_removes_stale_assets(self):
        self.prepare(self.source)
        (self.output / "stale.txt").write_text("previous publication")
        (self.source / "sichuanalley website.hyperesources" / "photo.jpg").unlink()
        added = self.source / "sichuanalley website.hyperesources" / "new folder" / "新菜单.html"
        added.parent.mkdir()
        added.write_bytes(b"new designer asset\r\n")
        (self.source / "index.html").write_bytes(self.original.replace(b"sichuanalley website", b"new designer export"))
        self.prepare(self.source)
        self.assertIn("<title>Sichuan Alley Singapore</title>", (self.output / "index.html").read_text())
        self.assertEqual((self.output / "index.html").read_bytes().count(
            b'<script src="hype-hash-router.js"></script>'), 1)
        self.assertEqual((self.output / "hype-hash-router.js").read_bytes(), self.router)
        self.assertFalse((self.output / "stale.txt").exists())
        self.assertFalse((self.output / "sichuanalley website.hyperesources" / "photo.jpg").exists())
        self.assertEqual((self.output / "sichuanalley website.hyperesources" / "new folder" / "新菜单.html").read_bytes(), added.read_bytes())

    def test_favicon_urls_resolve_under_project_path_and_custom_domain(self):
        self.prepare(self.source)
        published = (self.output / "index.html").read_text(encoding="utf-8")
        urls = re.findall(r'<link rel="icon" href="([^"]+)"', published)
        self.assertEqual(urls, ["./favicon.ico", "./favicon.png"])
        for base in ("https://theforeignproject.github.io/sichuanalley-website/", "https://example.com/"):
            for url in urls:
                self.assertEqual(urljoin(base, url), base + url[2:])

    def test_missing_nojekyll_or_head_template_preserves_previous_output(self):
        for relative in (".nojekyll", "site/seo-head.html"):
            with self.subTest(relative=relative):
                self.prepare(self.source)
                previous = (self.output / "index.html").read_bytes()
                path = self.source / relative
                content = path.read_bytes()
                path.unlink()
                with self.assertRaises(ValueError):
                    self.prepare(self.source)
                self.assertEqual((self.output / "index.html").read_bytes(), previous)
                path.write_bytes(content)

    def test_existing_brand_metadata_is_replaced_without_duplicates(self):
        old_metadata = (
            b'<meta property="og:title" content="old">'
            b'<meta property="og:site_name" content="old">'
            b'<meta property="og:url" content="http://old.example/">'
            b'<link rel="canonical" href="http://old.example/">'
            b'<link rel="shortcut icon" href="/old.ico">'
            b'<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"old"}</script>'
            b'<script type="application/ld+json">{"@type":"Organization","name":"Sichuan Alley"}</script>'
        )
        (self.source / "index.html").write_bytes(self.original.replace(b"</head>", old_metadata + b"</head>"))
        self.prepare(self.source)
        published = (self.output / "index.html").read_text()
        self.assertNotIn("old.example", published)
        self.assertNotIn("/old.ico", published)
        self.assertEqual(published.count('property="og:title"'), 1)
        self.assertEqual(published.count('"@type": "WebSite"'), 1)
        self.assertIn('"@type":"Organization"', published)

    def test_missing_icon_fails_before_replacing_previous_publication(self):
        self.prepare(self.source)
        previous = (self.output / "index.html").read_bytes()
        (self.source / "site" / "icons" / "favicon.png").unlink()
        with self.assertRaisesRegex(ValueError, "favicon.png"):
            self.prepare(self.source)
        self.assertEqual((self.output / "index.html").read_bytes(), previous)

    def test_array_form_website_type_is_replaced(self):
        old = b'<script type="application/ld+json">{"@type":["WebSite"],"name":"Old brand"}</script>'
        (self.source / "index.html").write_bytes(self.original.replace(b"</head>", old + b"</head>"))
        self.prepare(self.source)
        published = (self.output / "index.html").read_text()
        self.assertNotIn("Old brand", published)
        self.assertEqual(published.count('"@type": "WebSite"'), 1)

    def test_array_form_website_in_mixed_graph_requires_explicit_merge(self):
        graph = b'<script type="application/ld+json">{"@graph":[{"@type":["WebSite"],"name":"Old brand"},{"@type":"Organization","name":"Sichuan Alley"}]}</script>'
        (self.source / "index.html").write_bytes(self.original.replace(b"</head>", graph + b"</head>"))
        with self.assertRaisesRegex(ValueError, "merge"):
            self.prepare(self.source)
        self.assertFalse(self.output.exists())

    def test_missing_hype_script_is_rejected(self):
        (self.source / "sichuanalley website.hyperesources" / "sichuanalleywebsite_hype_generated_script.js").unlink()
        with self.assertRaisesRegex(ValueError, "Hype"):
            self.prepare(self.source)
        self.assertFalse(self.output.exists())

    def test_malformed_head_or_title_is_rejected(self):
        for html in (
            b"<html><body>No head</body></html>",
            self.original.replace(b"</head>", b""),
            self.original.replace(b"</head>", b"<title>duplicate</title></head>"),
            self.original.replace(b"<title>sichuanalley website</title>", b""),
        ):
            with self.subTest(html=html):
                (self.source / "index.html").write_bytes(html)
                with self.assertRaises(ValueError):
                    self.prepare(self.source)
                self.assertFalse(self.output.exists())


if __name__ == "__main__":
    unittest.main()
