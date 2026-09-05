"""
Mastiguard-AI
Alert Service

Important:
This module must NOT import app.py.
Dependencies are passed into functions.
"""

from sqlalchemy import func


MODERATE_THRESHOLD = 45.0
HIGH_THRESHOLD = 70.0


# ============================================================
# CREATE ALERT
# ============================================================

def create_risk_alert(
    db,
    Alert,
    Animal,
    animal,
    risk_score,
    risk_level,
    temperature=None,
    ec=None,
    ph=None,
    scc=None
):
    """
    Create an unresolved alert for moderate/high risk.
    Avoid duplicate unresolved alerts of the same severity.
    """

    if risk_level not in (
        "MODERATE RISK",
        "HIGH RISK"
    ):
        return None

    severity = (
        "HIGH"
        if risk_level == "HIGH RISK"
        else "MODERATE"
    )

    existing = (
        Alert.query
        .filter_by(
            animal_id=animal.id,
            alert_type="MASTITIS_RISK",
            severity=severity,
            resolved=False
        )
        .order_by(
            Alert.created_at.desc()
        )
        .first()
    )

    if existing:
        return existing

    message_parts = [
        (
            f"{animal.name or animal.tag_id} "
            f"is currently classified as "
            f"{risk_level.lower()} "
            f"with risk score {float(risk_score):.1f}/100."
        )
    ]

    factors = []

    if temperature is not None:
        try:
            if float(temperature) > 40.0:
                factors.append(
                    f"temperature {float(temperature):.1f}°C"
                )
        except (TypeError, ValueError):
            pass

    if ec is not None:
        try:
            if float(ec) >= 7.0:
                factors.append(
                    f"EC {float(ec):.2f} mS/cm"
                )
        except (TypeError, ValueError):
            pass

    if ph is not None:
        try:
            if abs(float(ph) - 7.0) >= 4.0:
                factors.append(
                    f"pH {float(ph):.2f}"
                )
        except (TypeError, ValueError):
            pass

    if scc is not None:
        try:
            if float(scc) >= 70.0:
                factors.append(
                    f"SCC demo value {float(scc):.1f}"
                )
        except (TypeError, ValueError):
            pass

    if factors:
        message_parts.append(
            "Contributing indicators: "
            + ", ".join(factors)
            + "."
        )

    message_parts.append(
        "Review the animal and consider veterinary "
        "evaluation when clinically warranted."
    )

    alert = Alert(
        animal_id=animal.id,
        alert_type="MASTITIS_RISK",
        severity=severity,
        message=" ".join(message_parts),
        resolved=False
    )

    db.session.add(alert)

    return alert


# ============================================================
# RESOLVE ALERT
# ============================================================

def resolve_alert(
    db,
    Alert,
    alert_id
):
    """Resolve an existing alert."""

    alert = Alert.query.get(alert_id)

    if alert is None:
        return None

    alert.resolved = True

    db.session.commit()

    return alert


# ============================================================
# ACTIVE ALERTS
# ============================================================

def get_active_alerts(
    Alert,
    limit=100
):
    """Return unresolved alerts."""

    return (
        Alert.query
        .filter_by(
            resolved=False
        )
        .order_by(
            Alert.created_at.desc()
        )
        .limit(limit)
        .all()
    )


# ============================================================
# ACTIVE ALERT COUNT
# ============================================================

def get_active_alert_count(
    db,
    Alert
):
    """Return number of active unresolved alerts."""

    return (
        db.session.query(
            func.count(Alert.id)
        )
        .filter(
            Alert.resolved.is_(False)
        )
        .scalar()
        or 0
    )


# ============================================================
# SERIALIZE ALERT
# ============================================================

def serialize_alert(
    Animal,
    alert
):
    """Convert Alert database object to JSON."""

    animal = Animal.query.get(
        alert.animal_id
    )

    return {
        "id": alert.id,

        "animal_id":
            alert.animal_id,

        "tag_id":
            animal.tag_id
            if animal
            else None,

        "animal_name":
            animal.name
            if animal
            else None,

        "severity":
            alert.severity,

        "type":
            alert.alert_type,

        "message":
            alert.message,

        "resolved":
            bool(alert.resolved),

        "created_at":
            (
                alert.created_at.isoformat()
                if alert.created_at
                else None
            )
    }