import unittest
from datetime import date, timedelta

from collector import metrics

D = date(2026, 9, 27)


def days(n):
    return D - timedelta(days=n)


class StarsAtTest(unittest.TestCase):
    def test_picks_latest_snapshot_not_after_day(self):
        history = {days(5): 100, days(1): 110, D + timedelta(days=2): 999}
        self.assertEqual(metrics.stars_at(history, D), 110)

    def test_gap_longer_than_three_days_is_none(self):
        self.assertIsNone(metrics.stars_at({days(4): 100}, D))
        self.assertEqual(metrics.stars_at({days(3): 100}, D), 100)

    def test_before_creation_is_zero(self):
        self.assertEqual(metrics.stars_at({}, D, created=D + timedelta(days=1)), 0)

    def test_no_history_after_creation_is_none(self):
        self.assertIsNone(metrics.stars_at({}, D, created=days(10)))


class GrowthTest(unittest.TestCase):
    def test_growth_over_window(self):
        history = {days(7): 100, D: 160}
        self.assertEqual(metrics.growth(history, D, 7), 60)

    def test_young_repo_growth_equals_total_stars(self):
        history = {days(1): 500, D: 520}
        self.assertEqual(metrics.growth(history, D, 30, created=days(10)), 520)

    def test_missing_window_start_is_none(self):
        self.assertIsNone(metrics.growth({D: 160}, D, 30))


class AccelerationTest(unittest.TestCase):
    def test_ratio_of_last_to_previous_30_days(self):
        history = {days(60): 100, days(30): 200, D: 500}
        self.assertEqual(metrics.acceleration(history, D), 3.0)

    def test_zero_previous_growth_is_none_not_error(self):
        history = {days(60): 100, days(30): 100, D: 150}
        self.assertIsNone(metrics.acceleration(history, D))

    def test_missing_history_is_none(self):
        self.assertIsNone(metrics.acceleration({D: 150}, D))


class StatusTest(unittest.TestCase):
    def test_thresholds(self):
        self.assertEqual(metrics.status(10, 1.5), "ускоряется")
        self.assertEqual(metrics.status(10, 1.49), "устойчивый рост")
        self.assertEqual(metrics.status(10, 0.8), "устойчивый рост")
        self.assertEqual(metrics.status(10, 0.79), "рост без ускорения")
        self.assertEqual(metrics.status(10, 0.4), "рост без ускорения")
        self.assertEqual(metrics.status(10, 0.39), "замедляется")

    def test_unknown_growth_has_no_status(self):
        self.assertIsNone(metrics.status(None, 2.0))

    def test_no_acceleration_with_positive_growth_is_accelerating(self):
        self.assertEqual(metrics.status(50, None), "ускоряется")
        self.assertIsNone(metrics.status(0, None))


class ActiveDaysTest(unittest.TestCase):
    def test_counts_only_days_with_increase(self):
        history = {days(4): 10, days(3): 12, days(2): 12, days(1): 15, D: 15}
        self.assertEqual(metrics.active_days(history, D), 2)

    def test_snapshots_outside_span_are_ignored(self):
        history = {days(40): 1, days(39): 5, days(1): 5, D: 6}
        self.assertEqual(metrics.active_days(history, D, span=30), 1)


class WeeklyGainsTest(unittest.TestCase):
    def test_gain_per_week_oldest_first(self):
        history = {days(14): 100, days(7): 130, D: 190}
        self.assertEqual(metrics.weekly_gains(history, D, weeks=2), [30, 60])

    def test_missing_weeks_are_none(self):
        history = {days(7): 130, D: 190}
        self.assertEqual(metrics.weekly_gains(history, D, weeks=2), [None, 60])


if __name__ == "__main__":
    unittest.main()
