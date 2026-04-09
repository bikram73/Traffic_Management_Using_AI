// ─── Bootstrap data ───────────────────────────────────────────────────────────
const roadData       = window.__ROAD_DATA__       || {};
const snapshotData   = window.__TRAFFIC_SNAPSHOT__ || {};
const layer          = document.getElementById("vehicleLayer");
const hasVehicleSim  = Boolean(layer && Array.isArray(roadData.vehicleSprites));

// ─── Live flow counts (seeded from server snapshot) ──────────────────────────
const flowCounts = {
  North: Number(snapshotData?.counts?.North || 0),
  East:  Number(snapshotData?.counts?.East  || 0),
  South: Number(snapshotData?.counts?.South || 0),
  West:  Number(snapshotData?.counts?.West  || 0),
};

// ─── Signal DOM refs ──────────────────────────────────────────────────────────
const signalNodes = {
  north: document.querySelector('.signal[data-dir="north"]'),
  east:  document.querySelector('.signal[data-dir="east"]'),
  south: document.querySelector('.signal[data-dir="south"]'),
  west:  document.querySelector('.signal[data-dir="west"]'),
};
const timerNodes = {
  north: document.getElementById("timer-north"),
  east:  document.getElementById("timer-east"),
  south: document.getElementById("timer-south"),
  west:  document.getElementById("timer-west"),
};

const DIR_ORDER = ["north", "east", "south", "west"];

// ─── Controller config ────────────────────────────────────────────────────────
const ctrlCfg = {
  greenMin: Number(roadData?.controller?.greenMin || 6),
  greenMax: Number(roadData?.controller?.greenMax || 18),
  yellow:   Number(roadData?.controller?.yellow   || 3),
};
const ctrl = {
  active:    "north",
  last:      "west",
  mode:      "green",   // "green" | "yellow"
  countdown: Number(roadData?.controller?.greenMin || 6),
};

let latestWaiting = { north: 0, east: 0, south: 0, west: 0 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dirToRoute(d) {
  return d === "north" ? "North" : d === "east" ? "East" : d === "south" ? "South" : "West";
}
function laneToDir(cls) {
  return cls === "lane-west-east" ? "west"
       : cls === "lane-east-west" ? "east"
       : cls === "lane-north-south" ? "north"
       : "south";
}
function laneToRoute(cls) {
  return cls === "lane-west-east" ? "West"
       : cls === "lane-east-west" ? "East"
       : cls === "lane-north-south" ? "North"
       : "South";
}
function isGreen(cls) {
  return ctrl.mode === "green" && laneToDir(cls) === ctrl.active;
}
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ─── Signal controller ────────────────────────────────────────────────────────
function setSignal(dir, state) {
  const n = signalNodes[dir];
  if (!n) return;
  n.classList.remove("state-red", "state-yellow", "state-green");
  n.classList.add(`state-${state}`);
}
function applySignals() {
  DIR_ORDER.forEach(d => setSignal(d, "red"));
  setSignal(ctrl.active, ctrl.mode === "green" ? "green" : "yellow");
}
function updateTimers() {
  DIR_ORDER.forEach(d => {
    const n = timerNodes[d];
    if (!n) return;
    if (d === ctrl.active) { n.textContent = ctrl.countdown; n.style.opacity = "1"; }
    else                   { n.textContent = latestWaiting[d]; n.style.opacity = "0.55"; }
  });
}
function chooseNext(waiting) {
  let max = -1, candidates = [];
  for (const d of DIR_ORDER) {
    const q = waiting[d] || 0;
    if (q > max)      { max = q; candidates = [d]; }
    else if (q === max) candidates.push(d);
  }
  if (max <= 0) {
    return DIR_ORDER[(DIR_ORDER.indexOf(ctrl.last) + 1) % DIR_ORDER.length];
  }
  if (candidates.length === 1) return candidates[0];
  const si = DIR_ORDER.indexOf(ctrl.last);
  for (let i = 1; i <= DIR_ORDER.length; i++) {
    const c = DIR_ORDER[(si + i) % DIR_ORDER.length];
    if (candidates.includes(c)) return c;
  }
  return candidates[0];
}
function greenTime(dir, waiting) {
  return Math.max(ctrlCfg.greenMin, Math.min(ctrlCfg.greenMax, ctrlCfg.greenMin + (waiting[dir] || 0)));
}
function tickController() {
  ctrl.countdown--;
  if (ctrl.countdown >= 0) { updateTimers(); return; }
  if (ctrl.mode === "green") {
    ctrl.mode = "yellow";
    ctrl.countdown = ctrlCfg.yellow;
  } else {
    ctrl.last   = ctrl.active;
    ctrl.active = chooseNext(latestWaiting);
    ctrl.mode   = "green";
    ctrl.countdown = greenTime(ctrl.active, latestWaiting);
  }
  applySignals();
  updateTimers();
}

// ─── Stats panel ──────────────────────────────────────────────────────────────
function renderSnapshot() {
  const cards = document.querySelectorAll(".stat-card[data-route]");
  const total = Object.values(flowCounts).reduce((s, v) => s + v, 0);
  let busiestRoute = "North", busiestCount = -1;

  cards.forEach(card => {
    const route = card.getAttribute("data-route");
    const count = flowCounts[route] || 0;
    const pct   = total > 0 ? (count / total * 100).toFixed(0) : 0;
    const cn = card.querySelector(".route-count");
    const mf = card.querySelector(".meter-fill");
    if (cn) cn.textContent = count;
    if (mf) mf.style.width = `${pct}%`;
    card.classList.remove("active");
    if (count > busiestCount) { busiestCount = count; busiestRoute = route; }
  });
  cards.forEach(card => {
    if (card.getAttribute("data-route") === busiestRoute) card.classList.add("active");
  });

  const set = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  set("totalVehicles",       total);
  set("busiestRoute",        busiestRoute);
  set("busiestCount",        `${busiestCount} vehicles`);
  set("insightBusiestRoute", busiestRoute);
  set("insightBusiestCount", busiestCount);

  try {
    localStorage.setItem("traffic-live-counts", JSON.stringify(
      { counts: flowCounts, total, busiestRoute, busiestCount, updatedAt: Date.now() }
    ));
  } catch (_) {}
}

// ─── Vehicle simulation ───────────────────────────────────────────────────────
if (hasVehicleSim) {
  const sprites = roadData.vehicleSprites;

  // Constants
  const V_SIZE      = 26;   // vehicle square size in px
  const MIN_GAP     = 14;   // minimum bumper-to-bumper gap
  const SAFE_GAP    = V_SIZE + MIN_GAP;
  const PER_LANE    = 6;    // vehicles per lane
  const SPEED_MIN   = 45;
  const SPEED_MAX   = 60;

  // Lane definitions — each lane is one direction of travel on one road arm.
  // fixedCoord: the perpendicular coordinate (stays constant while moving).
  // Offset from centre keeps opposing lanes from overlapping.
  function laneGeo(cls, W, H) {
    const ho = 17, vo = 17;   // lane offset from panel centre
    switch (cls) {
      case "lane-west-east":   return { axis:"x", sign: 1, fixed: H*0.5 - ho, stop: W*0.44, cross: W*0.5, entry: -V_SIZE,    exit: W + V_SIZE   };
      case "lane-east-west":   return { axis:"x", sign:-1, fixed: H*0.5 + ho, stop: W*0.56, cross: W*0.5, entry: W + V_SIZE, exit: -V_SIZE      };
      case "lane-north-south": return { axis:"y", sign: 1, fixed: W*0.5 + vo, stop: H*0.44, cross: H*0.5, entry: -V_SIZE,    exit: H + V_SIZE   };
      default:/* south-north */return { axis:"y", sign:-1, fixed: W*0.5 - vo, stop: H*0.56, cross: H*0.5, entry: H + V_SIZE, exit: -V_SIZE      };
    }
  }

  // Front edge of vehicle in direction of travel
  function front(v, g) {
    const pos = g.axis === "x" ? v.x : v.y;
    return g.sign > 0 ? pos + V_SIZE : pos;
  }
  // Rear edge of vehicle
  function rear(v, g) {
    const pos = g.axis === "x" ? v.x : v.y;
    return g.sign > 0 ? pos : pos + V_SIZE;
  }

  // Gap from this vehicle's front to the nearest vehicle-ahead's rear (same lane)
  function gapAhead(v, g, laneVehicles) {
    let best = Infinity;
    for (const o of laneVehicles) {
      if (o === v) continue;
      const gap = (rear(o, g) - front(v, g)) * g.sign;
      if (gap > -2 && gap < best) best = gap;
    }
    return best;
  }

  // Group vehicles by lane for O(lane-size) gap checks
  const laneGroups = {
    "lane-west-east":   [],
    "lane-east-west":   [],
    "lane-north-south": [],
    "lane-south-north": [],
  };
  const allVehicles = [];

  function spawnVehicle(v, g, laneVehicles) {
    // Place behind the rearmost vehicle in the lane, or at entry if lane is empty
    let rearmostRear = g.entry;
    for (const o of laneVehicles) {
      if (o === v) continue;
      const r = rear(o, g);
      if (g.sign > 0 ? r < rearmostRear : r > rearmostRear) rearmostRear = r;
    }
    const spawnPos = g.sign > 0
      ? Math.min(rearmostRear - SAFE_GAP, g.entry)
      : Math.max(rearmostRear + SAFE_GAP, g.entry);

    if (g.axis === "x") { v.x = spawnPos; v.y = g.fixed; }
    else                { v.y = spawnPos; v.x = g.fixed; }
    v.crossed    = false;
    v.counted    = false;
  }

  function moveVehicle(v, dt, W, H) {
    const g  = laneGeo(v.cls, W, H);
    const lv = laneGroups[v.cls];
    let advance = v.speed * dt;

    // Rule 1 — safe following distance
    const gap = gapAhead(v, g, lv);
    if (gap <= SAFE_GAP) {
      advance = 0;
    } else {
      advance = Math.min(advance, gap - SAFE_GAP);
    }

    // Rule 2 — stop at stop-line when signal is red/yellow
    if (!v.crossed && !isGreen(v.cls)) {
      const distToStop = (g.stop - front(v, g)) * g.sign;
      if (distToStop >= 0) {
        advance = Math.min(advance, distToStop);
      } else {
        // Already past stop line on red — freeze (shouldn't normally happen)
        advance = 0;
      }
    }

    // Apply
    if (g.axis === "x") v.x += advance * g.sign;
    else                v.y += advance * g.sign;

    // Cross line — count throughput
    const f = front(v, g);
    if (!v.crossed && (g.sign > 0 ? f >= g.cross : f <= g.cross)) {
      v.crossed = true;
      if (!v.counted) {
        flowCounts[laneToRoute(v.cls)] += 1;
        v.counted = true;
      }
    }

    // Exit — respawn at back of queue
    const exited = g.sign > 0
      ? (g.axis === "x" ? v.x > g.exit : v.y > g.exit)
      : (g.axis === "x" ? v.x < g.exit : v.y < g.exit);
    if (exited) spawnVehicle(v, g, lv);

    v.node.style.left = `${v.x}px`;
    v.node.style.top  = `${v.y}px`;
  }

  function countWaiting(W, H) {
    const w = { north:0, east:0, south:0, west:0 };
    for (const v of allVehicles) {
      if (v.crossed) continue;
      const g = laneGeo(v.cls, W, H);
      const distToStop = (g.stop - front(v, g)) * g.sign;
      if (distToStop >= -2) w[laneToDir(v.cls)]++;
    }
    return w;
  }

  // Build all vehicle DOM nodes and initial positions after layout is ready
  function buildVehicles() {
    const W = layer.clientWidth  || 600;
    const H = layer.clientHeight || 400;

    const laneClasses = Object.keys(laneGroups);

    for (const cls of laneClasses) {
      const g = laneGeo(cls, W, H);

      for (let i = 0; i < PER_LANE; i++) {
        const sprite = sprites[Math.floor(Math.random() * sprites.length)];

        const img = document.createElement("img");
        img.src       = sprite.image;
        img.alt       = sprite.type;
        img.className = `vehicle ${cls}`;
        img.style.cssText = `
          position:absolute;
          width:${V_SIZE}px;
          height:${V_SIZE}px;
          object-fit:contain;
          z-index:10;
          pointer-events:none;
        `;

        // Queue vehicles behind the stop line, evenly spaced, no overlaps.
        // Vehicle 0 is closest to the stop line; higher index = further back.
        const mainCoord = g.sign > 0
          ? g.stop - SAFE_GAP * 0.5 - i * SAFE_GAP
          : g.stop + SAFE_GAP * 0.5 + i * SAFE_GAP;

        const vx = g.axis === "x" ? mainCoord : g.fixed;
        const vy = g.axis === "y" ? mainCoord : g.fixed;

        const v = {
          node:    img,
          cls,
          speed:   SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
          x:       vx,
          y:       vy,
          crossed: false,
          counted: false,
        };

        img.style.left = `${vx}px`;
        img.style.top  = `${vy}px`;

        layer.appendChild(img);
        laneGroups[cls].push(v);
        allVehicles.push(v);
      }
    }
  }

  // Start animation loop
  setTimeout(() => {
    buildVehicles();

    let last = performance.now();
    function animate(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const W = layer.clientWidth  || 600;
      const H = layer.clientHeight || 400;
      for (const v of allVehicles) moveVehicle(v, dt, W, H);
      latestWaiting = countWaiting(W, H);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, 120);   // wait for CSS layout to settle
}

// ─── Periodic updates ─────────────────────────────────────────────────────────
renderSnapshot();
setInterval(renderSnapshot, 1000);

// Seed initial signal state
latestWaiting = {
  north: Number(snapshotData?.counts?.North || 0),
  east:  Number(snapshotData?.counts?.East  || 0),
  south: Number(snapshotData?.counts?.South || 0),
  west:  Number(snapshotData?.counts?.West  || 0),
};
ctrl.active    = chooseNext(latestWaiting);
ctrl.countdown = greenTime(ctrl.active, latestWaiting);
applySignals();
updateTimers();

setInterval(() => {
  if (!hasVehicleSim) {
    // No vehicle layer — simulate queue changes for stats panel
    DIR_ORDER.forEach(d => {
      latestWaiting[d] = Math.min(25, (latestWaiting[d] || 0) + randInt(0, 2));
    });
    if (ctrl.mode === "green") {
      const r = dirToRoute(ctrl.active);
      flowCounts[r] += Math.max(1, randInt(1, 3) + Math.floor((latestWaiting[ctrl.active] || 0) / 6));
      latestWaiting[ctrl.active] = Math.max(0, (latestWaiting[ctrl.active] || 0) - randInt(1, 4));
    }
  }
  tickController();
}, 1000);
