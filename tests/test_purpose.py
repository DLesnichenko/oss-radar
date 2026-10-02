import base64
import json
import tempfile
import unittest
from pathlib import Path

from collector import purpose


def never_called(url, headers, payload):
    raise AssertionError("post must not be called")


def claude_says(text):
    def post(url, headers, payload):
        post.payload = payload
        post.headers = headers
        return {"content": [{"type": "text", "text": text}]}

    return post


class PurposeForTest(unittest.TestCase):
    def test_without_key_returns_description(self):
        got = purpose.purpose_for("a/b", "Desc", "readme", None, never_called, {})
        self.assertEqual(got, "Desc")

    def test_without_description_or_readme_is_empty_string(self):
        self.assertEqual(purpose.purpose_for("a/b", None, None, None, never_called, {}), "")

    def test_without_readme_returns_description(self):
        self.assertEqual(purpose.purpose_for("a/b", "Desc", None, "key", never_called, {}), "Desc")

    def test_cached_value_is_reused_without_calling_post(self):
        got = purpose.purpose_for("a/b", "Desc", "readme", "key", never_called, {"a/b": "Кэш"})
        self.assertEqual(got, "Кэш")

    def test_post_failure_falls_back_to_description(self):
        def boom(url, headers, payload):
            raise OSError("network down")

        self.assertEqual(purpose.purpose_for("a/b", "Desc", "readme", "key", boom, {}), "Desc")

    def test_with_key_uses_claude_text_and_caches_it(self):
        post = claude_says("  Помогает собирать отчёты.  ")
        cache = {}
        got = purpose.purpose_for("a/b", "Desc", "# Readme", "secret", post, cache)
        self.assertEqual(got, "Помогает собирать отчёты.")
        self.assertEqual(cache, {"a/b": "Помогает собирать отчёты."})
        self.assertEqual(post.payload["model"], "claude-haiku-4-5-20251001")
        self.assertEqual(post.headers["x-api-key"], "secret")


class UpdatePurposesTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.path = Path(self._tmp.name) / "purposes.json"

    def tearDown(self):
        self._tmp.cleanup()

    def http(self, url, headers):
        readme = base64.b64encode("# Hello".encode()).decode()
        return 200, {"content": readme, "encoding": "base64"}, {}

    def test_without_key_writes_nothing(self):
        purpose.update_purposes(self.http, never_called, {"a/b": "Desc"}, None, self.path)
        self.assertFalse(self.path.exists())

    def test_with_key_writes_new_purposes_and_keeps_old(self):
        self.path.write_text(json.dumps({"old/repo": "Старое"}), encoding="utf-8")
        purpose.update_purposes(self.http, claude_says("Новое"), {"a/b": "Desc"}, "key", self.path)
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertEqual(data, {"old/repo": "Старое", "a/b": "Новое"})


if __name__ == "__main__":
    unittest.main()
