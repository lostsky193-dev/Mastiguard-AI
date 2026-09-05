"""
Mastiguard-AI
Recommendation Service

Provides preventive decision-support recommendations.

This module does not prescribe medication.
"""

from datetime import datetime


# ============================================================
# RISK HELPERS
# ============================================================

def normalize_risk_level(risk_level):
    if not risk_level:
        return "NO RISK"

    return str(risk_level).upper().strip()


def add_recommendation(
    recommendations,
    priority,
    title,
    message,
    category
):
    recommendations.append(
        {
            "priority": priority,
            "title": title,
            "message": message,
            "category": category
        }
    )


# ============================================================
# INDIVIDUAL RECOMMENDATIONS
# ============================================================

def generate_recommendations(
    risk_score=0,
    risk_level="NO RISK",
    temperature=None,
    ec=None,
    ph=None,
    scc=None,
    milk_yield=None,
    activity=None,
    rumination=None,
    animal=None
):
    """
    Generate preventive recommendations for one animal.
    """

    recommendations = []

    try:
        risk_score = float(risk_score or 0)
    except (TypeError, ValueError):
        risk_score = 0.0

    risk_level = normalize_risk_level(
        risk_level
    )

    # ========================================================
    # HIGH RISK
    # ========================================================

    if risk_level == "HIGH RISK" or risk_score >= 70:

        add_recommendation(
            recommendations,
            "URGENT",
            "Veterinary review",
            (
                "Arrange prompt veterinary assessment and "
                "confirm the condition using appropriate "
                "clinical and laboratory evidence."
            ),
            "Animal Health"
        )

        add_recommendation(
            recommendations,
            "HIGH",
            "Increase monitoring",
            (
                "Increase observation frequency and record "
                "changes in udder appearance, milk quality, "
                "temperature, appetite and behaviour."
            ),
            "Monitoring"
        )

        add_recommendation(
            recommendations,
            "HIGH",
            "Review milking hygiene",
            (
                "Inspect teat preparation, cluster hygiene, "
                "equipment cleaning and post-milking teat care."
            ),
            "Milking Hygiene"
        )

    # ========================================================
    # MODERATE RISK
    # ========================================================

    elif risk_level == "MODERATE RISK" or risk_score >= 45:

        add_recommendation(
            recommendations,
            "HIGH",
            "Increase monitoring",
            (
                "Monitor this animal more frequently and "
                "compare current readings with its historical baseline."
            ),
            "Monitoring"
        )

        add_recommendation(
            recommendations,
            "MEDIUM",
            "Review hygiene",
            (
                "Check bedding cleanliness, teat preparation, "
                "milking routine and worker hygiene."
            ),
            "Hygiene"
        )

        add_recommendation(
            recommendations,
            "MEDIUM",
            "Review nutrition and water",
            (
                "Check feed availability, ration consistency "
                "and access to clean water."
            ),
            "Nutrition"
        )

    # ========================================================
    # LOW RISK
    # ========================================================

    elif risk_level == "LOW RISK" or risk_score >= 25:

        add_recommendation(
            recommendations,
            "MEDIUM",
            "Preventive monitoring",
            (
                "Continue routine monitoring and watch for "
                "changes in milk quality, behaviour or temperature."
            ),
            "Monitoring"
        )

        add_recommendation(
            recommendations,
            "LOW",
            "Maintain hygiene controls",
            (
                "Maintain consistent bedding and milking hygiene "
                "practices."
            ),
            "Hygiene"
        )

    # ========================================================
    # NO RISK
    # ========================================================

    else:

        add_recommendation(
            recommendations,
            "LOW",
            "Continue routine monitoring",
            (
                "Maintain normal observation and sensor monitoring "
                "according to the farm schedule."
            ),
            "Monitoring"
        )

    # ========================================================
    # SENSOR-SPECIFIC RECOMMENDATIONS
    # ========================================================

    if temperature is not None:

        try:
            temperature = float(temperature)

            if temperature > 40.0:

                add_recommendation(
                    recommendations,
                    "HIGH",
                    "Elevated temperature indicator",
                    (
                        "Body temperature is above the configured "
                        "prototype threshold. Verify the reading "
                        "and assess the animal clinically."
                    ),
                    "Temperature"
                )

        except (TypeError, ValueError):
            pass

    if ec is not None:

        try:
            ec = float(ec)

            if ec >= 7.0:

                add_recommendation(
                    recommendations,
                    "MEDIUM",
                    "Elevated conductivity indicator",
                    (
                        "Milk conductivity is elevated relative "
                        "to the prototype threshold. Review milk "
                        "quality trends and verify the measurement."
                    ),
                    "Milk Quality"
                )

        except (TypeError, ValueError):
            pass

    if ph is not None:

        try:
            ph = float(ph)

            if abs(ph - 7.0) >= 4.0:

                add_recommendation(
                    recommendations,
                    "MEDIUM",
                    "Abnormal pH indicator",
                    (
                        "Milk pH is outside the prototype reference "
                        "range. Verify the sensor and review milk quality."
                    ),
                    "Milk Quality"
                )

        except (TypeError, ValueError):
            pass

    if scc is not None:

        try:
            scc = float(scc)

            if scc >= 70.0:

                add_recommendation(
                    recommendations,
                    "HIGH",
                    "Elevated SCC indicator",
                    (
                        "The prototype SCC indicator is elevated. "
                        "Confirm with an appropriate SCC/laboratory "
                        "measurement before clinical decisions."
                    ),
                    "SCC"
                )

        except (TypeError, ValueError):
            pass

    if activity is not None:

        try:
            activity = float(activity)

            if activity < 30:

                add_recommendation(
                    recommendations,
                    "MEDIUM",
                    "Reduced activity",
                    (
                        "Activity is lower than the configured "
                        "prototype baseline. Check animal behaviour "
                        "and overall health."
                    ),
                    "Behaviour"
                )

        except (TypeError, ValueError):
            pass

    if rumination is not None:

        try:
            rumination = float(rumination)

            if rumination < 30:

                add_recommendation(
                    recommendations,
                    "MEDIUM",
                    "Reduced rumination",
                    (
                        "Rumination is lower than the configured "
                        "baseline. Review feeding, comfort and health."
                    ),
                    "Rumination"
                )

        except (TypeError, ValueError):
            pass

    # ========================================================
    # TIMESTAMP
    # ========================================================

    return {
        "generated_at":
            datetime.utcnow().isoformat(),

        "animal_id":
            getattr(animal, "id", None)
            if animal
            else None,

        "tag_id":
            getattr(animal, "tag_id", None)
            if animal
            else None,

        "risk_score":
            round(risk_score, 1),

        "risk_level":
            risk_level,

        "recommendations":
            recommendations
    }


# ============================================================
# HERD RECOMMENDATIONS
# ============================================================

def generate_herd_recommendations(
    animals=None,
    active_alert_count=0,
    high_risk_count=0,
    moderate_risk_count=0
):
    """
    Generate herd-level preventive recommendations.
    """

    recommendations = []

    animals = animals or []

    if high_risk_count > 0:

        add_recommendation(
            recommendations,
            "URGENT",
            "Prioritize high-risk animals",
            (
                f"{high_risk_count} animal(s) are currently "
                "in the high-risk category. Review them first "
                "and escalate for veterinary assessment where indicated."
            ),
            "Herd Health"
        )

    if moderate_risk_count > 0:

        add_recommendation(
            recommendations,
            "HIGH",
            "Increase herd surveillance",
            (
                f"{moderate_risk_count} animal(s) are in the "
                "moderate-risk category. Increase monitoring "
                "and investigate common management factors."
            ),
            "Herd Monitoring"
        )

    if active_alert_count > 0:

        add_recommendation(
            recommendations,
            "HIGH",
            "Review active alerts",
            (
                f"There are currently {active_alert_count} "
                "unresolved alert(s) in the system."
            ),
            "Alerts"
        )

    add_recommendation(
        recommendations,
        "MEDIUM",
        "Review hygiene and milking procedures",
        (
            "Check bedding, teat preparation, equipment sanitation, "
            "milking order, worker hygiene and post-milking procedures."
        ),
        "Farm Management"
    )

    add_recommendation(
        recommendations,
        "MEDIUM",
        "Review environment",
        (
            "Check housing cleanliness, ventilation, moisture, "
            "heat stress and stocking conditions."
        ),
        "Environment"
    )

    add_recommendation(
        recommendations,
        "MEDIUM",
        "Review nutrition",
        (
            "Check feed consistency, ration balance, water access "
            "and possible nutrition-related stressors."
        ),
        "Nutrition"
    )

    return {
        "generated_at":
            datetime.utcnow().isoformat(),

        "animal_count":
            len(animals),

        "active_alert_count":
            active_alert_count,

        "high_risk_count":
            high_risk_count,

        "moderate_risk_count":
            moderate_risk_count,

        "recommendations":
            recommendations
    }