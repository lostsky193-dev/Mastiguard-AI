"""
Mastiguard-AI
Bovine Mastitis Early Warning & Herd Intelligence Platform

Version 1:
- Flask backend
- SQLite local database
- ESP32 sensor ingestion
- Live risk calculation
- Animal-wise risk
- Herd-level risk
- Alerts
- Dashboard API
"""

from datetime import datetime
from pathlib import Path
import logging
import os

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

# ============================================================
# SERVICES
# ============================================================

from services.alerts import (
    create_risk_alert,
    get_active_alerts,
    get_active_alert_count,
    serialize_alert,
    resolve_alert,
)

from services.recommendations import (
    generate_recommendations,
    generate_herd_recommendations,
)

from services.forecasting import (
    forecast_risk_history,
)


# ============================================================
# APPLICATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

app = Flask(__name__)

CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"sqlite:///{DATA_DIR / 'mastiguard.db'}"
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger("mastiguard")


# ============================================================
# RISK CALCULATION
# Matches the current ESP32 prototype logic
# ============================================================

TEMP_WEIGHT = 0.25
EC_WEIGHT = 0.20
PH_WEIGHT = 0.20
SCC_WEIGHT = 0.35


def clamp(value, minimum=0.0, maximum=100.0):
    return max(minimum, min(maximum, value))


def temperature_risk(temperature):

    if temperature <= 38.0:
        return 10.0

    elif temperature <= 39.0:
        return 30.0

    elif temperature <= 40.0:
        return 55.0

    elif temperature <= 41.0:
        return 75.0

    else:
        return 100.0


def ec_risk(ec):

    return clamp(
        (ec / 10.0) * 100.0
    )


def ph_risk(ph):

    distance = abs(ph - 7.0)

    return clamp(
        (distance / 7.0) * 100.0
    )


def scc_risk(scc):

    return clamp(scc)


def calculate_risk(
    temperature,
    ec,
    ph,
    scc
):

    temp_score = temperature_risk(
        temperature
    )

    ec_score = ec_risk(
        ec
    )

    ph_score = ph_risk(
        ph
    )

    scc_score = scc_risk(
        scc
    )

    score = (
        temp_score * TEMP_WEIGHT
        + ec_score * EC_WEIGHT
        + ph_score * PH_WEIGHT
        + scc_score * SCC_WEIGHT
    )

    score = round(
        clamp(score),
        1
    )

    if score >= 70:

        level = "HIGH RISK"

    elif score >= 45:

        level = "MODERATE RISK"

    elif score >= 25:

        level = "LOW RISK"

    else:

        level = "NO RISK"

    return {

        "risk_score": score,

        "risk_level": level,

        "temperature_risk":
            round(
                temp_score,
                1
            ),

        "ec_risk":
            round(
                ec_score,
                1
            ),

        "ph_risk":
            round(
                ph_score,
                1
            ),

        "scc_risk":
            round(
                scc_score,
                1
            ),

    }


# ============================================================
# DATABASE MODELS
# ============================================================

class Animal(db.Model):

    __tablename__ = "animals"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    tag_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(100)
    )

    breed = db.Column(
        db.String(100)
    )

    age = db.Column(
        db.Float
    )

    lactation_number = db.Column(
        db.Integer
    )

    farm_id = db.Column(
        db.String(100),
        default="FARM-001"
    )

    last_risk_score = db.Column(
        db.Float
    )

    last_risk_level = db.Column(
        db.String(30)
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


class SensorReading(db.Model):

    __tablename__ = "sensor_readings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    animal_id = db.Column(
        db.Integer,
        db.ForeignKey("animals.id"),
        nullable=False
    )

    temperature = db.Column(
        db.Float
    )

    ec = db.Column(
        db.Float
    )

    ph = db.Column(
        db.Float
    )

    scc = db.Column(
        db.Float
    )

    risk_score = db.Column(
        db.Float
    )

    risk_level = db.Column(
        db.String(30)
    )

    temperature_risk = db.Column(
        db.Float
    )

    ec_risk = db.Column(
        db.Float
    )

    ph_risk = db.Column(
        db.Float
    )

    scc_risk = db.Column(
        db.Float
    )

    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    source = db.Column(
        db.String(30),
        default="esp32"
    )


class Alert(db.Model):

    __tablename__ = "alerts"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    animal_id = db.Column(
        db.Integer,
        db.ForeignKey("animals.id"),
        nullable=False
    )

    alert_type = db.Column(
        db.String(50)
    )

    severity = db.Column(
        db.String(30)
    )

    message = db.Column(
        db.Text
    )

    resolved = db.Column(
        db.Boolean,
        default=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

with app.app_context():

    db.create_all()

    if Animal.query.count() == 0:

        demo_animals = [

            Animal(
                tag_id="COW-001",
                name="Lakshmi",
                breed="Sahiwal",
                age=4.0,
                lactation_number=2,
                farm_id="FARM-001"
            ),

            Animal(
                tag_id="COW-002",
                name="Ganga",
                breed="HF Cross",
                age=5.0,
                lactation_number=3,
                farm_id="FARM-001"
            ),

            Animal(
                tag_id="COW-003",
                name="Yamuna",
                breed="Jersey",
                age=3.0,
                lactation_number=1,
                farm_id="FARM-001"
            ),

            Animal(
                tag_id="BUF-001",
                name="Kaveri",
                breed="Murrah Buffalo",
                age=6.0,
                lactation_number=4,
                farm_id="FARM-001"
            )

        ]

        db.session.add_all(
            demo_animals
        )

        db.session.commit()

        logger.info(
            "Demo animals created."
        )


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_animal_by_tag(tag_id):

    return (
        Animal.query
        .filter_by(
            tag_id=tag_id
        )
        .first()
    )


def latest_reading(animal_id):

    return (
        SensorReading.query
        .filter_by(
            animal_id=animal_id
        )
        .order_by(
            SensorReading.timestamp.desc()
        )
        .first()
    )


# ============================================================
# ROUTES
# ============================================================

@app.route("/")
def index():

    return render_template(
        "dashboard.html"
    )


@app.route("/health")
def health():

    return jsonify({

        "status": "online",

        "service": "Mastiguard-AI",

        "timestamp":
            datetime.utcnow().isoformat()

    })


# ============================================================
# ESP32 INGESTION API
# ============================================================

@app.route(
    "/api/esp32/data",
    methods=["POST"]
)
def esp32_data():

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify({

            "status": "error",

            "message":
                "JSON data required"

        }), 400


    tag_id = str(
        data.get(
            "tag_id",
            "COW-001"
        )
    )


    # --------------------------------------------------------
    # VALIDATE SENSOR VALUES
    # --------------------------------------------------------

    try:

        temperature = float(
            data["temperature"]
        )

        ec = float(
            data["ec"]
        )

        ph = float(
            data["ph"]
        )

        scc = float(
            data["scc"]
        )

    except (
        KeyError,
        TypeError,
        ValueError
    ):

        return jsonify({

            "status": "error",

            "message": (
                "temperature, ec, ph and scc "
                "must be valid numbers"
            )

        }), 400


    # --------------------------------------------------------
    # FIND / CREATE ANIMAL
    # --------------------------------------------------------

    animal = get_animal_by_tag(
        tag_id
    )


    if animal is None:

        animal = Animal(

            tag_id=tag_id,

            name=data.get(
                "name",
                tag_id
            ),

            breed=data.get(
                "breed",
                "Unknown"
            ),

            age=data.get(
                "age"
            ),

            lactation_number=data.get(
                "lactation_number"
            ),

            farm_id=data.get(
                "farm_id",
                "FARM-001"
            )

        )

        db.session.add(
            animal
        )

        db.session.commit()


    # --------------------------------------------------------
    # RISK CALCULATION
    # --------------------------------------------------------

    risk = calculate_risk(

        temperature,

        ec,

        ph,

        scc

    )


    # --------------------------------------------------------
    # SENSOR READING
    # --------------------------------------------------------

    reading = SensorReading(

        animal_id=animal.id,

        temperature=temperature,

        ec=ec,

        ph=ph,

        scc=scc,

        risk_score=
            risk["risk_score"],

        risk_level=
            risk["risk_level"],

        temperature_risk=
            risk["temperature_risk"],

        ec_risk=
            risk["ec_risk"],

        ph_risk=
            risk["ph_risk"],

        scc_risk=
            risk["scc_risk"],

        source=data.get(
            "source",
            "esp32"
        )

    )

    db.session.add(
        reading
    )


    # --------------------------------------------------------
    # UPDATE ANIMAL
    # --------------------------------------------------------

    animal.last_risk_score = (
        risk["risk_score"]
    )

    animal.last_risk_level = (
        risk["risk_level"]
    )


    # --------------------------------------------------------
    # ALERT
    #
    # Alert logic is handled by services.alerts.
    # app.py passes dependencies explicitly so there is
    # NO services.alerts -> app.py circular import.
    # --------------------------------------------------------

    alert = create_risk_alert(

        db=db,

        Alert=Alert,

        Animal=Animal,

        animal=animal,

        risk_score=
            risk["risk_score"],

        risk_level=
            risk["risk_level"],

        temperature=temperature,

        ec=ec,

        ph=ph,

        scc=scc

    )


    # --------------------------------------------------------
    # COMMIT
    # --------------------------------------------------------

    db.session.commit()


    logger.info(

        "ESP32 | %s | "
        "T=%.1f EC=%.2f pH=%.2f SCC=%.1f | "
        "%s %.1f",

        tag_id,

        temperature,

        ec,

        ph,

        scc,

        risk["risk_level"],

        risk["risk_score"]

    )


    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return jsonify({

        "status":
            "success",

        "animal": {

            "id":
                animal.id,

            "tag_id":
                animal.tag_id,

            "name":
                animal.name

        },

        "readings": {

            "temperature":
                temperature,

            "ec":
                ec,

            "ph":
                ph,

            "scc":
                scc

        },

        "risk":
            risk,

        "alert": (

            {

                "id":
                    alert.id,

                "severity":
                    alert.severity,

                "type":
                    alert.alert_type,

                "message":
                    alert.message,

                "resolved":
                    bool(
                        alert.resolved
                    )

            }

            if alert

            else None

        ),

        "timestamp":
            reading.timestamp.isoformat()

    })


# ============================================================
# DASHBOARD CURRENT DATA
# ============================================================

@app.route("/api/dashboard")
def dashboard_data():

    animals = (
        Animal.query.all()
    )

    result = []


    for animal in animals:

        reading = latest_reading(
            animal.id
        )


        result.append({

            "id":
                animal.id,

            "tag_id":
                animal.tag_id,

            "name":
                animal.name,

            "breed":
                animal.breed,

            "age":
                animal.age,

            "lactation_number":
                animal.lactation_number,

            "farm_id":
                animal.farm_id,

            "risk_score":
                animal.last_risk_score,

            "risk_level":
                animal.last_risk_level,

            "latest": (

                {

                    "temperature":
                        reading.temperature,

                    "ec":
                        reading.ec,

                    "ph":
                        reading.ph,

                    "scc":
                        reading.scc,

                    "risk_score":
                        reading.risk_score,

                    "risk_level":
                        reading.risk_level,

                    "timestamp":
                        reading.timestamp.isoformat()

                }

                if reading

                else None

            )

        })


    # ========================================================
    # HERD SUMMARY
    # ========================================================

    total = len(
        animals
    )


    no_risk = sum(

        1

        for a in animals

        if a.last_risk_level
        == "NO RISK"

    )


    low = sum(

        1

        for a in animals

        if a.last_risk_level
        == "LOW RISK"

    )


    moderate = sum(

        1

        for a in animals

        if a.last_risk_level
        == "MODERATE RISK"

    )


    high = sum(

        1

        for a in animals

        if a.last_risk_level
        == "HIGH RISK"

    )


    scores = [

        a.last_risk_score

        for a in animals

        if a.last_risk_score
        is not None

    ]


    herd_risk = (

        round(
            sum(scores) /
            len(scores),
            1
        )

        if scores

        else 0

    )


    return jsonify({

        "system": {

            "online":
                True,

            "device":
                "ESP32 DOIT DEVKIT V1"

        },

        "herd": {

            "total_animals":
                total,

            "herd_risk":
                herd_risk,

            "counts": {

                "NO RISK":
                    no_risk,

                "LOW RISK":
                    low,

                "MODERATE RISK":
                    moderate,

                "HIGH RISK":
                    high

            }

        },

        "animals":
            result

    })


# ============================================================
# HISTORICAL DATA
# ============================================================

@app.route(
    "/api/history/<tag_id>"
)
def history(tag_id):

    animal = get_animal_by_tag(
        tag_id
    )


    if animal is None:

        return jsonify({

            "status":
                "error",

            "message":
                "Animal not found"

        }), 404


    readings = (

        SensorReading.query

        .filter_by(
            animal_id=animal.id
        )

        .order_by(
            SensorReading.timestamp.asc()
        )

        .limit(100)

        .all()

    )


    return jsonify({

        "tag_id":
            tag_id,

        "readings": [

            {

                "temperature":
                    r.temperature,

                "ec":
                    r.ec,

                "ph":
                    r.ph,

                "scc":
                    r.scc,

                "risk_score":
                    r.risk_score,

                "risk_level":
                    r.risk_level,

                "timestamp":
                    r.timestamp.isoformat()

            }

            for r in readings

        ]

    })


# ============================================================
# ACTIVE ALERTS
# ============================================================

@app.route(
    "/api/alerts"
)
def alerts():

    active_alerts = get_active_alerts(
        Alert
    )


    return jsonify({

        "count":
            get_active_alert_count(
                db,
                Alert
            ),

        "alerts": [

            serialize_alert(
                Animal,
                alert
            )

            for alert in active_alerts

        ]

    })


# ============================================================
# RESOLVE ALERT
# ============================================================

@app.route(
    "/api/alerts/<int:alert_id>/resolve",
    methods=["POST"]
)
def resolve_alert_api(
    alert_id
):

    alert = resolve_alert(

        db,

        Alert,

        alert_id

    )


    if alert is None:

        return jsonify({

            "status":
                "error",

            "message":
                "Alert not found"

        }), 404


    return jsonify({

        "status":
            "success",

        "alert":
            serialize_alert(
                Animal,
                alert
            )

    })


# ============================================================
# SERVER
# ============================================================

if __name__ == "__main__":

    port = int(

        os.environ.get(
            "PORT",
            5000
        )

    )


    app.run(

        host="0.0.0.0",

        port=port,

        debug=True

    )