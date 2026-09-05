"""
Mastiguard-AI
Forecasting Service

Purpose:
- Build 7-day / 14-day risk outlooks
- Use historical animal risk readings
- Avoid fabricated forecasts
- Return readiness information when history is insufficient

NOTE:
This is a transparent baseline forecasting layer.
It is not a clinical mastitis diagnosis model.
"""

from datetime import datetime, timedelta
from statistics import mean


# ============================================================
# CONFIGURATION
# ============================================================

MINIMUM_POINTS = 24
MAX_HISTORY_POINTS = 500
FORECAST_DAYS = 14


# ============================================================
# LINEAR REGRESSION
# ============================================================

def linear_regression(values):
    """
    Dependency-free least-squares linear regression.

    Returns:
        slope, intercept
    """

    n = len(values)

    if n < 2:
        return (
            0.0,
            float(values[-1]) if values else 0.0
        )

    x_values = list(range(n))

    x_mean = mean(x_values)
    y_mean = mean(values)

    denominator = sum(
        (x - x_mean) ** 2
        for x in x_values
    )

    if denominator == 0:
        return 0.0, y_mean

    numerator = sum(
        (x - x_mean) * (y - y_mean)
        for x, y in zip(x_values, values)
    )

    slope = numerator / denominator
    intercept = y_mean - slope * x_mean

    return slope, intercept


# ============================================================
# RISK LEVEL
# ============================================================

def risk_level_from_score(score):
    """
    Convert 0-100 risk score into dashboard risk class.
    """

    score = max(0.0, min(100.0, float(score)))

    if score >= 70:
        return "HIGH RISK"

    if score >= 45:
        return "MODERATE RISK"

    if score >= 25:
        return "LOW RISK"

    return "NO RISK"


# ============================================================
# FORECAST FROM RISK HISTORY
# ============================================================

def forecast_risk_history(readings, days=FORECAST_DAYS):
    """
    Generate an exploratory risk trend forecast.

    readings:
        [
            {
                "timestamp": datetime,
                "risk_score": 52.4
            }
        ]

    Returns a transparent baseline forecast.
    """

    if not readings:
        return {
            "status": "insufficient_data",
            "reason": "No historical readings available.",
            "forecast": []
        }

    cleaned = []

    for item in readings:

        score = item.get("risk_score")

        if score is None:
            continue

        try:
            score = float(score)
        except (TypeError, ValueError):
            continue

        timestamp = item.get("timestamp")

        cleaned.append(
            {
                "timestamp": timestamp,
                "risk_score": max(
                    0.0,
                    min(100.0, score)
                )
            }
        )

    if len(cleaned) < MINIMUM_POINTS:

        return {
            "status": "insufficient_data",
            "reason": (
                f"At least {MINIMUM_POINTS} historical "
                "risk observations are required for the "
                "exploratory forecast."
            ),
            "available_points": len(cleaned),
            "required_points": MINIMUM_POINTS,
            "forecast": []
        }

    # Keep only the latest history points
    cleaned = cleaned[-MAX_HISTORY_POINTS:]

    values = [
        item["risk_score"]
        for item in cleaned
    ]

    slope, intercept = linear_regression(values)

    latest_score = values[-1]

    # ========================================================
    # ESTIMATE OBSERVATIONS PER DAY
    # ========================================================

    timestamps = [
        item["timestamp"]
        for item in cleaned
        if isinstance(item["timestamp"], datetime)
    ]

    observations_per_day = 1.0

    if len(timestamps) >= 2:

        elapsed_seconds = (
            timestamps[-1] - timestamps[0]
        ).total_seconds()

        if elapsed_seconds > 0:

            elapsed_days = (
                elapsed_seconds / 86400.0
            )

            if elapsed_days > 0:

                observations_per_day = (
                    len(timestamps) /
                    elapsed_days
                )

    # ========================================================
    # DAILY TREND
    # ========================================================

    daily_change = (
        slope * observations_per_day
    )

    # Prevent runaway extrapolation
    daily_change = max(
        -10.0,
        min(10.0, daily_change)
    )

    # ========================================================
    # BUILD FORECAST
    # ========================================================

    forecast = []

    now = datetime.utcnow()

    for day in range(0, days + 1):

        predicted = (
            latest_score +
            daily_change * day
        )

        predicted = max(
            0.0,
            min(100.0, predicted)
        )

        forecast.append(
            {
                "day": day,

                "date": (
                    now +
                    timedelta(days=day)
                ).date().isoformat(),

                "risk_score": round(
                    predicted,
                    1
                ),

                "risk_level":
                    risk_level_from_score(predicted)
            }
        )

    # ========================================================
    # TREND DIRECTION
    # ========================================================

    if daily_change > 0.5:
        direction = "RISING"

    elif daily_change < -0.5:
        direction = "FALLING"

    else:
        direction = "STABLE"

    return {
        "status": "ready",

        "method":
            "bounded_linear_trend_baseline",

        "data_points":
            len(cleaned),

        "latest_risk":
            round(latest_score, 1),

        "daily_change":
            round(daily_change, 2),

        "direction":
            direction,

        "forecast":
            forecast
    }