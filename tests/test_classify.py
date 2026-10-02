import unittest
from pathlib import Path

from collector import classify

RULES_PATH = Path(__file__).resolve().parent.parent / "collector" / "categories.json"


def repo(name="o/x", description="", topics=()):
    return {"name": name, "description": description, "topics": list(topics)}


class ClassifyTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rules = classify.load_rules(RULES_PATH)

    def test_industry_match_wins_and_makes_vertical_agent(self):
        r = repo("acme/sec-audit", "Security audit skill for coding agents")
        self.assertEqual(classify.industry_of(r, self.rules), "Кибербезопасность")
        self.assertEqual(classify.category_of(r, self.rules), "Вертикальные агенты")

    def test_keyword_matched_via_topics(self):
        r = repo("acme/hub", "Coordination layer", topics=["multi-agent"])
        self.assertEqual(classify.category_of(r, self.rules), "Оркестрация агентов")

    def test_no_match_is_other(self):
        r = repo("acme/zzz", "Something unrelated to anything")
        self.assertIsNone(classify.industry_of(r, self.rules))
        self.assertEqual(classify.category_of(r, self.rules), "Прочее")

    def test_matching_is_case_insensitive(self):
        r = repo("acme/Skills", "A collection of SKILLS")
        self.assertEqual(classify.category_of(r, self.rules), "Навыки и методологии")

    def test_missing_description_and_topics_do_not_crash(self):
        r = {"name": "acme/empty", "description": None, "topics": None}
        self.assertEqual(classify.category_of(r, self.rules), "Прочее")

    def test_all_categories_are_the_spec_names(self):
        names = {c["name"] for c in self.rules["categories"]}
        self.assertEqual(
            names,
            {
                "Оркестрация агентов",
                "Навыки и методологии",
                "Контент и дизайн",
                "Экономия и контекст",
                "Веб и инструменты",
            },
        )


if __name__ == "__main__":
    unittest.main()
