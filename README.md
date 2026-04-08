# Traffic Management Using AI

<div align="left">

![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Web%20Dashboard-000000?logo=flask&logoColor=white)
![Pygame](https://img.shields.io/badge/Pygame-Simulation-2BAA4A)
![Matplotlib](https://img.shields.io/badge/Matplotlib-Analytics-11557C)
![Status](https://img.shields.io/badge/Status-Active-success)

</div>

Smart traffic signal simulation project with a dynamic timing model, visual simulation, and a Flask dashboard for traffic snapshots and graphs.

## Overview

This project demonstrates how adaptive signal timing can reduce congestion versus static timing.

- 🚦 Dynamic and static traffic signal behavior comparison
- 🚗 Multi-direction vehicle simulation with lane logic
- 📊 Graph view for static vs dynamic results
- 🌐 Web dashboard with road views and traffic cards

## Features

- ✅ Dynamic green time calculation based on waiting vehicles
- ✅ 4-way signal cycle with red/yellow/green states
- ✅ Vehicle generation with lane-specific direction behavior
- ✅ Visual simulation using Pygame assets
- ✅ Flask dashboard with:
	- selectable road/video views
	- traffic snapshot cards
	- graphs page from CSV chart data

## Project Structure

```text
Traffic-Management-Using-AI-master/
├── README.md
├── requirements.txt
├── web_app.py
├── simulation.py
├── simulation Dy.py
├── simulation state.py
├── web_video.mp4
├── mod_int.png
├── first.png
├── Charts/
│   ├── chart.csv
│   └── chart.py
├── Video/
│   ├── Dynamic.mp4
│   └── Static.mp4
├── templates/
│   ├── base.html
│   ├── dashboard.html
│   └── graphs.html
├── static/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── dashboard.js
│       └── graphs.js
└── images/
		├── down/
		├── left/
		├── right/
		├── up/
		└── signals/
```

## Installation

### 1. Clone or download project

```bash
git clone <your-repo-url>
cd Traffic-Management-Using-AI-master
```

### 2. Create and activate virtual environment

Windows (PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

Dependencies in this project:

- Flask
- pygame
- neat-python
- matplotlib

## Run the Project

### Run Pygame simulation

```bash
python simulation.py
```

### Run Flask dashboard

```bash
python web_app.py
```

Open in browser:

```text
http://127.0.0.1:5000
```

## Core Files and Functions

### web_app.py

- Builds Flask server for dashboard and graphs
- Main routes:
	- `/` dashboard view
	- `/graphs` graph view
	- `/api/traffic` traffic snapshot JSON
	- `/assets/<path:filename>` image/sprite serving
	- `/videos/<path:filename>` video serving

### simulation.py

- Main real-time traffic simulation logic
- Key classes:
	- `TrafficSignal` for timer state
	- `Vehicle` for sprite movement and lane behavior
- Key functions:
	- `initialize()` signal initialization
	- `setTime()` dynamic green-time calculation
	- `repeat()` signal cycle loop
	- `generateVehicles()` continuous vehicle spawning
	- `simulationTime()` run timer and summary metrics

### Charts/chart.py

- Reads `Charts/chart.csv`
- Plots static vs dynamic vehicle throughput using Matplotlib

## How Dynamic Timing Works

1. Vehicles are generated randomly across directions and lanes.
2. For the upcoming signal, waiting vehicle classes are counted.
3. Green duration is computed from weighted crossing times.
4. Time is clamped between configured min/max limits.
5. Signal cycle continues and performance is measured.

## Outputs

- 🚘 Live animated simulation window (Pygame)
- 🌐 Dashboard road view and traffic summary cards
- 📉 Graph comparison for static vs dynamic models

## Notes

- `simulation.py` is the main simulation entry point.
- `simulation Dy.py` and `simulation state.py` are alternate/legacy variants.
- Dashboard snapshot defaults may be static unless connected to live simulation data.

## Troubleshooting

- If Flask app fails to start:
	- ensure virtual environment is active
	- run `pip install -r requirements.txt`
	- verify you are inside project folder before running commands
- If Pygame assets fail to load:
	- keep project folder structure unchanged
	- confirm `images/` and `images/signals/` exist

## Future Improvements

- 🔄 Real-time bridge between Pygame simulation and Flask API
- 🧠 Replace heuristic timing with trained AI policy
- 📦 Docker setup for one-command launch
- 🧪 Automated tests for signal timing rules

