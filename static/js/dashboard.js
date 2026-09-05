"use strict";

// ============================================================
// MASTIGUARD-AI DASHBOARD
// ============================================================

let dashboardData = null;

let riskChart = null;
let sensorChart = null;
let herdChart = null;
let herdTrendChart = null;
let forecastChart = null;
let milkTrendChart = null;

let farmMap = null;


// ============================================================
// HELPERS
// ============================================================

function el(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = el(id);

    if (element) {
        element.textContent = value;
    }
}


function number(value, decimals = 1) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "--";
    }

    return Number(value).toFixed(decimals);
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function riskClass(level) {

    if (level === "HIGH RISK") {
        return "high";
    }

    if (level === "MODERATE RISK") {
        return "moderate";
    }

    if (level === "LOW RISK") {
        return "low";
    }

    return "no";
}


function getRiskLabel(score) {

    if (
        score === null ||
        score === undefined ||
        Number.isNaN(Number(score))
    ) {
        return "NO DATA";
    }

    score = Number(score);

    if (score >= 70) {
        return "HIGH RISK";
    }

    if (score >= 45) {
        return "MODERATE RISK";
    }

    if (score >= 25) {
        return "LOW RISK";
    }

    return "NO RISK";
}


function getAnimalRecommendation(animal) {

    const score = Number(animal?.risk_score);

    const latest = animal?.latest || {};

    if (Number.isNaN(score)) {
        return "Waiting for sufficient sensor data for an AI risk assessment.";
    }

    if (score >= 70) {

        return (
            "High-risk indicators detected. " +
            "Inspect the animal promptly, review milk-quality indicators " +
            "and consider qualified veterinary assessment."
        );

    }

    if (score >= 45) {

        return (
            "Moderate-risk indicators detected. " +
            "Monitor the animal closely and review recent EC, pH, SCC " +
            "and temperature trends."
        );

    }

    if (score >= 25) {

        return (
            "Low-level risk indicators detected. " +
            "Continue routine monitoring and check for increasing trends."
        );

    }

    return (
        "Current prototype indicators do not show elevated mastitis risk. " +
        "Continue normal monitoring."
    );

}


// ============================================================
// DATE
// ============================================================

function updateDate() {

    const now = new Date();

    setText(
        "currentDate",
        now.toLocaleDateString(
            undefined,
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        )
    );

}


function updateSync() {

    setText(
        "lastSync",
        new Date().toLocaleTimeString()
    );

}


// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {

    document
        .querySelectorAll(".nav-link")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showPage(
                        button.dataset.page
                    );

                }
            );

        });


    document
        .querySelectorAll("[data-jump]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    showPage(
                        button.dataset.jump
                    );

                }
            );

        });


    const mobileMenu = el("mobileMenu");

    if (mobileMenu) {

        mobileMenu.addEventListener(
            "click",
            () => {

                el("sidebar")
                    ?.classList
                    .toggle("open");

            }
        );

    }

}


function showPage(pageName) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove(
                "active-page"
            );

        });


    const page =
        el(`page-${pageName}`);


    if (page) {

        page.classList.add(
            "active-page"
        );

    }


    document
        .querySelectorAll(".nav-link")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.page === pageName
            );

        });


    const titles = {

        overview: "Herd Overview",
        animals: "Animal Monitor",
        herd: "Herd Risk",
        forecast: "7–14 Day Forecast",
        milk: "Milk Intelligence",
        health: "Animal Health",
        environment: "Environment",
        nutrition: "Feeding & Nutrition",
        hygiene: "Housing & Hygiene",
        milking: "Milking Operations",
        records: "Health Records",
        alerts: "Alert Center",
        recommendations: "Recommendations",
        gis: "GIS & Risk Hotspots",
        ai: "AI Model Intelligence",
        reports: "Reports",
        settings: "Settings"

    };


    setText(
        "pageTitle",
        titles[pageName] ||
        "Mastiguard-AI"
    );


    if (pageName === "gis") {

        setTimeout(
            initializeMap,
            100
        );

    }


    el("sidebar")
        ?.classList
        .remove("open");

}


// ============================================================
// DASHBOARD API
// ============================================================

async function loadDashboard() {

    try {

        const response =
            await fetch(
                "/api/dashboard",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Dashboard HTTP ${response.status}`
            );

        }


        dashboardData =
            await response.json();


        updateDashboard(
            dashboardData
        );


        updateSync();


        setText(
            "espStatus",
            "API connected"
        );


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        setText(
            "espStatus",
            "Waiting for data"
        );

    }

}


// ============================================================
// UPDATE DASHBOARD
// ============================================================

function updateDashboard(data) {

    const herd =
        data.herd || {};

    const counts =
        herd.counts || {};

    const animals =
        Array.isArray(data.animals)
            ? data.animals
            : [];


    const total =
        Number(
            herd.total_animals || animals.length || 0
        );


    const noRisk =
        Number(
            counts["NO RISK"] || 0
        );


    const lowRisk =
        Number(
            counts["LOW RISK"] || 0
        );


    const moderateRisk =
        Number(
            counts["MODERATE RISK"] || 0
        );


    const highRisk =
        Number(
            counts["HIGH RISK"] || 0
        );


    // ========================================================
    // OVERVIEW KPI
    // ========================================================

    setText(
        "totalAnimals",
        total
    );


    setText(
        "noRisk",
        noRisk
    );


    setText(
        "moderateRisk",
        moderateRisk
    );


    setText(
        "highRisk",
        highRisk
    );


    // ========================================================
    // HERD RISK
    // ========================================================

    const herdRisk =
        Number(
            herd.herd_risk || 0
        );


    setText(
        "herdRisk",
        Math.round(herdRisk)
    );


    const herdLevel =
        getRiskLabel(
            herdRisk
        );


    setText(
        "herdRiskLevel",
        herdLevel
    );


    setText(
        "herdRiskDescription",
        herdDescription(herdLevel)
    );


    updateRiskRing(
        herdRisk
    );


    // ========================================================
    // ANIMAL PAGE
    // ========================================================

    setText(
        "animalsTotal",
        total
    );


    setText(
        "animalsHigh",
        highRisk
    );


    setText(
        "animalsModerate",
        moderateRisk
    );


    setText(
        "animalsStable",
        noRisk + lowRisk
    );


    // ========================================================
    // HERD PAGE
    // ========================================================

    setText(
        "herdPageRisk",
        Math.round(herdRisk)
    );


    setText(
        "herdPageHigh",
        highRisk
    );


    setText(
        "herdPageModerate",
        moderateRisk
    );


    setText(
        "herdPageStable",
        noRisk + lowRisk
    );


    // ========================================================
    // ANIMAL DATA
    // ========================================================

    renderAnimalTable(
        animals
    );


    renderTopAnimals(
        animals
    );


    updateLiveSensor(
        animals
    );


    updateCharts(
        animals
    );


    updateHerdChart(
        counts
    );


    updateMilkPage(
        animals
    );


    updateAnimalHealth(
        animals
    );


    updateEnvironment(
        data
    );


    updateNutrition(
        data
    );


    updateHygiene(
        data
    );


    updateAdvancedModules(
        data
    );

}


// ============================================================
// HERD DESCRIPTION
// ============================================================

function herdDescription(level) {

    if (level === "HIGH RISK") {

        return (
            "The current herd profile shows elevated " +
            "prototype mastitis risk indicators."
        );

    }


    if (level === "MODERATE RISK") {

        return (
            "The current herd profile requires closer " +
            "monitoring of risk indicators."
        );

    }


    if (level === "LOW RISK") {

        return (
            "The current herd profile shows a relatively " +
            "low prototype risk level."
        );

    }


    if (level === "NO RISK") {

        return (
            "No elevated risk is currently indicated " +
            "by the active prototype inputs."
        );

    }


    return (
        "Waiting for live sensor readings."
    );

}


// ============================================================
// RISK RING
// ============================================================

function updateRiskRing(score) {

    const ring =
        el("riskRing") ||
        document.querySelector(
            ".risk-ring"
        );


    if (!ring) {
        return;
    }


    const safeScore =
        Math.max(
            0,
            Math.min(
                100,
                Number(score) || 0
            )
        );


    ring.style.background =
        `conic-gradient(var(--gold) ${safeScore}%, var(--surface-2) ${safeScore}% 100%)`;

}


// ============================================================
// LIVE SENSOR
// ============================================================

function updateLiveSensor(animals) {

    const available =
        animals.filter(
            animal =>
                animal.latest !== null &&
                animal.latest !== undefined
        );


    if (!available.length) {
        return;
    }


    const animal =
        available[0];


    const latest =
        animal.latest || {};


    // --------------------------------------------------------
    // Temperature
    // --------------------------------------------------------

    setText(
        "liveTemperature",
        number(
            latest.temperature,
            1
        )
    );


    // --------------------------------------------------------
    // EC
    // --------------------------------------------------------

    setText(
        "liveEC",
        number(
            latest.ec,
            2
        )
    );


    // --------------------------------------------------------
    // pH
    // --------------------------------------------------------

    setText(
        "livePH",
        number(
            latest.ph,
            2
        )
    );


    // --------------------------------------------------------
    // SCC
    // --------------------------------------------------------

    setText(
        "liveSCC",
        number(
            latest.scc,
            1
        )
    );


    // --------------------------------------------------------
    // Risk
    // --------------------------------------------------------

    setText(
        "liveRisk",
        `${number(
            animal.risk_score,
            1
        )} / 100`
    );


    setText(
        "liveRiskLevel",
        animal.risk_level ||
        getRiskLabel(
            animal.risk_score
        )
    );


    // --------------------------------------------------------
    // Milk page
    // --------------------------------------------------------

    setText(
        "milkEC",
        number(
            latest.ec,
            2
        )
    );


    setText(
        "milkPH",
        number(
            latest.ph,
            2
        )
    );


    setText(
        "milkSCC",
        number(
            latest.scc,
            1
        )
    );


    // --------------------------------------------------------
    // Health
    // --------------------------------------------------------

    const temperature =
        number(
            latest.temperature,
            1
        );


    setText(
        "healthTemperature",
        temperature === "--"
            ? "--"
            : temperature + " °C"
    );


    // --------------------------------------------------------
    // Environment
    // --------------------------------------------------------

    setText(
        "environmentTemperature",
        temperature === "--"
            ? "--"
            : temperature + " °C"
    );


    // --------------------------------------------------------
    // ESP32
    // --------------------------------------------------------

    setText(
        "espStatus",
        `Live • ${animal.tag_id || "Animal"}`
    );

}


// ============================================================
// ANIMAL TABLE
// ============================================================

function renderAnimalTable(animals) {

    const tbody =
        el("animalTable");


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!animals.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty">
                        No animals available.
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    animals.forEach(
        (animal, index) => {

            const latest =
                animal.latest || null;


            const level =
                animal.risk_level ||
                getRiskLabel(
                    animal.risk_score
                );


            const chip =
                riskClass(
                    level
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.dataset.tagId =
                animal.tag_id || "";


            row.dataset.animalIndex =
                index;


            row.style.cursor =
                "pointer";


            row.title =
                "Click to view animal details";


            row.innerHTML = `

                <td>

                    <div class="animal-table-name">

                        <strong>
                            ${escapeHTML(
                                animal.tag_id || "-"
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                animal.name || "Animal"
                            )}
                        </small>

                    </div>

                </td>


                <td>
                    ${escapeHTML(
                        animal.breed || "-"
                    )}
                </td>


                <td>
                    ${
                        animal.lactation_number ??
                        "-"
                    }
                </td>


                <td>
                    ${
                        latest
                        ? formatTemperature(
                            latest.temperature
                        )
                        : "-"
                    }
                </td>


                <td>
                    ${
                        latest
                        ? number(
                            latest.ec,
                            2
                        )
                        : "-"
                    }
                </td>


                <td>
                    ${
                        latest
                        ? number(
                            latest.ph,
                            2
                        )
                        : "-"
                    }
                </td>


                <td>
                    ${
                        latest
                        ? number(
                            latest.scc,
                            1
                        )
                        : "-"
                    }
                </td>


                <td>
                    ${
                        animal.risk_score !== null &&
                        animal.risk_score !== undefined
                        ? number(
                            animal.risk_score,
                            1
                        )
                        : "-"
                    }
                </td>


                <td>

                    <span
                        class="risk-chip ${chip}"
                    >
                        ${escapeHTML(
                            level
                        )}
                    </span>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


function formatTemperature(value) {

    const temp =
        number(
            value,
            1
        );


    if (temp === "--") {
        return "--";
    }


    return `${temp} °C`;

}


// ============================================================
// ANIMAL DETAIL MODAL
// ============================================================

function createAnimalModal() {

    if (el("animalDetailModal")) {
        return;
    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "animalDetailModal";


    modal.innerHTML = `

        <div
            id="animalDetailBackdrop"
            style="
                position:fixed;
                inset:0;
                background:rgba(0,0,0,.65);
                z-index:9998;
                backdrop-filter:blur(4px);
            "
        ></div>


        <div
            id="animalDetailPanel"
            style="
                position:fixed;
                top:50%;
                left:50%;
                transform:translate(-50%,-50%);
                width:min(720px,92vw);
                max-height:88vh;
                overflow-y:auto;
                background:#101918;
                color:#fff;
                border:1px solid rgba(255,255,255,.12);
                border-radius:20px;
                box-shadow:0 25px 80px rgba(0,0,0,.55);
                z-index:9999;
                padding:26px;
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:20px;
                    margin-bottom:24px;
                "
            >

                <div>

                    <div
                        style="
                            font-size:11px;
                            letter-spacing:1.5px;
                            opacity:.65;
                            text-transform:uppercase;
                            margin-bottom:6px;
                        "
                    >
                        Individual Health Profile
                    </div>


                    <h2
                        id="detailAnimalTitle"
                        style="
                            margin:0;
                            font-size:26px;
                        "
                    >
                        Animal
                    </h2>


                    <div
                        id="detailAnimalSubtitle"
                        style="
                            margin-top:5px;
                            opacity:.65;
                        "
                    >
                        --
                    </div>

                </div>


                <button
                    id="closeAnimalDetail"
                    type="button"
                    style="
                        border:0;
                        background:rgba(255,255,255,.08);
                        color:#fff;
                        width:40px;
                        height:40px;
                        border-radius:10px;
                        cursor:pointer;
                        font-size:20px;
                    "
                    aria-label="Close"
                >
                    ×
                </button>

            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:repeat(4,minmax(0,1fr));
                    gap:12px;
                    margin-bottom:22px;
                "
            >

                <div class="animal-detail-stat">
                    <span>Risk Score</span>
                    <strong id="detailRiskScore">--</strong>
                </div>


                <div class="animal-detail-stat">
                    <span>Risk Level</span>
                    <strong id="detailRiskLevel">--</strong>
                </div>


                <div class="animal-detail-stat">
                    <span>Breed</span>
                    <strong id="detailBreed">--</strong>
                </div>


                <div class="animal-detail-stat">
                    <span>Lactation</span>
                    <strong id="detailLactation">--</strong>
                </div>

            </div>


            <div
                style="
                    font-size:11px;
                    text-transform:uppercase;
                    letter-spacing:1.5px;
                    opacity:.6;
                    margin-bottom:10px;
                "
            >
                Latest Sensor Readings
            </div>


            <div
                style="
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:12px;
                    margin-bottom:24px;
                "
            >

                <div class="animal-detail-reading">
                    <span>
                        Temperature
                    </span>
                    <strong id="detailTemperature">
                        --
                    </strong>
                </div>


                <div class="animal-detail-reading">
                    <span>
                        Milk EC
                    </span>
                    <strong id="detailEC">
                        --
                    </strong>
                </div>


                <div class="animal-detail-reading">
                    <span>
                        Milk pH
                    </span>
                    <strong id="detailPH">
                        --
                    </strong>
                </div>


                <div class="animal-detail-reading">
                    <span>
                        SCC
                    </span>
                    <strong id="detailSCC">
                        --
                    </strong>
                </div>

            </div>


            <div
                style="
                    padding:18px;
                    border-radius:14px;
                    background:rgba(255,255,255,.05);
                    border:1px solid rgba(255,255,255,.08);
                "
            >

                <div
                    style="
                        font-size:11px;
                        text-transform:uppercase;
                        letter-spacing:1.5px;
                        opacity:.6;
                        margin-bottom:8px;
                    "
                >
                    AI Recommendation
                </div>


                <p
                    id="detailRecommendation"
                    style="
                        margin:0;
                        line-height:1.6;
                        opacity:.9;
                    "
                >
                    --
                </p>

            </div>


            <div
                id="detailTimestamp"
                style="
                    margin-top:18px;
                    font-size:12px;
                    opacity:.5;
                "
            >
                --
            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    // --------------------------------------------------------
    // Modal CSS
    // --------------------------------------------------------

    const style =
        document.createElement(
            "style"
        );


    style.textContent = `

        .animal-detail-stat,
        .animal-detail-reading {

            background:
                rgba(255,255,255,.045);

            border:
                1px solid rgba(255,255,255,.07);

            border-radius:
                13px;

            padding:
                14px;

        }


        .animal-detail-stat span,
        .animal-detail-reading span {

            display:
                block;

            font-size:
                11px;

            opacity:
                .55;

            margin-bottom:
                6px;

        }


        .animal-detail-stat strong,
        .animal-detail-reading strong {

            display:
                block;

            font-size:
                17px;

        }


        @media (max-width:700px) {

            #animalDetailPanel {

                padding:
                    20px !important;

            }


            #animalDetailPanel > div:nth-child(3) {

                grid-template-columns:
                    repeat(2,minmax(0,1fr)) !important;

            }

        }

    `;


    document.head.appendChild(
        style
    );


    el("closeAnimalDetail")
        ?.addEventListener(
            "click",
            closeAnimalDetail
        );


    el("animalDetailBackdrop")
        ?.addEventListener(
            "click",
            closeAnimalDetail
        );


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                el("animalDetailModal")
            ) {

                closeAnimalDetail();

            }

        }
    );

}


function openAnimalDetail(animal) {

    if (!animal) {
        return;
    }


    createAnimalModal();


    const latest =
        animal.latest || {};


    const level =
        animal.risk_level ||
        getRiskLabel(
            animal.risk_score
        );


    setText(
        "detailAnimalTitle",
        animal.tag_id || "Animal"
    );


    setText(
        "detailAnimalSubtitle",
        animal.name
            ? animal.name
            : "Individual monitoring profile"
    );


    setText(
        "detailRiskScore",
        animal.risk_score !== null &&
        animal.risk_score !== undefined
            ? `${number(animal.risk_score, 1)} / 100`
            : "--"
    );


    setText(
        "detailRiskLevel",
        level
    );


    setText(
        "detailBreed",
        animal.breed || "--"
    );


    setText(
        "detailLactation",
        animal.lactation_number ??
        "--"
    );


    setText(
        "detailTemperature",
        latest.temperature !== undefined
            ? formatTemperature(
                latest.temperature
            )
            : "--"
    );


    setText(
        "detailEC",
        latest.ec !== undefined
            ? `${number(latest.ec, 2)} mS/cm`
            : "--"
    );


    setText(
        "detailPH",
        latest.ph !== undefined
            ? number(latest.ph, 2)
            : "--"
    );


    setText(
        "detailSCC",
        latest.scc !== undefined
            ? number(latest.scc, 1)
            : "--"
    );


    setText(
        "detailRecommendation",
        getAnimalRecommendation(
            animal
        )
    );


    if (latest.timestamp) {

        setText(
            "detailTimestamp",
            `Latest reading: ${new Date(
                latest.timestamp
            ).toLocaleString()}`
        );

    } else {

        setText(
            "detailTimestamp",
            "Latest reading: --"
        );

    }


    const modal =
        el("animalDetailModal");


    if (modal) {

        modal.style.display =
            "block";

        document.body.style.overflow =
            "hidden";

    }

}


function closeAnimalDetail() {

    const modal =
        el("animalDetailModal");


    if (modal) {

        modal.style.display =
            "none";

        document.body.style.overflow =
            "";

    }

}


// ============================================================
// ANIMAL ROW CLICK
// ============================================================

function setupAnimalInteractions() {

    const tbody =
        el("animalTable");


    if (!tbody) {
        return;
    }


    tbody.addEventListener(
        "click",
        event => {

            const row =
                event.target.closest(
                    "tr"
                );


            if (!row) {
                return;
            }


            const index =
                Number(
                    row.dataset.animalIndex
                );


            if (
                !dashboardData ||
                !Array.isArray(
                    dashboardData.animals
                )
            ) {
                return;
            }


            // Search/filter can change row positions,
            // so prefer tag ID when available.

            const tagId =
                row.dataset.tagId;


            let animal =
                dashboardData.animals.find(
                    item =>
                        String(item.tag_id) ===
                        String(tagId)
                );


            if (!animal) {

                animal =
                    dashboardData.animals[index];

            }


            openAnimalDetail(
                animal
            );

        }
    );

}


// ============================================================
// TOP ANIMALS
// ============================================================

function renderTopAnimals(animals) {

    const container =
        el("topAnimals");


    if (!container) {
        return;
    }


    const sorted =
        [...animals]
            .filter(
                animal =>
                    animal.risk_score !== null &&
                    animal.risk_score !== undefined
            )
            .sort(
                (a, b) =>
                    Number(b.risk_score) -
                    Number(a.risk_score)
            )
            .slice(0, 5);


    if (!sorted.length) {

        container.innerHTML = `
            <div class="empty">
                Waiting for sensor data.
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    sorted.forEach(
        animal => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "animal-mini";


            item.style.cursor =
                "pointer";


            item.title =
                "View animal details";


            item.innerHTML = `

                <div class="animal-mini-left">

                    <div class="animal-avatar">
                        <i class="bi bi-cow"></i>
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(
                                animal.tag_id
                            )}
                        </strong>

                        <small>
                            ${escapeHTML(
                                animal.name || "Animal"
                            )}
                        </small>

                    </div>

                </div>


                <span
                    class="risk-chip ${
                        riskClass(
                            animal.risk_level ||
                            getRiskLabel(
                                animal.risk_score
                            )
                        )
                    }"
                >
                    ${number(
                        animal.risk_score,
                        1
                    )}
                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    openAnimalDetail(
                        animal
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}


// ============================================================
// ALERTS
// ============================================================

async function loadAlerts() {

    try {

        const response =
            await fetch(
                "/api/alerts",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Alert HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const alerts =
            data.alerts || [];


        setText(
            "alertCount",
            alerts.length
        );


        renderOverviewAlerts(
            alerts
        );


        renderFullAlerts(
            alerts
        );


    } catch (error) {

        console.error(
            "Alert error:",
            error
        );

    }

}


// ============================================================
// OVERVIEW ALERTS
// ============================================================

function renderOverviewAlerts(alerts) {

    const container =
        el("overviewAlerts");


    if (!container) {
        return;
    }


    if (!alerts.length) {

        container.innerHTML = `
            <div class="empty">
                No active alerts.
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    alerts
        .slice(0, 4)
        .forEach(
            alert => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "alert-item" +
                    (
                        alert.severity ===
                        "MODERATE"
                            ? " moderate"
                            : ""
                    );


                item.innerHTML = `

                    <strong>
                        ${escapeHTML(
                            alert.severity
                        )}
                    </strong>

                    <p>
                        ${escapeHTML(
                            alert.message
                        )}
                    </p>

                    <small>
                        ${
                            alert.created_at
                                ? new Date(
                                    alert.created_at
                                ).toLocaleString()
                                : "--"
                        }
                    </small>

                `;


                container.appendChild(
                    item
                );

            }
        );

}


// ============================================================
// FULL ALERTS
// ============================================================

function renderFullAlerts(alerts) {

    const container =
        el("fullAlerts");


    if (!container) {
        return;
    }


    if (!alerts.length) {

        container.innerHTML = `
            <div class="card">
                <div class="empty">
                    No active alerts.
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    alerts.forEach(
        alert => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "card";


            wrapper.innerHTML = `

                <div
                    class="alert-item ${
                        alert.severity ===
                        "MODERATE"
                            ? "moderate"
                            : ""
                    }"
                >

                    <strong>
                        ${escapeHTML(
                            alert.severity
                        )}
                    </strong>

                    <p>
                        ${escapeHTML(
                            alert.message
                        )}
                    </p>

                    <small>
                        Animal:
                        ${escapeHTML(
                            alert.tag_id || "-"
                        )}
                        •
                        ${
                            alert.created_at
                                ? new Date(
                                    alert.created_at
                                ).toLocaleString()
                                : "--"
                        }
                    </small>

                </div>

            `;


            container.appendChild(
                wrapper
            );

        }
    );

}


// ============================================================
// HISTORY
// ============================================================

async function loadHistory(tagId) {

    try {

        const response =
            await fetch(
                `/api/history/${encodeURIComponent(
                    tagId
                )}`,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        drawCharts(
            data.readings || []
        );


    } catch (error) {

        console.error(
            "History error:",
            error
        );

    }

}


// ============================================================
// CHARTS
// ============================================================

function updateCharts(animals) {

    const animal =
        animals.find(
            item =>
                item.latest !== null &&
                item.latest !== undefined
        );


    if (!animal) {
        return;
    }


    loadHistory(
        animal.tag_id
    );

}


function drawCharts(readings) {

    if (!readings.length) {
        return;
    }


    const labels =
        readings.map(
            reading =>
                reading.timestamp
                    ? new Date(
                        reading.timestamp
                    ).toLocaleTimeString(
                        [],
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )
                    : "--"
        );


    const risk =
        readings.map(
            reading =>
                reading.risk_score
        );


    const scc =
        readings.map(
            reading =>
                reading.scc
        );


    const temperature =
        readings.map(
            reading =>
                reading.temperature
        );


    const ec =
        readings.map(
            reading =>
                reading.ec
        );


    const riskCanvas =
        el("riskChart");


    const sensorCanvas =
        el("sensorChart");


    if (
        !riskCanvas ||
        !sensorCanvas
    ) {
        return;
    }


    if (riskChart) {
        riskChart.destroy();
    }


    if (sensorChart) {
        sensorChart.destroy();
    }


    riskChart =
        new Chart(
            riskCanvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Risk Score",

                            data:
                                risk,

                            borderWidth:
                                2,

                            tension:
                                0.35

                        },


                        {
                            label:
                                "SCC Demo",

                            data:
                                scc,

                            borderWidth:
                                2,

                            borderDash:
                                [5, 5],

                            tension:
                                0.35

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        mode:
                            "index",
                        intersect:
                            false
                    },

                    scales: {

                        y: {
                            min: 0,
                            max: 100
                        }

                    }

                }

            }
        );


    sensorChart =
        new Chart(
            sensorCanvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Temperature",

                            data:
                                temperature,

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            yAxisID:
                                "temp"

                        },


                        {
                            label:
                                "EC",

                            data:
                                ec,

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            yAxisID:
                                "ec"

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        temp: {
                            position:
                                "left"
                        },

                        ec: {

                            position:
                                "right",

                            grid: {
                                drawOnChartArea:
                                    false
                            }

                        }

                    }

                }

            }
        );

}


// ============================================================
// HERD CHART
// ============================================================

function updateHerdChart(counts) {

    const canvas =
        el("herdChart");


    if (!canvas) {
        return;
    }


    if (herdChart) {
        herdChart.destroy();
    }


    herdChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [
                        "No Risk",
                        "Low Risk",
                        "Moderate",
                        "High Risk"
                    ],

                    datasets: [

                        {
                            data: [

                                counts["NO RISK"] || 0,

                                counts["LOW RISK"] || 0,

                                counts["MODERATE RISK"] || 0,

                                counts["HIGH RISK"] || 0

                            ]

                        }

                    ]

                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false

                }

            }
        );

}


// ============================================================
// GIS
// ============================================================

function initializeMap() {

    const mapElement =
        el("farmMap");


    if (!mapElement) {
        return;
    }


    if (farmMap) {

        farmMap.invalidateSize();

        return;

    }


    farmMap =
        L.map(
            mapElement
        ).setView(
            [22.5726, 88.3639],
            7
        );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(
        farmMap
    );


    L.marker(
        [22.5726, 88.3639]
    )
    .addTo(
        farmMap
    )
    .bindPopup(
        "<strong>FARM-001</strong><br>Mastiguard Monitoring Farm"
    );

}


// ============================================================
// SEARCH / FILTER
// ============================================================

function setupAnimalFilters() {

    const search =
        el("animalSearch");


    const filter =
        el("riskFilter");


    if (
        !search ||
        !filter
    ) {
        return;
    }


    function applyFilter() {

        if (!dashboardData) {
            return;
        }


        const query =
            search.value
                .trim()
                .toLowerCase();


        const selected =
            filter.value;


        const animals =
            dashboardData.animals || [];


        const filtered =
            animals.filter(
                animal => {

                    const text =
                        (
                            `${animal.tag_id || ""} ` +
                            `${animal.name || ""} ` +
                            `${animal.breed || ""}`
                        )
                        .toLowerCase();


                    const animalLevel =
                        animal.risk_level ||
                        getRiskLabel(
                            animal.risk_score
                        );


                    const queryMatch =
                        !query ||
                        text.includes(
                            query
                        );


                    const riskMatch =
                        selected === "ALL" ||
                        animalLevel ===
                            selected;


                    return (
                        queryMatch &&
                        riskMatch
                    );

                }
            );


        renderAnimalTable(
            filtered
        );

    }


    search.addEventListener(
        "input",
        applyFilter
    );


    filter.addEventListener(
        "change",
        applyFilter
    );

}


// ============================================================
// ADD ANIMAL BUTTON
// ============================================================

function setupAddAnimalButton() {

    const button =
        document.querySelector(
            "#page-animals .primary-button"
        );


    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            alert(
                "Animal registration is ready for backend/database integration."
            );

        }
    );

}

// ============================================================
// MILK INTELLIGENCE
// ============================================================

function updateMilkIntelligence(animals) {

    const animal =
        animals.find(
            item =>
                item.latest !== null &&
                item.latest !== undefined
        );


    if (!animal) {

        setText(
            "milkStatus",
            "WAITING"
        );

        setText(
            "milkQualityStatus",
            "WAITING FOR DATA"
        );

        setText(
            "milkQualityDescription",
            "Waiting for live milk-quality readings."
        );

        return;

    }


    const latest =
        animal.latest || {};


    const ec =
        Number(latest.ec);


    const ph =
        Number(latest.ph);


    const scc =
        Number(latest.scc);


    // --------------------------------------------------------
    // Live values
    // --------------------------------------------------------

    setText(
        "milkEC",
        Number.isFinite(ec)
            ? ec.toFixed(2)
            : "--"
    );


    setText(
        "milkPH",
        Number.isFinite(ph)
            ? ph.toFixed(2)
            : "--"
    );


    setText(
        "milkSCC",
        Number.isFinite(scc)
            ? scc.toFixed(1)
            : "--"
    );


    // --------------------------------------------------------
    // Current animal
    // --------------------------------------------------------

    setText(
        "milkAnimalTag",
        animal.tag_id || "--"
    );


    setText(
        "milkAnimalName",
        animal.name ||
        animal.breed ||
        "Active sensor animal"
    );


    setText(
        "milkAnimalRisk",
        animal.risk_score !== null &&
        animal.risk_score !== undefined
            ? `${number(
                animal.risk_score,
                1
            )} / 100`
            : "--"
    );


    setText(
        "milkLastReading",
        latest.timestamp
            ? new Date(
                latest.timestamp
            ).toLocaleTimeString()
            : "--"
    );


    // --------------------------------------------------------
    // Status values
    // --------------------------------------------------------

    setText(
        "milkECStatus",
        Number.isFinite(ec)
            ? `${ec.toFixed(2)} mS/cm`
            : "--"
    );


    setText(
        "milkPHStatus",
        Number.isFinite(ph)
            ? ph.toFixed(2)
            : "--"
    );


    setText(
        "milkSCCStatus",
        Number.isFinite(scc)
            ? scc.toFixed(1)
            : "--"
    );


    // --------------------------------------------------------
    // Prototype screening status
    // --------------------------------------------------------

    const observations = [];


    if (Number.isFinite(ec)) {

        observations.push(
            "EC available"
        );

    }


    if (Number.isFinite(ph)) {

        observations.push(
            "pH available"
        );

    }


    if (Number.isFinite(scc)) {

        observations.push(
            "SCC available"
        );

    }


    let status =
        "DATA AVAILABLE";


    let description =
        "Current milk-quality indicators are available for review.";


    let statusClass =
        "stable";


    /*
     * These are intentionally broad prototype screening rules.
     * They are not presented as clinical diagnostic thresholds.
     */

    if (
        Number.isFinite(scc) &&
        scc > 50
    ) {

        status =
            "REVIEW INDICATORS";


        description =
            "The prototype SCC indicator is elevated. " +
            "Review EC, pH, animal risk and recent trends together.";


        statusClass =
            "warning";

    }


    if (
        Number.isFinite(ec) &&
        ec <= 0
    ) {

        status =
            "CHECK SENSOR";


        description =
            "The current EC value may indicate a sensor, wiring " +
            "or sampling issue. Verify the reading.";


        statusClass =
            "warning";

    }


    if (
        Number.isFinite(ph) &&
        (
            ph < 5 ||
            ph > 8
        )
    ) {

        status =
            "CHECK pH";


        description =
            "The current pH reading is outside the prototype " +
            "screening range. Verify the sensor and sample.";


        statusClass =
            "warning";

    }


    if (
        Number(animal.risk_score) >= 70
    ) {

        status =
            "PRIORITY REVIEW";


        description =
            "The active animal has elevated prototype risk. " +
            "Review milk indicators and recent history promptly.";


        statusClass =
            "priority";

    }


    setText(
        "milkStatus",
        status
    );


    setText(
        "milkQualityStatus",
        status
    );


    setText(
        "milkQualityDescription",
        description
    );


    const icon =
        el("milkStatusIcon");


    if (icon) {

        icon.classList.remove(
            "warning",
            "priority",
            "stable"
        );


        icon.classList.add(
            statusClass
        );

    }

}


// ============================================================
// MILK HISTORY
// ============================================================

async function loadMilkHistory(tagId) {

    if (!tagId) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/history/${encodeURIComponent(
                    tagId
                )}`,
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Milk history HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        drawMilkTrend(
            data.readings || []
        );


    } catch (error) {

        console.error(
            "Milk history error:",
            error
        );

    }

}


// ============================================================
// MILK TREND CHART
// ============================================================

function drawMilkTrend(readings) {

    const canvas =
        el("milkTrendChart");


    if (!canvas) {
        return;
    }


    if (milkTrendChart) {

        milkTrendChart.destroy();

        milkTrendChart = null;

    }


    if (!readings.length) {

        return;

    }


    const labels =
        readings.map(
            reading =>
                reading.timestamp
                    ? new Date(
                        reading.timestamp
                    ).toLocaleTimeString(
                        [],
                        {
                            hour:
                                "2-digit",

                            minute:
                                "2-digit"
                        }
                    )
                    : "--"
        );


    const ec =
        readings.map(
            reading =>
                Number.isFinite(
                    Number(reading.ec)
                )
                    ? Number(reading.ec)
                    : null
        );


    const ph =
        readings.map(
            reading =>
                Number.isFinite(
                    Number(reading.ph)
                )
                    ? Number(reading.ph)
                    : null
        );


    const scc =
        readings.map(
            reading =>
                Number.isFinite(
                    Number(reading.scc)
                )
                    ? Number(reading.scc)
                    : null
        );


    milkTrendChart =
        new Chart(
            canvas,
            {

                type:
                    "line",


                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "EC",

                            data:
                                ec,

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            yAxisID:
                                "ec"

                        },


                        {
                            label:
                                "pH",

                            data:
                                ph,

                            borderWidth:
                                2,

                            tension:
                                0.35,

                            yAxisID:
                                "ph"

                        },


                        {
                            label:
                                "SCC",

                            data:
                                scc,

                            borderWidth:
                                2,

                            borderDash:
                                [5,5],

                            tension:
                                0.35,

                            yAxisID:
                                "scc"

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    scales: {

                        ec: {

                            position:
                                "left"

                        },


                        ph: {

                            position:
                                "right",

                            grid: {

                                drawOnChartArea:
                                    false

                            }

                        },


                        scc: {

                            position:
                                "right",

                            display:
                                false

                        }

                    }

                }

            }
        );

}


// ============================================================
// MILK PAGE UPDATE
// ============================================================

function updateMilkPage(animals) {

    updateMilkIntelligence(
        animals
    );


    const animal =
        animals.find(
            item =>
                item.latest !== null &&
                item.latest !== undefined
        );


    if (!animal) {
        return;
    }


    loadMilkHistory(
        animal.tag_id
    );

}

/* =========================================================
   ANIMAL HEALTH
   ========================================================= */

function getHealthStatusFromRisk(riskScore) {
    const score = Number(riskScore);

    if (!Number.isFinite(score)) {
        return {
            type: "stable",
            title: "WAITING FOR DATA",
            description: "No valid animal risk score is currently available.",
            icon: "bi-question-circle-fill"
        };
    }

    if (score >= 70) {
        return {
            type: "priority",
            title: "PRIORITY HEALTH REVIEW",
            description:
                "The current animal has a high prototype mastitis-risk score. Review available milk indicators and perform an animal-level inspection.",
            icon: "bi-exclamation-octagon-fill"
        };
    }

    if (score >= 45) {
        return {
            type: "monitor",
            title: "ENHANCED MONITORING",
            description:
                "The current animal is showing moderate prototype risk. Continue monitoring and review recent sensor readings.",
            icon: "bi-heart-pulse-fill"
        };
    }

    if (score >= 25) {
        return {
            type: "warning",
            title: "LOW-LEVEL RISK",
            description:
                "The current animal has a low prototype risk signal. Maintain routine monitoring and check for changes.",
            icon: "bi-shield-exclamation"
        };
    }

    return {
        type: "stable",
        title: "STABLE SCREENING STATUS",
        description:
            "No elevated prototype risk is currently indicated by the available dashboard data.",
        icon: "bi-shield-check"
    };
}


function normalizeHealthField(value, fallback = "Not Available") {
    if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "null" ||
        value === "undefined"
    ) {
        return fallback;
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    return String(value);
}


function getAnimalHistoryValue(animal, possibleKeys, fallback = "Not Available") {
    if (!animal || typeof animal !== "object") {
        return fallback;
    }

    for (const key of possibleKeys) {
        if (
            Object.prototype.hasOwnProperty.call(animal, key) &&
            animal[key] !== undefined &&
            animal[key] !== null &&
            animal[key] !== ""
        ) {
            return normalizeHealthField(animal[key], fallback);
        }
    }

    return fallback;
}


function updateAnimalHealth(animals) {
    if (!Array.isArray(animals) || animals.length === 0) {
        setText("healthStatusTitle", "WAITING FOR ANIMAL DATA");
        setText(
            "healthStatusDescription",
            "Connect the ESP32/backend data source to begin animal health screening."
        );

        setText("healthAnimalTag", "—");
        setText("healthAnimalTagLarge", "—");
        setText("healthAnimalName", "No active animal");
        setText("healthAnimalRisk", "—");
        setText("healthRiskLevel", "—");
        setText("healthLastReading", "—");

        setText("healthTemperature", "—");
        setText("healthTemperatureStatus", "Prototype sensor reading");

        setText(
            "healthRiskSummary",
            "Waiting for the current animal risk score."
        );

        return;
    }

    const activeAnimal =
        animals.find(animal => animal && animal.latest) ||
        animals.find(animal => animal) ||
        animals[0];

    if (!activeAnimal) {
        return;
    }

    const riskScore = Number(
        activeAnimal.risk_score ??
        activeAnimal.risk ??
        0
    );

    const healthStatus = getHealthStatusFromRisk(riskScore);

    /* ---------------------------------------------------------
       Status header
       --------------------------------------------------------- */

    const statusIcon = el("healthStatusIcon");

    if (statusIcon) {
        statusIcon.className =
            `health-status-icon ${healthStatus.type}`;

        statusIcon.innerHTML =
            `<i class="bi ${healthStatus.icon}"></i>`;
    }

    setText(
        "healthStatusTitle",
        healthStatus.title
    );

    setText(
        "healthStatusDescription",
        healthStatus.description
    );

    setText(
        "healthAnimalTag",
        normalizeHealthField(
            activeAnimal.tag_id ??
            activeAnimal.tagId ??
            activeAnimal.tag,
            "—"
        )
    );

    setText(
        "healthAnimalTagLarge",
        normalizeHealthField(
            activeAnimal.tag_id ??
            activeAnimal.tagId ??
            activeAnimal.tag,
            "—"
        )
    );

    setText(
        "healthAnimalName",
        normalizeHealthField(
            activeAnimal.name ??
            activeAnimal.animal_name ??
            activeAnimal.animalName,
            "Active Animal"
        )
    );

    setText(
        "healthAnimalRisk",
        Number.isFinite(riskScore)
            ? `${riskScore.toFixed(0)} / 100`
            : "—"
    );

    setText(
        "healthRiskLevel",
        getRiskLabel(riskScore)
    );


    /* ---------------------------------------------------------
       Last reading
       --------------------------------------------------------- */

    const latest = activeAnimal.latest || activeAnimal;

    setText(
        "healthLastReading",
        latest.timestamp ??
        latest.time ??
        activeAnimal.last_reading ??
        activeAnimal.lastReading ??
        "Live"
    );


    /* ---------------------------------------------------------
       Temperature
       --------------------------------------------------------- */

    const temperature = Number(
        latest.temperature ??
        activeAnimal.temperature
    );

    if (Number.isFinite(temperature)) {
        setText(
            "healthTemperature",
            `${temperature.toFixed(1)} °C`
        );

        setText(
            "healthTemperatureStatus",
            "Prototype sensor reading • not core body temperature"
        );
    } else {
        setText(
            "healthTemperature",
            "—"
        );

        setText(
            "healthTemperatureStatus",
            "No temperature reading available"
        );
    }


    /* ---------------------------------------------------------
       Risk-linked interpretation
       --------------------------------------------------------- */

    setText(
        "healthRiskSummary",
        healthStatus.description
    );


    /* ---------------------------------------------------------
       Flexible health-record mapping
       This allows future backend fields without changing HTML.
       --------------------------------------------------------- */

    const previousMastitis = getAnimalHistoryValue(
        activeAnimal,
        [
            "previous_mastitis",
            "previousMastitis",
            "mastitis_history",
            "mastitisHistory"
        ]
    );

    const diseaseHistory = getAnimalHistoryValue(
        activeAnimal,
        [
            "disease_history",
            "diseaseHistory",
            "diseases",
            "medical_history"
        ]
    );

    const treatment = getAnimalHistoryValue(
        activeAnimal,
        [
            "treatment",
            "current_treatment",
            "currentTreatment",
            "treatment_history",
            "treatmentHistory"
        ]
    );

    const vaccination = getAnimalHistoryValue(
        activeAnimal,
        [
            "vaccination",
            "vaccinations",
            "vaccination_status",
            "vaccinationStatus"
        ]
    );

    setText(
        "healthPreviousMastitis",
        previousMastitis
    );

    setText(
        "healthDiseaseHistory",
        diseaseHistory
    );

    setText(
        "healthTreatment",
        treatment
    );

    setText(
        "healthVaccination",
        vaccination
    );


    /* ---------------------------------------------------------
       Clinical history summary
       --------------------------------------------------------- */

    const hasHistory =
        previousMastitis !== "Not Available" ||
        diseaseHistory !== "Not Available" ||
        treatment !== "Not Available" ||
        vaccination !== "Not Available";

    if (hasHistory) {
        setText(
            "healthHistorySummary",
            "Animal health-history fields are available from the connected data source."
        );
    } else {
        setText(
            "healthHistorySummary",
            "No validated clinical history is currently connected to the dashboard."
        );
    }


    /* ---------------------------------------------------------
       Status pill
       --------------------------------------------------------- */

    const statusPill = el("healthStatus");

    if (statusPill) {
        let label = "HEALTH SCREENING";

        if (riskScore >= 70) {
            label = "PRIORITY REVIEW";
        } else if (riskScore >= 45) {
            label = "ENHANCED MONITORING";
        } else if (riskScore >= 25) {
            label = "LOW-LEVEL RISK";
        } else {
            label = "STABLE SCREENING";
        }

        statusPill.innerHTML =
            `<span class="status-dot"></span>${label}`;
    }
}

/* =========================================================
   ENVIRONMENT INTELLIGENCE
   ========================================================= */

function getEnvironmentAssessment(temperature, humidity) {

    const hasTemperature = Number.isFinite(temperature);
    const hasHumidity = Number.isFinite(humidity);

    if (!hasTemperature && !hasHumidity) {
        return {
            type: "stable",
            title: "WAITING FOR SENSOR DATA",
            description:
                "No valid environmental temperature or humidity reading is currently available.",
            icon: "bi-hourglass-split",
            risk: "NO DATA",
            guidanceTitle: "Connect environmental sensor",
            guidance:
                "The dashboard will automatically assess farm climate conditions when valid sensor readings are received."
        };
    }

    /*
     * These ranges are intentionally broad prototype screening rules.
     * They are NOT a validated bovine heat-stress index.
     */

    if (
        (hasTemperature && temperature >= 35) ||
        (hasHumidity && humidity >= 85)
    ) {
        return {
            type: "priority",
            title: "HIGH ENVIRONMENTAL LOAD",
            description:
                "Temperature or humidity is elevated enough to warrant prompt inspection of ventilation, shade, water access and bedding conditions.",
            icon: "bi-exclamation-octagon-fill",
            risk: "HIGH",
            guidanceTitle: "Inspect farm climate controls",
            guidance:
                "Check airflow, shaded resting areas, drinking-water availability and wet bedding. Consider closer monitoring of animals while these conditions persist."
        };
    }

    if (
        (hasTemperature && temperature >= 30) ||
        (hasHumidity && humidity >= 75)
    ) {
        return {
            type: "warning",
            title: "ELEVATED ENVIRONMENTAL LOAD",
            description:
                "Current climate readings indicate elevated environmental load. Continue monitoring and review ventilation and moisture control.",
            icon: "bi-cloud-sun-fill",
            risk: "ELEVATED",
            guidanceTitle: "Increase environmental monitoring",
            guidance:
                "Review airflow, bedding dryness and water availability. Continue observing animals for changes in behavior or health indicators."
        };
    }

    if (
        (hasTemperature && temperature >= 27) ||
        (hasHumidity && humidity >= 65)
    ) {
        return {
            type: "monitor",
            title: "MODERATE ENVIRONMENTAL LOAD",
            description:
                "Environmental conditions are within a moderate screening range. Routine monitoring should continue.",
            icon: "bi-cloud-sun",
            risk: "MODERATE",
            guidanceTitle: "Maintain routine monitoring",
            guidance:
                "Keep ventilation and bedding conditions under observation and continue collecting live climate readings."
        };
    }

    return {
        type: "stable",
        title: "STABLE ENVIRONMENT",
        description:
            "Current temperature and humidity do not indicate an elevated prototype environmental risk.",
        icon: "bi-check-circle-fill",
        risk: "LOW",
        guidanceTitle: "Maintain current conditions",
        guidance:
            "Continue routine climate monitoring and maintain good ventilation, shade, water access and bedding hygiene."
    };
}


function updateEnvironment(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    let latest = null;

    const activeAnimal =
        animals.find(animal => animal && animal.latest) ||
        animals.find(animal => animal);

    if (activeAnimal) {
        latest = activeAnimal.latest || activeAnimal;
    }

    /*
     * Support multiple backend key names.
     */

    const temperature = Number(
        latest?.temperature ??
        latest?.temp ??
        data?.temperature ??
        data?.environment?.temperature
    );

    const humidity = Number(
        latest?.rel_humidity ??
        latest?.humidity ??
        latest?.relative_humidity ??
        data?.humidity ??
        data?.rel_humidity ??
        data?.environment?.humidity
    );

    const assessment =
        getEnvironmentAssessment(temperature, humidity);


    /* ---------------------------------------------------------
       Main metrics
       --------------------------------------------------------- */

    setText(
        "environmentTemperature",
        Number.isFinite(temperature)
            ? `${temperature.toFixed(1)} °C`
            : "—"
    );

    setText(
        "environmentHumidity",
        Number.isFinite(humidity)
            ? `${humidity.toFixed(0)} %`
            : "—"
    );

    setText(
        "climateRisk",
        assessment.risk
    );

    setText(
        "climateRiskDescription",
        Number.isFinite(temperature) || Number.isFinite(humidity)
            ? "Prototype climate screening"
            : "Awaiting live climate data"
    );


    /* ---------------------------------------------------------
       Metric helper text
       --------------------------------------------------------- */

    setText(
        "environmentTemperatureStatus",
        Number.isFinite(temperature)
            ? "Live sensor reading"
            : "Waiting for sensor"
    );

    setText(
        "environmentHumidityStatus",
        Number.isFinite(humidity)
            ? "Live sensor reading"
            : "Waiting for sensor"
    );


    /* ---------------------------------------------------------
       Source
       --------------------------------------------------------- */

    const hasLiveEnvironmentData =
        Number.isFinite(temperature) ||
        Number.isFinite(humidity);

    setText(
        "environmentSource",
        hasLiveEnvironmentData
            ? "ESP32"
            : "Offline"
    );

    setText(
        "environmentLastReading",
        latest?.timestamp ??
        latest?.time ??
        activeAnimal?.last_reading ??
        activeAnimal?.lastReading ??
        (hasLiveEnvironmentData ? "Live reading" : "No reading yet")
    );


    /* ---------------------------------------------------------
       Main status card
       --------------------------------------------------------- */

    const statusIcon = el("environmentStatusIcon");

    if (statusIcon) {
        statusIcon.className =
            `environment-status-icon ${assessment.type}`;

        statusIcon.innerHTML =
            `<i class="bi ${assessment.icon}"></i>`;
    }

    setText(
        "environmentStatusTitle",
        assessment.title
    );

    setText(
        "environmentStatusDescription",
        assessment.description
    );


    /* ---------------------------------------------------------
       Reading summary
       --------------------------------------------------------- */

    setText(
        "environmentTempSummary",
        Number.isFinite(temperature)
            ? `${temperature.toFixed(1)} °C`
            : "—"
    );

    setText(
        "environmentHumiditySummary",
        Number.isFinite(humidity)
            ? `${humidity.toFixed(0)} %`
            : "—"
    );

    setText(
        "environmentRiskSummary",
        assessment.risk
    );


    /* ---------------------------------------------------------
       Heat-load helper
       --------------------------------------------------------- */

    if (Number.isFinite(temperature)) {

        if (temperature >= 35) {
            setText(
                "environmentHeatLoad",
                "High screening load • inspect promptly"
            );
        } else if (temperature >= 30) {
            setText(
                "environmentHeatLoad",
                "Elevated screening load • monitor closely"
            );
        } else {
            setText(
                "environmentHeatLoad",
                "No elevated temperature signal"
            );
        }

    } else {

        setText(
            "environmentHeatLoad",
            "Waiting for temperature data"
        );
    }


    /* ---------------------------------------------------------
       Status pill
       --------------------------------------------------------- */

    const statusPill = el("environmentStatus");

    if (statusPill) {

        let label = "ENVIRONMENT MONITORING";

        if (assessment.type === "priority") {
            label = "HIGH ENVIRONMENTAL LOAD";
        } else if (assessment.type === "warning") {
            label = "ELEVATED ENVIRONMENTAL LOAD";
        } else if (assessment.type === "monitor") {
            label = "MODERATE ENVIRONMENTAL LOAD";
        } else if (
            assessment.type === "stable" &&
            (Number.isFinite(temperature) || Number.isFinite(humidity))
        ) {
            label = "STABLE ENVIRONMENT";
        }

        statusPill.innerHTML =
            `<span class="status-dot"></span>${label}`;
    }


    /* ---------------------------------------------------------
       Guidance
       --------------------------------------------------------- */

    setText(
        "environmentGuidanceTitle",
        assessment.guidanceTitle
    );

    setText(
        "environmentGuidance",
        assessment.guidance
    );


    /* ---------------------------------------------------------
       Ventilation helper
       --------------------------------------------------------- */

    if (
        Number.isFinite(temperature) &&
        temperature >= 30
    ) {
        setText(
            "environmentVentilation",
            "Check airflow and cooling conditions"
        );
    } else {
        setText(
            "environmentVentilation",
            "Manual verification required"
        );
    }


    /* ---------------------------------------------------------
       Moisture helper
       --------------------------------------------------------- */

    if (
        Number.isFinite(humidity) &&
        humidity >= 75
    ) {
        setText(
            "environmentMoisture",
            "Elevated humidity • inspect wet bedding"
        );
    } else {
        setText(
            "environmentMoisture",
            "Monitor bedding and wet areas"
        );
    }
}

/* =========================================================
   FEEDING & NUTRITION
   ========================================================= */

function getNutritionAssessment(animals) {

    if (!Array.isArray(animals) || animals.length === 0) {
        return {
            type: "monitor",
            title: "FEEDING DATA NOT CONNECTED",
            description:
                "No animal context is currently available for nutrition monitoring.",
            icon: "bi-hourglass-split",
            risk: "NO DATA",
            guidanceTitle: "Connect animal data",
            guidance:
                "Connect the animal monitoring gateway and, later, dedicated feed or water sensors to enable nutrition analytics."
        };
    }

    const activeAnimal =
        animals.find(animal => animal && animal.latest) ||
        animals.find(animal => animal) ||
        animals[0];

    const riskScore = Number(
        activeAnimal?.risk_score ??
        activeAnimal?.risk ??
        0
    );

    if (Number.isFinite(riskScore) && riskScore >= 70) {
        return {
            type: "priority",
            title: "PRIORITY ANIMAL MONITORING",
            description:
                "The active animal has a high prototype risk score. Nutrition and water availability should be reviewed as part of the overall animal assessment.",
            icon: "bi-exclamation-octagon-fill",
            risk: "HIGH",
            guidanceTitle: "Review feed and water access",
            guidance:
                "Confirm that feed and clean water are readily available and check for any unusual reduction in intake or feeding behavior."
        };
    }

    if (Number.isFinite(riskScore) && riskScore >= 45) {
        return {
            type: "warning",
            title: "ENHANCED NUTRITION MONITORING",
            description:
                "The active animal has a moderate prototype risk signal. Maintain consistent feeding and water checks.",
            icon: "bi-shield-exclamation",
            risk: "MODERATE",
            guidanceTitle: "Increase routine feeding checks",
            guidance:
                "Verify feed availability, water access and normal feeding behavior. Investigate noticeable changes from the animal's normal routine."
        };
    }

    if (Number.isFinite(riskScore) && riskScore >= 25) {
        return {
            type: "monitor",
            title: "ROUTINE NUTRITION MONITORING",
            description:
                "The active animal has a low prototype risk signal. Continue routine feeding and water checks.",
            icon: "bi-activity",
            risk: "LOW",
            guidanceTitle: "Maintain routine monitoring",
            guidance:
                "Maintain consistent feeding times, adequate feed availability and reliable clean-water access."
        };
    }

    return {
        type: "stable",
        title: "NORMAL FEEDING OPERATIONS",
        description:
            "No elevated prototype animal-risk signal is currently detected. Automated intake data is not yet available.",
        icon: "bi-check-circle-fill",
        risk: "LOW",
        guidanceTitle: "Maintain current feeding routine",
        guidance:
            "Continue normal feeding operations and monitor feed and water availability manually."
    };
}


function updateNutrition(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const activeAnimal =
        animals.find(animal => animal && animal.latest) ||
        animals.find(animal => animal) ||
        animals[0];

    const assessment =
        getNutritionAssessment(animals);


    /* ---------------------------------------------------------
       Main status
       --------------------------------------------------------- */

    const statusIcon = el("nutritionStatusIcon");

    if (statusIcon) {
        statusIcon.className =
            `nutrition-status-icon ${assessment.type}`;

        statusIcon.innerHTML =
            `<i class="bi ${assessment.icon}"></i>`;
    }

    setText(
        "nutritionStatusTitle",
        assessment.title
    );

    setText(
        "nutritionStatusDescription",
        assessment.description
    );


    /* ---------------------------------------------------------
       Current prototype data state
       --------------------------------------------------------- */

    setText(
        "feedIntake",
        "Not Integrated"
    );

    setText(
        "waterIntake",
        "Not Integrated"
    );

    setText(
        "feedingDeviation",
        "No Data"
    );

    setText(
        "nutritionFeedSummary",
        "NOT AVAILABLE"
    );

    setText(
        "nutritionWaterSummary",
        "NOT AVAILABLE"
    );

    setText(
        "nutritionDeviationSummary",
        "NO DATA"
    );


    /* ---------------------------------------------------------
       Nutrition risk
       --------------------------------------------------------- */

    setText(
        "nutritionRisk",
        assessment.risk
    );

    setText(
        "nutritionRiskDescription",
        "Risk-linked prototype screening"
    );


    /* ---------------------------------------------------------
       Active animal
       --------------------------------------------------------- */

    if (!activeAnimal) {

        setText(
            "nutritionAnimalName",
            "No active animal"
        );

        setText(
            "nutritionAnimalTag",
            "—"
        );

        setText(
            "nutritionAnimalRisk",
            "—"
        );

        setText(
            "nutritionAnimalRiskLevel",
            "—"
        );

        return;
    }

    const riskScore = Number(
        activeAnimal.risk_score ??
        activeAnimal.risk ??
        0
    );

    const animalName =
        activeAnimal.name ??
        activeAnimal.animal_name ??
        activeAnimal.animalName ??
        "Active Animal";

    const tagId =
        activeAnimal.tag_id ??
        activeAnimal.tagId ??
        activeAnimal.tag ??
        "—";

    setText(
        "nutritionAnimalName",
        animalName
    );

    setText(
        "nutritionAnimalTag",
        tagId
    );

    setText(
        "nutritionAnimalRisk",
        Number.isFinite(riskScore)
            ? `${riskScore.toFixed(0)} / 100`
            : "—"
    );

    setText(
        "nutritionAnimalRiskLevel",
        getRiskLabel(riskScore)
    );


    /* ---------------------------------------------------------
       Risk-linked note
       --------------------------------------------------------- */

    let riskNote =
        "Nutrition monitoring becomes more useful when individual feed intake, water intake and behavioral signals are available.";

    if (Number.isFinite(riskScore) && riskScore >= 70) {

        riskNote =
            "High prototype risk detected. Confirm feed and clean-water access and review any recent changes in feeding behavior.";

    } else if (Number.isFinite(riskScore) && riskScore >= 45) {

        riskNote =
            "Moderate prototype risk detected. Keep feeding and water availability under closer observation.";

    } else if (Number.isFinite(riskScore) && riskScore >= 25) {

        riskNote =
            "Low-level prototype risk detected. Continue routine feeding and water monitoring.";

    } else if (Number.isFinite(riskScore)) {

        riskNote =
            "No elevated prototype risk is currently indicated. Continue normal feeding operations.";
    }

    setText(
        "nutritionRiskNote",
        riskNote
    );


    /* ---------------------------------------------------------
       Operational guidance
       --------------------------------------------------------- */

    setText(
        "nutritionGuidanceTitle",
        assessment.guidanceTitle
    );

    setText(
        "nutritionGuidance",
        assessment.guidance
    );


    /* ---------------------------------------------------------
       Status pill
       --------------------------------------------------------- */

    const statusPill = el("nutritionStatus");

    if (statusPill) {

        let label = "NUTRITION MONITORING";

        if (assessment.type === "priority") {
            label = "PRIORITY NUTRITION REVIEW";
        } else if (assessment.type === "warning") {
            label = "ENHANCED NUTRITION MONITORING";
        } else if (assessment.type === "monitor") {
            label = "ROUTINE NUTRITION MONITORING";
        } else if (assessment.type === "stable") {
            label = "NORMAL FEEDING OPERATIONS";
        }

        statusPill.innerHTML =
            `<span class="status-dot"></span>${label}`;
    }


    /* ---------------------------------------------------------
       Dynamic operational hints
       --------------------------------------------------------- */

    const latest =
        activeAnimal.latest ||
        activeAnimal;

    const temperature = Number(
        latest?.temperature ??
        activeAnimal.temperature
    );

    if (
        Number.isFinite(temperature) &&
        temperature >= 30
    ) {
        setText(
            "nutritionWaterAvailability",
            "Confirm continuous clean-water access"
        );
    } else {
        setText(
            "nutritionWaterAvailability",
            "Confirm clean water access"
        );
    }

    if (
        Number.isFinite(riskScore) &&
        riskScore >= 45
    ) {
        setText(
            "nutritionFeedAvailability",
            "Verify adequate feed and observe feeding behavior"
        );
    } else {
        setText(
            "nutritionFeedAvailability",
            "Confirm adequate feed stock"
        );
    }
}

/* =========================================================
   HOUSING & HYGIENE
   ========================================================= */

function getHygieneAssessment(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const herd = data?.herd || {};

    const highRisk = Number(
        herd.high_risk ??
        herd.highRisk ??
        animals.filter(a => Number(a?.risk_score ?? a?.risk ?? 0) >= 70).length
    );

    const moderateRisk = Number(
        herd.moderate_risk ??
        herd.moderateRisk ??
        animals.filter(a => {
            const risk = Number(a?.risk_score ?? a?.risk ?? 0);
            return risk >= 45 && risk < 70;
        }).length
    );


    /*
     * Hygiene is primarily manual in the current prototype.
     * Risk level is used only to increase the priority of inspection.
     */

    if (Number.isFinite(highRisk) && highRisk > 0) {
        return {
            type: "priority",
            title: "PRIORITY HYGIENE REVIEW",
            description:
                "High-risk animals are present. Housing cleanliness, bedding, milking hygiene and isolation procedures should be reviewed promptly.",
            icon: "bi-exclamation-octagon-fill",
            housing: "PRIORITY CHECK",
            bedding: "PRIORITY CHECK",
            biosecurity: "PRIORITY CHECK",
            guidanceTitle: "Inspect high-risk animal areas",
            guidance:
                "Review housing and bedding around high-risk animals, verify milking hygiene procedures and ensure appropriate isolation or handling procedures are followed."
        };
    }

    if (Number.isFinite(moderateRisk) && moderateRisk > 0) {
        return {
            type: "warning",
            title: "ENHANCED HYGIENE MONITORING",
            description:
                "Moderate-risk animals are present. Maintain closer attention to bedding cleanliness, housing conditions and milking hygiene.",
            icon: "bi-shield-exclamation",
            housing: "MONITOR",
            bedding: "MONITOR",
            biosecurity: "MONITOR",
            guidanceTitle: "Increase routine hygiene checks",
            guidance:
                "Pay closer attention to wet bedding, contaminated surfaces, milking-equipment cleaning and movement of animals between areas."
        };
    }

    if (animals.length > 0) {
        return {
            type: "stable",
            title: "ROUTINE HYGIENE MONITORING",
            description:
                "No elevated animal-risk group is currently detected. Continue normal housing and hygiene procedures.",
            icon: "bi-check-circle-fill",
            housing: "ROUTINE",
            bedding: "ROUTINE",
            biosecurity: "ROUTINE",
            guidanceTitle: "Maintain routine hygiene controls",
            guidance:
                "Maintain clean housing, dry bedding, clean water points and consistent milking-area hygiene procedures."
        };
    }

    return {
        type: "monitor",
        title: "MANUAL INSPECTION REQUIRED",
        description:
            "Animal data is not currently available. Farm housing and hygiene conditions should continue to be checked manually.",
        icon: "bi-clipboard-check",
        housing: "MANUAL",
        bedding: "MANUAL",
        biosecurity: "MANUAL",
        guidanceTitle: "Complete daily hygiene inspection",
        guidance:
            "Check animal housing, bedding, water points, milking equipment and biosecurity procedures according to the farm's daily checklist."
    };
}


function updateHygiene(data) {

    const assessment =
        getHygieneAssessment(data);


    /* ---------------------------------------------------------
       Main status
       --------------------------------------------------------- */

    const statusIcon = el("hygieneStatusIcon");

    if (statusIcon) {
        statusIcon.className =
            `hygiene-status-icon ${assessment.type}`;

        statusIcon.innerHTML =
            `<i class="bi ${assessment.icon}"></i>`;
    }

    setText(
        "hygieneStatusTitle",
        assessment.title
    );

    setText(
        "hygieneStatusDescription",
        assessment.description
    );


    /* ---------------------------------------------------------
       Metric cards
       --------------------------------------------------------- */

    setText(
        "housingStatus",
        assessment.housing
    );

    setText(
        "housingStatusDetail",
        assessment.type === "priority"
            ? "Priority visual inspection"
            : "Visual inspection required"
    );

    setText(
        "beddingStatus",
        assessment.bedding
    );

    setText(
        "beddingStatusDetail",
        assessment.type === "priority"
            ? "Check wet or contaminated bedding"
            : "Moisture and cleanliness check"
    );

    setText(
        "milkingHygieneStatus",
        assessment.type === "priority"
            ? "PRIORITY"
            : assessment.type === "warning"
                ? "ENHANCED"
                : "MANUAL"
    );

    setText(
        "biosecurityStatus",
        assessment.biosecurity
    );


    /* ---------------------------------------------------------
       Summary blocks
       --------------------------------------------------------- */

    setText(
        "hygieneHousingSummary",
        assessment.housing
    );

    setText(
        "hygieneBeddingSummary",
        assessment.bedding
    );

    setText(
        "hygieneBiosecuritySummary",
        assessment.biosecurity
    );


    /* ---------------------------------------------------------
       Checklist guidance
       --------------------------------------------------------- */

    if (assessment.type === "priority") {

        setText(
            "cleanWaterCheck",
            "Confirm clean water access around high-risk animals"
        );

        setText(
            "beddingCheck",
            "Inspect wet, dirty or contaminated bedding promptly"
        );

        setText(
            "equipmentCheck",
            "Verify complete cleaning and sanitization procedure"
        );

        setText(
            "workerHygieneCheck",
            "Reinforce hand and protective-equipment procedures"
        );

        setText(
            "isolationCheck",
            "Review separation and handling of high-risk animals"
        );

    } else if (assessment.type === "warning") {

        setText(
            "cleanWaterCheck",
            "Continue closer inspection of water points"
        );

        setText(
            "beddingCheck",
            "Increase attention to bedding moisture and cleanliness"
        );

        setText(
            "equipmentCheck",
            "Verify regular milking-equipment cleaning"
        );

        setText(
            "workerHygieneCheck",
            "Maintain strict worker hygiene procedures"
        );

        setText(
            "isolationCheck",
            "Review handling procedures for moderate-risk animals"
        );

    } else {

        setText(
            "cleanWaterCheck",
            "Verify water troughs are clean"
        );

        setText(
            "beddingCheck",
            "Inspect for wet or contaminated bedding"
        );

        setText(
            "equipmentCheck",
            "Confirm cleaning and sanitization routine"
        );

        setText(
            "workerHygieneCheck",
            "Hand and protective-equipment procedures"
        );

        setText(
            "isolationCheck",
            "Isolate high-risk or clinically affected animals when required"
        );
    }


    /* ---------------------------------------------------------
       Guidance
       --------------------------------------------------------- */

    setText(
        "hygieneGuidanceTitle",
        assessment.guidanceTitle
    );

    setText(
        "hygieneGuidance",
        assessment.guidance
    );


    /* ---------------------------------------------------------
       Status pill
       --------------------------------------------------------- */

    const statusPill = el("hygieneStatus");

    if (statusPill) {

        let label = "HYGIENE MONITORING";

        if (assessment.type === "priority") {
            label = "PRIORITY HYGIENE REVIEW";
        } else if (assessment.type === "warning") {
            label = "ENHANCED HYGIENE MONITORING";
        } else if (assessment.type === "stable") {
            label = "ROUTINE HYGIENE MONITORING";
        } else {
            label = "MANUAL HYGIENE CHECK";
        }

        statusPill.innerHTML =
            `<span class="status-dot"></span>${label}`;
    }
}

/* =========================================================
   MILKING OPERATIONS
   ========================================================= */

function updateMilkingOperations(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const herd = data?.herd || {};

    const highRisk = Number(
        herd.high_risk ??
        herd.highRisk ??
        animals.filter(a =>
            Number(a?.risk_score ?? a?.risk ?? 0) >= 70
        ).length
    );

    const averageRisk = animals.length
        ? animals.reduce((sum, animal) => {
            return sum + Number(
                animal?.risk_score ??
                animal?.risk ??
                0
            );
        }, 0) / animals.length
        : 0;

    setText(
        "milkingRiskScore",
        animals.length
            ? averageRisk.toFixed(0)
            : "—"
    );

    setText(
        "milkingHighRiskAnimals",
        Number.isFinite(highRisk) ? highRisk : 0
    );

    if (highRisk > 0) {
        setText(
            "milkingRiskMessage",
            `${highRisk} high-risk animal${highRisk === 1 ? "" : "s"} should receive closer inspection during milking operations.`
        );
    } else {
        setText(
            "milkingRiskMessage",
            "No high-risk animal group is currently detected."
        );
    }
}


/* =========================================================
   HEALTH RECORDS
   ========================================================= */

function getRecordValue(animal, keys) {

    for (const key of keys) {
        if (
            animal &&
            Object.prototype.hasOwnProperty.call(animal, key) &&
            animal[key] !== null &&
            animal[key] !== undefined &&
            animal[key] !== ""
        ) {
            return String(animal[key]);
        }
    }

    return "Not Available";
}


function renderHealthRecords(animals) {

    const tbody = el("recordsTableBody");

    if (!tbody) return;

    if (!Array.isArray(animals) || animals.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="records-empty">
                    No animal records available.
                </td>
            </tr>
        `;

        setText("recordAnimalCount", "0");
        setText("recordHighRisk", "0");

        return;
    }

    let highRiskCount = 0;

    const rows = animals.map(animal => {

        const risk = Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        );

        if (risk >= 70) {
            highRiskCount++;
        }

        let riskClassName = "low";

        if (risk >= 70) {
            riskClassName = "high";
        } else if (risk >= 45) {
            riskClassName = "moderate";
        }

        const tag = animal?.tag_id ??
                    animal?.tagId ??
                    animal?.tag ??
                    "—";

        const name = animal?.name ??
                     animal?.animal_name ??
                     animal?.animalName ??
                     "Animal";

        const latest = animal?.latest || animal;

        const reading =
            latest?.timestamp ??
            latest?.time ??
            animal?.last_reading ??
            animal?.lastReading ??
            "Live";

        const previousMastitis = getRecordValue(
            animal,
            [
                "previous_mastitis",
                "previousMastitis",
                "mastitis_history",
                "mastitisHistory"
            ]
        );

        const treatment = getRecordValue(
            animal,
            [
                "treatment",
                "current_treatment",
                "currentTreatment",
                "treatment_history",
                "treatmentHistory"
            ]
        );

        const hasAnyHistory =
            previousMastitis !== "Not Available" ||
            treatment !== "Not Available";

        return `
            <tr>
                <td>
                    <strong>${escapeHTML(name)}</strong>
                    <small>${escapeHTML(tag)}</small>
                </td>

                <td>
                    <span class="records-risk-chip ${riskClassName}">
                        ${Number.isFinite(risk)
                            ? `${risk.toFixed(0)} • ${escapeHTML(getRiskLabel(risk))}`
                            : "—"}
                    </span>
                </td>

                <td>${escapeHTML(String(reading))}</td>

                <td>${escapeHTML(previousMastitis)}</td>

                <td>${escapeHTML(treatment)}</td>

                <td>
                    ${hasAnyHistory
                        ? "AVAILABLE"
                        : "PARTIAL"}
                </td>
            </tr>
        `;
    }).join("");

    tbody.innerHTML = rows;

    setText(
        "recordAnimalCount",
        String(animals.length)
    );

    setText(
        "recordHighRisk",
        String(highRiskCount)
    );

    setText(
        "recordHistoryState",
        highRiskCount > 0
            ? "REVIEW"
            : "PARTIAL"
    );
}


/* =========================================================
   ALERT CENTER
   ========================================================= */

function getAlertType(alert) {

    const severity = String(
        alert?.severity ??
        alert?.level ??
        alert?.priority ??
        ""
    ).toLowerCase();

    const risk = Number(
        alert?.risk_score ??
        alert?.risk ??
        0
    );

    if (
        severity.includes("high") ||
        severity.includes("critical") ||
        risk >= 70
    ) {
        return "priority";
    }

    if (
        severity.includes("moderate") ||
        severity.includes("warning") ||
        risk >= 45
    ) {
        return "warning";
    }

    return "monitor";
}


function renderEnhancedAlerts(alerts) {

    const container = el("fullAlerts");

    if (!container) return;

    const list = Array.isArray(alerts)
        ? alerts
        : [];

    if (list.length === 0) {

        container.innerHTML = `
            <div class="alert-empty">
                <i class="bi bi-check-circle"></i>
                <br>
                No active alerts.
            </div>
        `;

        setText("alertPriorityCount", "0");
        setText("alertWarningCount", "0");
        setText("alertMonitorCount", "0");
        setText("alertTotalCount", "0");

        return;
    }

    let priority = 0;
    let warning = 0;
    let monitor = 0;

    const sorted = [...list].sort((a, b) => {

        const rank = {
            priority: 0,
            warning: 1,
            monitor: 2
        };

        return (
            (rank[getAlertType(a)] ?? 9) -
            (rank[getAlertType(b)] ?? 9)
        );
    });

    container.innerHTML = sorted.map(alert => {

        const type = getAlertType(alert);

        if (type === "priority") priority++;
        else if (type === "warning") warning++;
        else monitor++;

        const title =
            alert?.title ??
            alert?.message ??
            alert?.alert ??
            "Farm monitoring alert";

        const message =
            alert?.description ??
            alert?.detail ??
            alert?.message ??
            "Review the latest available dashboard data.";

        const timestamp =
            alert?.timestamp ??
            alert?.time ??
            alert?.created_at ??
            "";

        let icon = "bi-eye";

        if (type === "priority") {
            icon = "bi-exclamation-octagon-fill";
        } else if (type === "warning") {
            icon = "bi-exclamation-triangle-fill";
        }

        return `
            <div class="alert-item ${type}">

                <div class="alert-item-icon">
                    <i class="bi ${icon}"></i>
                </div>

                <div>
                    <h4>${escapeHTML(String(title))}</h4>
                    <p>${escapeHTML(String(message))}</p>
                </div>

                <div class="alert-item-time">
                    ${escapeHTML(String(timestamp))}
                </div>

            </div>
        `;
    }).join("");

    setText("alertPriorityCount", String(priority));
    setText("alertWarningCount", String(warning));
    setText("alertMonitorCount", String(monitor));
    setText("alertTotalCount", String(list.length));
}


/* =========================================================
   RECOMMENDATIONS
   ========================================================= */

function generateEnhancedRecommendations(data) {

    const recommendations = [];

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const herd = data?.herd || {};

    const highRiskAnimals = animals.filter(animal =>
        Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        ) >= 70
    );

    const moderateAnimals = animals.filter(animal => {

        const risk = Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        );

        return risk >= 45 && risk < 70;
    });

    const activeAnimal =
        animals.find(a => a?.latest) ||
        animals.find(a => a);

    const latest =
        activeAnimal?.latest ||
        activeAnimal ||
        {};

    const ec = Number(
        latest?.milk_ec ??
        latest?.ec ??
        latest?.milkEC
    );

    const ph = Number(
        latest?.milk_ph ??
        latest?.ph ??
        latest?.milkPH
    );

    const scc = Number(
        latest?.scc ??
        latest?.milk_scc ??
        latest?.milkSCC
    );

    /* High-risk herd recommendation */

    if (highRiskAnimals.length > 0) {

        const animal = highRiskAnimals[0];

        recommendations.push({
            type: "priority",
            icon: "bi-exclamation-octagon-fill",
            priority: "PRIORITY",
            title: "Inspect High-Risk Animal",
            message:
                "Review the animal promptly and examine recent milk indicators, animal condition and milking observations.",
            target:
                animal?.tag_id ??
                animal?.tagId ??
                animal?.tag ??
                "High-risk animal"
        });
    }

    /* Moderate-risk herd recommendation */

    if (moderateAnimals.length > 0) {

        recommendations.push({
            type: "warning",
            icon: "bi-eye-fill",
            priority: "MONITOR",
            title: "Increase Herd Monitoring",
            message:
                "Several animals are within the moderate prototype risk range. Review their recent readings and monitor for changes.",
            target:
                `${moderateAnimals.length} animal${moderateAnimals.length === 1 ? "" : "s"}`
        });
    }

    /* Milk indicator recommendation */

    const milkConcern =
        (Number.isFinite(ec) && ec > 6) ||
        (Number.isFinite(ph) && (ph < 5.5 || ph > 7.2)) ||
        (Number.isFinite(scc) && scc > 50);

    if (milkConcern) {

        recommendations.push({
            type: "priority",
            icon: "bi-droplet-half",
            priority: "MILK REVIEW",
            title: "Review Milk Indicators",
            message:
                "One or more prototype milk-quality screening indicators are outside the dashboard's internal screening ranges. Check sensor readings and consider validation.",
            target:
                activeAnimal?.tag_id ??
                activeAnimal?.tagId ??
                activeAnimal?.tag ??
                "Active animal"
        });
    }

    /* Milking recommendation */

    recommendations.push({
        type: "monitor",
        icon: "bi-droplet",
        priority: "ROUTINE",
        title: "Maintain Milking Hygiene",
        message:
            "Continue consistent pre-milking preparation, equipment sanitation and post-milking care.",
        target: "Farm milking operations"
    });

    /* Environment recommendation */

    const temp = Number(
        latest?.temperature ??
        latest?.temp
    );

    const humidity = Number(
        latest?.humidity ??
        latest?.rel_humidity
    );

    if (
        (Number.isFinite(temp) && temp >= 30) ||
        (Number.isFinite(humidity) && humidity >= 75)
    ) {

        recommendations.push({
            type: "warning",
            icon: "bi-cloud-sun",
            priority: "ENVIRONMENT",
            title: "Review Environmental Conditions",
            message:
                "Current temperature or humidity indicates elevated environmental load. Check ventilation, shade, water availability and bedding.",
            target: "Farm environment"
        });
    }

    if (recommendations.length === 0) {

        recommendations.push({
            type: "stable",
            icon: "bi-check-circle-fill",
            priority: "ROUTINE",
            title: "Maintain Routine Monitoring",
            message:
                "No elevated prototype risk signal currently requires a specific additional action.",
            target: "Whole herd"
        });
    }

    return recommendations;
}


function renderEnhancedRecommendations(recommendations) {

    const grid = el("recommendationGrid");

    if (!grid) return;

    const list = Array.isArray(recommendations)
        ? recommendations
        : [];

    const priorityCount = list.filter(
        r => r.type === "priority"
    ).length;

    const riskCount = list.filter(
        r =>
            r.type === "priority" ||
            r.type === "warning"
    ).length;

    const animalTargets = new Set(
        list
            .map(r => r.target)
            .filter(Boolean)
    );

    setText(
        "recommendationTotal",
        String(list.length)
    );

    setText(
        "recommendationPriority",
        String(priorityCount)
    );

    setText(
        "recommendationRisk",
        String(riskCount)
    );

    setText(
        "recommendationAnimals",
        String(animalTargets.size)
    );

    setText(
        "recommendationStatus",
        ""
    );

    const status = el("recommendationStatus");

    if (status) {

        const label =
            priorityCount > 0
                ? "PRIORITY ACTIONS ACTIVE"
                : riskCount > 0
                    ? "ENHANCED MONITORING"
                    : "ROUTINE DECISION SUPPORT";

        status.innerHTML =
            `<span class="status-dot"></span>${label}`;
    }

    grid.innerHTML = list.map(item => {

        return `
            <article class="ai-recommendation ${item.type}">

                <div class="ai-rec-top">

                    <div class="ai-rec-icon">
                        <i class="bi ${item.icon}"></i>
                    </div>

                    <span class="ai-rec-priority">
                        ${escapeHTML(item.priority)}
                    </span>

                </div>

                <h3>${escapeHTML(item.title)}</h3>

                <p>${escapeHTML(item.message)}</p>

                <div class="ai-rec-animal">
                    <i class="bi bi-bullseye"></i>
                    ${escapeHTML(item.target)}
                </div>

            </article>
        `;
    }).join("");
}


function updateEnhancedRecommendations(data) {

    const recommendations =
        generateEnhancedRecommendations(data);

    renderEnhancedRecommendations(recommendations);
}


/* =========================================================
   GIS & HOTSPOTS
   ========================================================= */

function updateGIS(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const locationAnimals = animals.filter(animal => {

        const lat = Number(
            animal?.latitude ??
            animal?.lat ??
            animal?.location?.lat
        );

        const lng = Number(
            animal?.longitude ??
            animal?.lng ??
            animal?.lon ??
            animal?.location?.lng
        );

        return Number.isFinite(lat) && Number.isFinite(lng);
    });

    const averageRisk = animals.length
        ? animals.reduce((sum, animal) => {
            return sum + Number(
                animal?.risk_score ??
                animal?.risk ??
                0
            );
        }, 0) / animals.length
        : 0;

    const highRisk = animals.filter(animal =>
        Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        ) >= 70
    ).length;

    setText(
        "gisMappedAnimals",
        String(locationAnimals.length)
    );

    setText(
        "gisHighHotspots",
        String(highRisk)
    );

    setText(
        "gisAverageRisk",
        animals.length
            ? averageRisk.toFixed(0)
            : "—"
    );

    renderHotspots(animals);
    refreshGISMarkers(locationAnimals);
}


function renderHotspots(animals) {

    const container = el("hotspotList");

    if (!container) return;

    const geoAnimals = animals.filter(animal => {

        const lat = Number(
            animal?.latitude ??
            animal?.lat ??
            animal?.location?.lat
        );

        const lng = Number(
            animal?.longitude ??
            animal?.lng ??
            animal?.lon ??
            animal?.location?.lng
        );

        return Number.isFinite(lat) && Number.isFinite(lng);
    });

    if (geoAnimals.length === 0) {

        container.innerHTML = `
            <div class="hotspot-empty">
                No animal coordinates are currently available.
            </div>
        `;

        return;
    }

    const sorted = [...geoAnimals]
        .sort((a, b) =>
            Number(b?.risk_score ?? b?.risk ?? 0) -
            Number(a?.risk_score ?? a?.risk ?? 0)
        )
        .slice(0, 8);

    container.innerHTML = sorted.map(animal => {

        const risk = Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        );

        const tag =
            animal?.tag_id ??
            animal?.tagId ??
            animal?.tag ??
            "Animal";

        const name =
            animal?.name ??
            animal?.animal_name ??
            animal?.animalName ??
            "Animal";

        return `
            <div class="hotspot-row">

                <div class="hotspot-icon">
                    <i class="bi bi-geo-alt-fill"></i>
                </div>

                <div>
                    <strong>${escapeHTML(name)}</strong>
                    <small>${escapeHTML(tag)} • ${escapeHTML(getRiskLabel(risk))}</small>
                </div>

                <div class="hotspot-score">
                    ${risk.toFixed(0)}
                </div>

            </div>
        `;
    }).join("");
}


function refreshGISMarkers(locationAnimals) {

    if (!farmMap || !Array.isArray(locationAnimals)) {
        return;
    }

    if (!window.mastiguardMarkers) {
        window.mastiguardMarkers = [];
    }

    window.mastiguardMarkers.forEach(marker => {
        try {
            farmMap.removeLayer(marker);
        } catch (_) {}
    });

    window.mastiguardMarkers = [];

    const bounds = [];

    locationAnimals.forEach(animal => {

        const lat = Number(
            animal?.latitude ??
            animal?.lat ??
            animal?.location?.lat
        );

        const lng = Number(
            animal?.longitude ??
            animal?.lng ??
            animal?.lon ??
            animal?.location?.lng
        );

        const risk = Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        );

        const tag =
            animal?.tag_id ??
            animal?.tagId ??
            animal?.tag ??
            "Animal";

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }

        const color =
            risk >= 70
                ? "var(--red)"
                : risk >= 45
                    ? "var(--amber)"
                    : "var(--green)";

        const marker = L.circleMarker(
            [lat, lng],
            {
                radius: risk >= 70 ? 10 : 7,
                weight: 2,
                color:
                    risk >= 70
                        ? "#E4572E"
                        : risk >= 45
                            ? "#E8A33D"
                            : "#6FCF7A",
                fillOpacity: 0.75
            }
        ).addTo(farmMap);

        marker.bindPopup(`
            <strong>${escapeHTML(String(tag))}</strong><br>
            Risk: ${risk.toFixed(0)}<br>
            Level: ${escapeHTML(getRiskLabel(risk))}
        `);

        window.mastiguardMarkers.push(marker);
        bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {

        try {
            farmMap.fitBounds(bounds, {
                padding: [25, 25]
            });
        } catch (_) {}
    }
}


/* =========================================================
   AI MODEL PAGE
   ========================================================= */

function updateAIModel(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const activeAnimal =
        animals.find(a => a?.latest) ||
        animals.find(a => a);

    const latest =
        activeAnimal?.latest ||
        activeAnimal ||
        {};

    const risk = Number(
        activeAnimal?.risk_score ??
        activeAnimal?.risk ??
        0
    );

    const ec = Number(
        latest?.milk_ec ??
        latest?.ec ??
        latest?.milkEC
    );

    const ph = Number(
        latest?.milk_ph ??
        latest?.ph ??
        latest?.milkPH
    );

    const scc = Number(
        latest?.scc ??
        latest?.milk_scc ??
        latest?.milkSCC
    );

    const temperature = Number(
        latest?.temperature ??
        latest?.temp
    );

    setText(
        "aiRiskScore",
        Number.isFinite(risk)
            ? `${risk.toFixed(0)} / 100`
            : "—"
    );

    let decision = "Waiting for current animal data.";

    if (risk >= 70) {
        decision =
            "High prototype risk signal. Prioritize animal inspection and review recent milk indicators.";
    } else if (risk >= 45) {
        decision =
            "Moderate prototype risk signal. Continue enhanced monitoring and review recent sensor trends.";
    } else if (risk >= 25) {
        decision =
            "Low-level prototype risk signal. Maintain routine monitoring.";
    } else if (Number.isFinite(risk)) {
        decision =
            "No elevated prototype risk is currently indicated.";
    }

    setText(
        "aiDecisionState",
        decision
    );

    setText(
        "aiFeatureECValue",
        Number.isFinite(ec)
            ? ec.toFixed(2)
            : "—"
    );

    setText(
        "aiFeaturePHValue",
        Number.isFinite(ph)
            ? ph.toFixed(2)
            : "—"
    );

    setText(
        "aiFeatureSCCValue",
        Number.isFinite(scc)
            ? scc.toFixed(1)
            : "—"
    );

    setText(
        "aiFeatureTempValue",
        Number.isFinite(temperature)
            ? `${temperature.toFixed(1)} °C`
            : "—"
    );


    /*
     * These are display-normalized sensor bars,
     * NOT model feature-importance percentages.
     */

    setFeatureBar(
        "aiFeatureECBar",
        Number.isFinite(ec)
            ? Math.min(Math.max(ec / 10, 0), 1) * 100
            : 0
    );

    setFeatureBar(
        "aiFeaturePHBar",
        Number.isFinite(ph)
            ? Math.min(Math.max(ph / 10, 0), 1) * 100
            : 0
    );

    setFeatureBar(
        "aiFeatureSCCBar",
        Number.isFinite(scc)
            ? Math.min(Math.max(scc / 100, 0), 1) * 100
            : 0
    );

    setFeatureBar(
        "aiFeatureTempBar",
        Number.isFinite(temperature)
            ? Math.min(Math.max(temperature / 45, 0), 1) * 100
            : 0
    );
}


function setFeatureBar(id, percentage) {

    const node = el(id);

    if (!node) return;

    const value = Math.max(
        0,
        Math.min(100, Number(percentage) || 0)
    );

    node.style.width = `${value}%`;
}


/* =========================================================
   REPORTS
   ========================================================= */

function buildReport(type) {

    const data = dashboardData || {};
    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    const herd = data?.herd || {};

    const highRisk = animals.filter(animal =>
        Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        ) >= 70
    );

    const moderateRisk = animals.filter(animal => {

        const risk = Number(
            animal?.risk_score ??
            animal?.risk ??
            0
        );

        return risk >= 45 && risk < 70;
    });

    const averageRisk = animals.length
        ? animals.reduce((sum, animal) =>
            sum + Number(
                animal?.risk_score ??
                animal?.risk ??
                0
            ), 0) / animals.length
        : 0;

    const generatedAt = new Date().toLocaleString();

    let title = "Mastiguard-AI Report";
    let lines = [];

    if (type === "herd") {

        title = "HERD RISK SUMMARY";

        lines = [
            title,
            "==============================",
            `Generated: ${generatedAt}`,
            "",
            `Total animals: ${animals.length}`,
            `High-risk animals: ${highRisk.length}`,
            `Moderate-risk animals: ${moderateRisk.length}`,
            `Average risk score: ${averageRisk.toFixed(1)}`,
            "",
            "Priority action:",
            highRisk.length > 0
                ? "Inspect high-risk animals and review available sensor indicators."
                : "No high-risk animal group is currently detected."
        ];

    } else if (type === "milk") {

        title = "MILK INTELLIGENCE REPORT";

        const active =
            animals.find(a => a?.latest) ||
            animals[0];

        const latest =
            active?.latest ||
            active ||
            {};

        lines = [
            title,
            "==============================",
            `Generated: ${generatedAt}`,
            "",
            `Animal: ${active?.tag_id ?? active?.tagId ?? active?.tag ?? "—"}`,
            `Risk score: ${Number(active?.risk_score ?? active?.risk ?? 0).toFixed(0)}`,
            `Milk EC: ${latest?.milk_ec ?? latest?.ec ?? "—"}`,
            `Milk pH: ${latest?.milk_ph ?? latest?.ph ?? "—"}`,
            `SCC: ${latest?.scc ?? latest?.milk_scc ?? "—"}`,
            "",
            "Screening note:",
            "Milk indicators shown by the prototype should be validated against laboratory methods."
        ];

    } else if (type === "alerts") {

        title = "ALERT REPORT";

        const alerts =
            window.mastiguardAlerts || [];

        lines = [
            title,
            "==============================",
            `Generated: ${generatedAt}`,
            "",
            `Active alerts: ${alerts.length}`,
            "",
            ...alerts.map((alert, index) => {
                return `${index + 1}. ${alert?.title ?? alert?.message ?? "Alert"}`
            })
        ];

    } else {

        title = "FARM OPERATIONS REPORT";

        lines = [
            title,
            "==============================",
            `Generated: ${generatedAt}`,
            "",
            `Animals: ${animals.length}`,
            `High-risk: ${highRisk.length}`,
            `Moderate-risk: ${moderateRisk.length}`,
            "",
            "Milking:",
            "Scheduled sessions are configured for 05:30, 13:30 and 21:00.",
            "",
            "Nutrition:",
            "Automated feed and water intake are not currently integrated.",
            "",
            "Housing & Hygiene:",
            "Primary housing and hygiene checks remain manual.",
            "",
            "Environment:",
            "Live prototype temperature/humidity monitoring is available when sensor data is present."
        ];
    }

    return lines.join("\n");
}


function setupReportActions() {

    document.querySelectorAll(".report-action").forEach(button => {

        button.addEventListener("click", () => {

            const type =
                button.dataset.report ||
                "herd";

            const output =
                buildReport(type);

            setText(
                "reportOutput",
                output
            );

            setText(
                "reportGenerated",
                new Date().toLocaleTimeString()
            );
        });
    });

    const copyButton =
        el("copyReportBtn");

    if (copyButton) {

        copyButton.addEventListener("click", async () => {

            const output =
                el("reportOutput");

            if (!output) return;

            try {

                await navigator.clipboard.writeText(
                    output.textContent
                );

                copyButton.innerHTML =
                    `<i class="bi bi-check2"></i> Copied`;

                setTimeout(() => {
                    copyButton.innerHTML =
                        `<i class="bi bi-copy"></i> Copy`;
                }, 1400);

            } catch (_) {

                alert("Could not copy the report.");
            }
        });
    }
}


/* =========================================================
   SETTINGS
   ========================================================= */

function updateSettings(data) {

    const gatewayState =
        el("settingsGatewayState");

    const dashboardConnected =
        dashboardData !== null;

    if (gatewayState) {
        gatewayState.textContent =
            dashboardConnected
                ? "CONNECTED"
                : "WAITING";
    }
}


function setupSettings() {

    const highRisk =
        el("settingHighRisk");

    const moderateRisk =
        el("settingModerateRisk");

    const recommendations =
        el("settingRecommendations");


    /*
     * Store preferences locally.
     */

    const saved = {
        highRisk:
            localStorage.getItem("mastiguard_high_risk") !== "false",

        moderateRisk:
            localStorage.getItem("mastiguard_moderate_risk") !== "false",

        recommendations:
            localStorage.getItem("mastiguard_recommendations") !== "false"
    };

    if (highRisk) {
        highRisk.checked = saved.highRisk;

        highRisk.addEventListener("change", () => {
            localStorage.setItem(
                "mastiguard_high_risk",
                String(highRisk.checked)
            );
        });
    }

    if (moderateRisk) {
        moderateRisk.checked = saved.moderateRisk;

        moderateRisk.addEventListener("change", () => {
            localStorage.setItem(
                "mastiguard_moderate_risk",
                String(moderateRisk.checked)
            );
        });
    }

    if (recommendations) {
        recommendations.checked =
            saved.recommendations;

        recommendations.addEventListener("change", () => {
            localStorage.setItem(
                "mastiguard_recommendations",
                String(recommendations.checked)
            );
        });
    }
}


/* =========================================================
   REFRESH BUTTONS
   ========================================================= */

function setupRemainingControls() {

    const recordsButton =
        el("refreshRecordsBtn");

    if (recordsButton) {
        recordsButton.addEventListener(
            "click",
            () => {
                if (dashboardData) {
                    renderHealthRecords(
                        dashboardData.animals || []
                    );
                }
            }
        );
    }

    const alertsButton =
        el("refreshAlertsBtn");

    if (alertsButton) {
        alertsButton.addEventListener(
            "click",
            () => {
                loadAlerts();
            }
        );
    }
}


/* =========================================================
   PATCH MAIN DASHBOARD UPDATE
   ========================================================= */

function updateAdvancedModules(data) {

    const animals = Array.isArray(data?.animals)
        ? data.animals
        : [];

    updateMilkingOperations(data);
    renderHealthRecords(animals);
    updateEnhancedRecommendations(data);
    updateGIS(data);
    updateAIModel(data);
    updateSettings(data);

    setText(
        "reportAnimals",
        String(animals.length)
    );

    setText(
        "reportHighRisk",
        String(
            animals.filter(a =>
                Number(
                    a?.risk_score ??
                    a?.risk ??
                    0
                ) >= 70
            ).length
        )
    );
}


/* =========================================================
   SAFE OVERRIDE FOR GIS MAP INITIALIZATION
   ========================================================= */

function initializeAdvancedMap() {

    if (typeof initializeMap !== "function") {
        return;
    }

    try {
        initializeMap();
    } catch (error) {
        console.warn(
            "GIS initialization warning:",
            error
        );
    }
}


/* =========================================================
   INTEGRATION HOOK
   ========================================================= */

setupReportActions();
setupSettings();
setupRemainingControls();










// ============================================================
// STARTUP
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateDate();

        setupNavigation();

        setupAnimalFilters();

        setupAnimalInteractions();

        setupAddAnimalButton();

        createAnimalModal();

        loadDashboard();

        loadAlerts();


        setInterval(
            loadDashboard,
            5000
        );


        setInterval(
            loadAlerts,
            5000
        );

    }
);
