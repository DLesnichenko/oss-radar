"""Star growth metrics computed from per-day snapshots.

A history is a dict {snapshot date: star count}. Every function returns None
when the history cannot support an honest number (see MAX_GAP_DAYS).
"""
from datetime import date, timedelta

MAX_GAP_DAYS = 3


def stars_at(history, day, created=None, max_gap_days=MAX_GAP_DAYS):
    if created is not None and created > day:
        return 0
    earlier = [d for d in history if d <= day]
    if not earlier:
        return None
    latest = max(earlier)
    if (day - latest).days > max_gap_days:
        return None
    return history[latest]


def growth(history, day, window, created=None):
    end = stars_at(history, day, created)
    start = stars_at(history, day - timedelta(days=window), created)
    if end is None or start is None:
        return None
    return end - start


def previous_growth(history, day, created=None):
    """Growth over the 30 days before the last 30; None when history does not reach back that far."""
    return growth(history, day - timedelta(days=30), 30, created)


def acceleration(history, day, created=None):
    recent = growth(history, day, 30, created)
    previous = previous_growth(history, day, created)
    if recent is None or previous is None or previous <= 0:
        return None
    return recent / previous


def status(growth30, accel, previous):
    """`previous` is previous_growth(): None means unknown (no status), <= 0 means nothing grew before."""
    if growth30 is None:
        return None
    if accel is None:
        if previous is None:
            return None
        return "ускоряется" if growth30 > 0 else None
    if accel >= 1.5:
        return "ускоряется"
    if accel >= 0.8:
        return "устойчивый рост"
    if accel >= 0.4:
        return "рост без ускорения"
    return "замедляется"


def active_days(history, day, span=30):
    dates = sorted(history)
    start = day - timedelta(days=span)
    count = 0
    for previous, current in zip(dates, dates[1:]):
        if start < current <= day and history[current] > history[previous]:
            count += 1
    return count


def weekly_gains(history, day, weeks=10, created=None):
    return [
        growth(history, day - timedelta(days=7 * (weeks - 1 - i)), 7, created)
        for i in range(weeks)
    ]
