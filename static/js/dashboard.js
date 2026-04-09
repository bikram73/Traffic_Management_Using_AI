const roadData = window.__ROAD_DATA__ || {};
const snapshotData = window.__TRAFFIC_SNAPSHOT__ || {};
const layer = document.getElementById("vehicleLayer");
const hasVehicleSimulation = Boolean(layer && Array.isArray(roadData.vehicleSprites));

const flowCounts = {
  North: Number(snapshotData?.counts?.North || 0),
  East: Number(snapshotData?.counts?.East || 0),
  South: Number(snapshotData?.counts?.South || 0),
  West: Number(snapshotData?.counts?.West || 0),
};

const signals = {
  north: document.querySelector('.signal[data-dir="north"]'),
  east: document.querySelector('.signal[data-dir="east"]'),
  south: document.querySelector('.signal[data-dir="south"]'),
  west: document.querySelector('.signal[data-dir="west"]'),
};

const signalTimers = {
  north: document.getElementById("timer-north"),
  east: document.getElementById("timer-east"),
  south: document.getElementById("timer-south"),
  west: document.getElementById("timer-west"),
};

const directionOrder = ["north", "east", "south", "west"];

const controllerConfig = {
  greenMin: Number(roadData?.controller?.greenMin || 6),
  greenMax: Number(roadData?.controller?.greenMax || 18),
  yellow: Number(roadData?.controller?.yellow || 3),
};

const controllerState = {
  activeDirection: "north",
  lastDirection: "west",
  mode: "green",
  countdown: Number(roadData?.controller?.greenMin || 6),
};

let latestWaiting = {
  north: 0,
  east: 0,
  south: 0,
  west: 0,
};

function routeFromDirection(direction) {
  if (direction === "north") return "North";
  if (direction === "east") return "East";
  if (direction === "south") return "South";
  return "West";
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulateWaitingQueues() {
  for (const direction of directionOrder) {
    const incoming = randomInt(0, 2);
    latestWaiting[direction] = Math.min(25, Number(latestWaiting[direction] || 0) + incoming);
  }

  if (controllerState.mode === "green") {
    const drain = randomInt(1, 4);
    const active = controllerState.activeDirection;
    latestWaiting[active] = Math.max(0, Number(latestWaiting[active] || 0) - drain);
  }
}

function updateCountsFromController() {
  if (controllerState.mode !== "green") return;

  const route = routeFromDirection(controllerState.activeDirection);
  const throughput = Math.max(1, randomInt(1, 3) + Math.floor(Number(latestWaiting[controllerState.activeDirection] || 0) / 6));
  flowCounts[route] = Number(flowCounts[route] || 0) + throughput;
}

function setSignalState(direction, state) {
  const node = signals[direction];
  if (!node) return;
  node.classList.remove("state-red", "state-yellow", "state-green");
  node.classList.add(`state-${state}`);
}

function laneDirection(laneClass) {
  if (laneClass === "lane-west-east") return "west";
  if (laneClass === "lane-east-west") return "east";
  if (laneClass === "lane-north-south") return "north";
  return "south";
}

function chooseNextDirection(waiting) {
  let maxQueue = -1;
  let candidates = [];

  for (const direction of directionOrder) {
    const queue = Number(waiting[direction] || 0);
    if (queue > maxQueue) {
      maxQueue = queue;
      candidates = [direction];
    } else if (queue === maxQueue) {
      candidates.push(direction);
    }
  }

  if (maxQueue <= 0) {
    const currentIndex = directionOrder.indexOf(controllerState.lastDirection);
    return directionOrder[(currentIndex + 1) % directionOrder.length];
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const startIdx = directionOrder.indexOf(controllerState.lastDirection);
  for (let i = 1; i <= directionOrder.length; i += 1) {
    const candidate = directionOrder[(startIdx + i) % directionOrder.length];
    if (candidates.includes(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

function computeGreenTime(direction, waiting) {
  const queue = Number(waiting[direction] || 0);
  const dynamic = controllerConfig.greenMin + queue;
  return Math.max(controllerConfig.greenMin, Math.min(controllerConfig.greenMax, dynamic));
}

function applySignalStates() {
  for (const direction of directionOrder) {
    setSignalState(direction, "red");
  }

  if (controllerState.mode === "green") {
    setSignalState(controllerState.activeDirection, "green");
  } else {
    setSignalState(controllerState.activeDirection, "yellow");
  }
}

function updateSignalTimers() {
  Object.entries(signalTimers).forEach(([direction, node]) => {
    if (!node) return;
    if (direction === controllerState.activeDirection) {
      node.textContent = String(controllerState.countdown);
      node.style.opacity = "1";
      return;
    }

    node.textContent = String(Number(latestWaiting[direction] || 0));
    node.style.opacity = "0.55";
  });
}

function tickController() {
  controllerState.countdown -= 1;

  if (controllerState.countdown >= 0) {
    updateSignalTimers();
    return;
  }

  if (controllerState.mode === "green") {
    controllerState.mode = "yellow";
    controllerState.countdown = controllerConfig.yellow;
  } else {
    controllerState.lastDirection = controllerState.activeDirection;
    controllerState.activeDirection = chooseNextDirection(latestWaiting);
    controllerState.mode = "green";
    controllerState.countdown = computeGreenTime(controllerState.activeDirection, latestWaiting);
  }

  applySignalStates();
  updateSignalTimers();
}

function isLaneGreen(laneClass) {
  return controllerState.mode === "green" && laneDirection(laneClass) === controllerState.activeDirection;
}

function routeFromLane(laneClass) {
  if (laneClass === "lane-west-east") return "West";
  if (laneClass === "lane-east-west") return "East";
  if (laneClass === "lane-north-south") return "North";
  return "South";
}

function renderTrafficSnapshot() {
  const cards = document.querySelectorAll(".stat-card[data-route]");
  const total = Object.values(flowCounts).reduce((sum, value) => sum + value, 0);

  let busiestRoute = "North";
  let busiestCount = -1;

  cards.forEach((card) => {
    const route = card.getAttribute("data-route");
    const routeCount = Number(flowCounts[route] || 0);
    const countNode = card.querySelector(".route-count");
    const meterFill = card.querySelector(".meter-fill");
    const meterPercent = total > 0 ? (routeCount / total) * 100 : 0;

    if (countNode) countNode.textContent = String(routeCount);
    if (meterFill) meterFill.style.width = `${meterPercent.toFixed(0)}%`;

    card.classList.remove("active");
    if (routeCount > busiestCount) {
      busiestCount = routeCount;
      busiestRoute = route;
    }
  });

  cards.forEach((card) => {
    if (card.getAttribute("data-route") === busiestRoute) {
      card.classList.add("active");
    }
  });

  const totalNode = document.getElementById("totalVehicles");
  if (totalNode) totalNode.textContent = String(total);

  const busiestRouteNode = document.getElementById("busiestRoute");
  const busiestCountNode = document.getElementById("busiestCount");
  const insightRouteNode = document.getElementById("insightBusiestRoute");
  const insightCountNode = document.getElementById("insightBusiestCount");

  if (busiestRouteNode) busiestRouteNode.textContent = busiestRoute;
  if (busiestCountNode) busiestCountNode.textContent = `${busiestCount} vehicles`;
  if (insightRouteNode) insightRouteNode.textContent = busiestRoute;
  if (insightCountNode) insightCountNode.textContent = String(busiestCount);

  try {
    window.localStorage.setItem(
      "traffic-live-counts",
      JSON.stringify({
        counts: flowCounts,
        total,
        busiestRoute,
        busiestCount,
        updatedAt: Date.now(),
      }),
    );
  } catch (error) {
    void error;
  }
}

if (hasVehicleSimulation) {
  const sprites = roadData.vehicleSprites;
  const lanes = [
    { cls: "lane-west-east", min: 42, max: 56 },
    { cls: "lane-east-west", min: 42, max: 56 },
    { cls: "lane-north-south", min: 42, max: 56 },
    { cls: "lane-south-north", min: 42, max: 56 },
  ];

  const vehicleCount = 28;
  const vehicles = [];

  function laneConfig(laneClass, width, height, size) {
    const horizontalOffset = 18;
    const verticalOffset = 18;
    if (laneClass === "lane-west-east") {
      return {
        x: -size,
        y: height * 0.5 - horizontalOffset,
        speedAxis: "x",
        speedSign: 1,
        resetAt: width + size,
        resetTo: -size,
        stopLine: width * 0.455,
        crossLine: width * 0.5,
      };
    }
    if (laneClass === "lane-east-west") {
      return {
        x: width + size,
        y: height * 0.5 + horizontalOffset,
        speedAxis: "x",
        speedSign: -1,
        resetAt: -size,
        resetTo: width + size,
        stopLine: width * 0.545,
        crossLine: width * 0.5,
      };
    }
    if (laneClass === "lane-north-south") {
      return {
        x: width * 0.5 + verticalOffset,
        y: -size,
        speedAxis: "y",
        speedSign: 1,
        resetAt: height + size,
        resetTo: -size,
        stopLine: height * 0.455,
        crossLine: height * 0.5,
      };
    }
    return {
      x: width * 0.5 - verticalOffset,
      y: height + size,
      speedAxis: "y",
      speedSign: -1,
      resetAt: -size,
      resetTo: height + size,
      stopLine: height * 0.545,
      crossLine: height * 0.5,
    };
  }

  function randomSpeedPxPerSecond(lane) {
    return lane.min + Math.random() * (lane.max - lane.min);
  }

  function resetVehiclePosition(vehicle, width, height) {
    const cfg = laneConfig(vehicle.laneClass, width, height, vehicle.size);
    vehicle.x = cfg.x;
    vehicle.y = cfg.y;
    vehicle.crossedStopLine = false;
    vehicle.flowCounted = false;
  }

  function computeWaitingCounts(width, height) {
    const waiting = { north: 0, east: 0, south: 0, west: 0 };

    for (const vehicle of vehicles) {
      if (vehicle.crossedStopLine) continue;
      const cfg = laneConfig(vehicle.laneClass, width, height, vehicle.size);
      const dir = laneDirection(vehicle.laneClass);

      let distanceToStopLine;
      if (cfg.speedAxis === "x") {
        distanceToStopLine = (cfg.stopLine - vehicle.x) * cfg.speedSign;
      } else {
        distanceToStopLine = (cfg.stopLine - vehicle.y) * cfg.speedSign;
      }

      if (distanceToStopLine >= -2) {
        waiting[dir] += 1;
      }
    }

    return waiting;
  }

  function getDistanceToVehicleAhead(vehicle, cfg) {
    let minDistance = Infinity;
    for (let i = 0; i < vehicles.length; i++) {
      const other = vehicles[i];
      if (other === vehicle || other.laneClass !== vehicle.laneClass) continue;

      let gap = Infinity;
      if (cfg.speedAxis === "x") {
        if (cfg.speedSign > 0) {
          const vehicleFront = vehicle.x + vehicle.size;
          const otherRear = other.x;
          gap = otherRear - vehicleFront;
        } else {
          const vehicleFront = vehicle.x;
          const otherRear = other.x + other.size;
          gap = vehicleFront - otherRear;
        }
      } else if (cfg.speedSign > 0) {
        const vehicleFront = vehicle.y + vehicle.size;
        const otherRear = other.y;
        gap = otherRear - vehicleFront;
      } else {
        const vehicleFront = vehicle.y;
        const otherRear = other.y + other.size;
        gap = vehicleFront - otherRear;
      }

      if (gap >= 0 && gap < minDistance) {
        minDistance = gap;
      }
    }
    return minDistance;
  }

  function frontPosition(vehicle, cfg) {
    if (cfg.speedAxis === "x") {
      return cfg.speedSign > 0 ? vehicle.x + vehicle.size : vehicle.x;
    }
    return cfg.speedSign > 0 ? vehicle.y + vehicle.size : vehicle.y;
  }

  function updateVehicle(vehicle, deltaSeconds, width, height) {
    const cfg = laneConfig(vehicle.laneClass, width, height, vehicle.size);
    const canMove = isLaneGreen(vehicle.laneClass);

    let maxAdvance = vehicle.speed * deltaSeconds;
    const SAFE_DIST = vehicle.size + 14;

    const distToAhead = getDistanceToVehicleAhead(vehicle, cfg);
    if (distToAhead < SAFE_DIST) {
      maxAdvance = 0;
    } else {
      maxAdvance = Math.min(maxAdvance, distToAhead - SAFE_DIST);
    }

    if (!vehicle.crossedStopLine && !canMove) {
      const distToStopLine = (cfg.stopLine - frontPosition(vehicle, cfg)) * cfg.speedSign;

      if (distToStopLine >= 0) {
        maxAdvance = Math.min(maxAdvance, distToStopLine);
      }
    }

    const advance = maxAdvance * cfg.speedSign;

    if (cfg.speedAxis === "x") {
      vehicle.x += advance;
      const front = frontPosition(vehicle, cfg);
      if ((cfg.speedSign > 0 && front >= cfg.crossLine) || (cfg.speedSign < 0 && front <= cfg.crossLine)) {
        vehicle.crossedStopLine = true;
        if (!vehicle.flowCounted) {
          flowCounts[routeFromLane(vehicle.laneClass)] += 1;
          vehicle.flowCounted = true;
        }
      }
      if ((cfg.speedSign > 0 && vehicle.x > cfg.resetAt) || (cfg.speedSign < 0 && vehicle.x < cfg.resetAt)) {
        resetVehiclePosition(vehicle, width, height);
      }
    } else {
      vehicle.y += advance;
      const front = frontPosition(vehicle, cfg);
      if ((cfg.speedSign > 0 && front >= cfg.crossLine) || (cfg.speedSign < 0 && front <= cfg.crossLine)) {
        vehicle.crossedStopLine = true;
        if (!vehicle.flowCounted) {
          flowCounts[routeFromLane(vehicle.laneClass)] += 1;
          vehicle.flowCounted = true;
        }
      }
      if ((cfg.speedSign > 0 && vehicle.y > cfg.resetAt) || (cfg.speedSign < 0 && vehicle.y < cfg.resetAt)) {
        resetVehiclePosition(vehicle, width, height);
      }
    }

    vehicle.node.style.left = `${vehicle.x}px`;
    vehicle.node.style.top = `${vehicle.y}px`;
  }

  const laneCounts = {
    "lane-west-east": 0,
    "lane-east-west": 0,
    "lane-north-south": 0,
    "lane-south-north": 0,
  };

  for (let i = 0; i < vehicleCount; i += 1) {
    const sprite = sprites[Math.floor(Math.random() * sprites.length)];
    const lane = lanes[i % lanes.length];

    const vehicle = document.createElement("img");
    vehicle.src = sprite.image;
    vehicle.alt = sprite.type;
    vehicle.className = `vehicle ${lane.cls}`;
    
    // Aesthetic improvements
    vehicle.style.position = "absolute";
    vehicle.style.filter = "drop-shadow(2px 4px 6px rgba(0,0,0,0.4))";
    vehicle.style.zIndex = "10";
    
    const size = 30; // Slightly larger for better visibility
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    const cfg = laneConfig(lane.cls, width, height, size);
    
    // Arrange vehicles properly behind the stopline queue instead of a random overlap
    const laneCount = laneCounts[lane.cls]++;
    const SAFE_SPACING = size + 15;
    
    let initialPos;
    if (cfg.speedSign > 0) {
      initialPos = cfg.stopLine - SAFE_SPACING * 0.2 - laneCount * SAFE_SPACING;
    } else {
      initialPos = cfg.stopLine + SAFE_SPACING * 0.2 + laneCount * SAFE_SPACING;
    }

    const model = {
      node: vehicle,
      laneClass: lane.cls,
      speed: randomSpeedPxPerSecond(lane),
      size,
      x: cfg.speedAxis === "x" ? initialPos : cfg.x,
      y: cfg.speedAxis === "y" ? initialPos : cfg.y,
      crossedStopLine: false,
      flowCounted: false,
    };

    vehicle.style.width = `${size}px`;
    vehicle.style.left = `${model.x}px`;
    vehicle.style.top = `${model.y}px`;

    layer.appendChild(vehicle);
    vehicles.push(model);
  }

  let lastTick = performance.now();

  function animate(now) {
    const deltaSeconds = Math.min((now - lastTick) / 1000, 0.06);
    lastTick = now;

    const width = layer.clientWidth;
    const height = layer.clientHeight;
    for (const vehicle of vehicles) {
      updateVehicle(vehicle, deltaSeconds, width, height);
    }

    latestWaiting = computeWaitingCounts(width, height);

    window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
}

renderTrafficSnapshot();

window.setInterval(() => {
  renderTrafficSnapshot();
}, 1000);

if (signals.north && signals.east && signals.south && signals.west) {
  latestWaiting = {
    north: Number(snapshotData?.counts?.North || 0),
    east: Number(snapshotData?.counts?.East || 0),
    south: Number(snapshotData?.counts?.South || 0),
    west: Number(snapshotData?.counts?.West || 0),
  };
}

controllerState.activeDirection = chooseNextDirection(latestWaiting);
controllerState.countdown = computeGreenTime(controllerState.activeDirection, latestWaiting);
applySignalStates();
updateSignalTimers();

window.setInterval(() => {
  if (!hasVehicleSimulation) {
    simulateWaitingQueues();
    updateCountsFromController();
  }

  tickController();
}, 1000);
