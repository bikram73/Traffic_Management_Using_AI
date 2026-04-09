from __future__ import annotations

import csv
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_from_directory, url_for


BASE_DIR = Path(__file__).resolve().parent
IMAGES_DIR = BASE_DIR / "images"
CHARTS_DIR = BASE_DIR / "Charts"
VIDEO_DIR = BASE_DIR / "Video"

app = Flask(__name__)


TRAFFIC_COUNTS = {
    "North": 45,
    "East": 57,
    "South": 28,
    "West": 47,
}


TRAFFIC_CONTROLLER = {
    "greenMin": 6,
    "greenMax": 18,
    "yellow": 3,
}


ROAD_OPTIONS = {
    "city-grid": {
        "label": "Live City Simulation",
        "kind": "image",
        "file": "modint.png",
    },
    "classic-cross": {
        "label": "Live Crossroad Simulation",
        "kind": "image",
        "file": "modint.png",
    },
    "dynamic-sim": {
        "label": "Live Dynamic Density",
        "kind": "video",
        "file": "Dynamic.mp4",
    },
    "static-sim": {
        "label": "Live Static Density",
        "kind": "video",
        "file": "Static.mp4",
    },
}


DEFAULT_ROAD = "dynamic-sim"


VEHICLE_SPRITES = [
    {"type": "car", "path": "right/car.png"},
    {"type": "bus", "path": "right/bus.png"},
    {"type": "truck", "path": "right/truck.png"},
    {"type": "rickshaw", "path": "right/rickshaw.png"},
    {"type": "bike", "path": "right/bike.png"},
]


def busiest_path(counts: dict[str, int]) -> tuple[str, int]:
    return max(counts.items(), key=lambda item: item[1])


def load_comparison_chart() -> dict[str, list[int] | list[str]]:
    csv_path = CHARTS_DIR / "chart.csv"
    labels: list[str] = []
    static_values: list[int] = []
    dynamic_values: list[int] = []

    with csv_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.reader(handle)
        next(reader, None)
        for row in reader:
            if len(row) < 3:
                continue
            labels.append(row[0])
            static_values.append(int(row[1]))
            dynamic_values.append(int(row[2]))

    return {
        "labels": labels,
        "static": static_values,
        "dynamic": dynamic_values,
    }


def traffic_snapshot() -> dict[str, object]:
    route, count = busiest_path(TRAFFIC_COUNTS)
    total = sum(TRAFFIC_COUNTS.values())
    return {
        "counts": TRAFFIC_COUNTS,
        "busiest": {"route": route, "count": count},
        "total": total,
        "comparison": load_comparison_chart(),
    }


def road_payload(selected_key: str) -> dict[str, object]:
    if selected_key not in ROAD_OPTIONS:
        selected_key = DEFAULT_ROAD

    options = []
    for key, road in ROAD_OPTIONS.items():
        source = (
            url_for("video_asset", filename=road["file"])
            if road["kind"] == "video"
            else url_for("asset_image", filename=road["file"])
        )
        options.append(
            {
                "key": key,
                "label": road["label"],
                "kind": road["kind"],
                "source": source,
                "active": key == selected_key,
            }
        )

    vehicle_sprites = [
        {
            "type": sprite["type"],
            "image": url_for("asset_image", filename=sprite["path"]),
        }
        for sprite in VEHICLE_SPRITES
    ]

    active_road = next(item for item in options if item["active"])
    return {
        "selected": selected_key,
        "activeRoad": active_road,
        "options": options,
        "vehicleSprites": vehicle_sprites,
        "controller": TRAFFIC_CONTROLLER,
    }


@app.route("/")
def dashboard() -> str:
    selected_road = request.args.get("road", DEFAULT_ROAD)
    snapshot = traffic_snapshot()
    roads = road_payload(selected_road)
    return render_template(
        "dashboard.html",
        snapshot=snapshot,
        roads=roads,
    )


@app.route("/graphs")
def graphs() -> str:
    snapshot = traffic_snapshot()
    return render_template(
        "graphs.html",
        snapshot=snapshot,
    )


@app.route("/api/traffic")
def api_traffic() -> object:
    return jsonify(traffic_snapshot())


@app.route("/assets/<path:filename>")
def asset_image(filename: str):
    return send_from_directory(IMAGES_DIR, filename)


@app.route("/videos/<path:filename>")
def video_asset(filename: str):
    return send_from_directory(VIDEO_DIR, filename)


if __name__ == "__main__":
    app.run(debug=True)