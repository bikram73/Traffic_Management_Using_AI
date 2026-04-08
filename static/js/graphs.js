const snapshot = window.__TRAFFIC__ || {};
const initialCounts = snapshot.counts || {};
const comparison = snapshot.comparison || { labels: [], static: [], dynamic: [] };

const pathCtx = document.getElementById('pathChart');
const comparisonCtx = document.getElementById('comparisonChart');
const liveStatus = document.getElementById('liveGraphStatus');

let pathChart = null;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function computeTotals(counts) {
  const entries = Object.entries(counts || {});
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  let busiestRoute = 'North';
  let busiestCount = -1;

  entries.forEach(([route, value]) => {
    const numeric = Number(value || 0);
    if (numeric > busiestCount) {
      busiestCount = numeric;
      busiestRoute = route;
    }
  });

  return { total, busiestRoute, busiestCount };
}

function writeLiveCounts(counts) {
  const totals = computeTotals(counts);
  const payload = {
    counts,
    total: totals.total,
    busiestRoute: totals.busiestRoute,
    busiestCount: totals.busiestCount,
    updatedAt: Date.now(),
  };

  try {
    window.localStorage.setItem('traffic-live-counts', JSON.stringify(payload));
  } catch (error) {
    void error;
  }

  return payload;
}

function readLiveCounts() {
  try {
    const raw = window.localStorage.getItem('traffic-live-counts');
    if (!raw) return { counts: initialCounts, updatedAt: null };
    const parsed = JSON.parse(raw);
    return {
      counts: parsed.counts || initialCounts,
      total: parsed.total,
      busiestRoute: parsed.busiestRoute,
      busiestCount: parsed.busiestCount,
      updatedAt: parsed.updatedAt || null,
    };
  } catch (error) {
    void error;
    return { counts: initialCounts, updatedAt: null };
  }
}

function updateLiveLabel(payload) {
  if (!liveStatus) return;
  if (!payload.updatedAt) {
    liveStatus.textContent = 'Using initial snapshot data';
    return;
  }

  const time = new Date(payload.updatedAt);
  liveStatus.textContent = `Live counts updated ${time.toLocaleTimeString()} | Total ${payload.total} | Busiest ${payload.busiestRoute} (${payload.busiestCount})`;
}

function getChartData() {
  const live = readLiveCounts();
  const isStale = !live.updatedAt || Date.now() - Number(live.updatedAt) > 3500;

  if (!isStale) {
    updateLiveLabel(live);
    return live.counts;
  }

  const seedCounts = {
    North: Number(live.counts?.North || initialCounts.North || 0),
    East: Number(live.counts?.East || initialCounts.East || 0),
    South: Number(live.counts?.South || initialCounts.South || 0),
    West: Number(live.counts?.West || initialCounts.West || 0),
  };

  const routes = Object.keys(seedCounts);
  const chosenRoute = routes[randomInt(0, routes.length - 1)];
  seedCounts[chosenRoute] += randomInt(1, 3);

  const simulated = writeLiveCounts(seedCounts);
  updateLiveLabel(simulated);
  return simulated.counts;
}

if (pathCtx) {
  pathChart = new Chart(pathCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(initialCounts),
      datasets: [{
        label: 'Vehicles',
        data: Object.values(initialCounts),
        backgroundColor: ['#72d572', '#d7b42c', '#ff6f61', '#4fb8ff'],
        borderRadius: 10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#b8c2cc' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#f3f7fb' },
        },
      },
    },
  });
}

if (comparisonCtx) {
  new Chart(comparisonCtx, {
    type: 'line',
    data: {
      labels: comparison.labels,
      datasets: [
        {
          label: 'Static',
          data: comparison.static,
          borderColor: '#ff6f61',
          backgroundColor: 'rgba(255,111,97,0.18)',
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Dynamic',
          data: comparison.dynamic,
          borderColor: '#72d572',
          backgroundColor: 'rgba(114,213,114,0.14)',
          tension: 0.35,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#f3f7fb' },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#b8c2cc' },
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#f3f7fb' },
        },
      },
    },
  });
}

function refreshPathChart() {
  if (!pathChart) return;
  const counts = getChartData();
  const labels = Object.keys(counts);
  const values = Object.values(counts);

  pathChart.data.labels = labels;
  pathChart.data.datasets[0].data = values;
  pathChart.update('none');
}

refreshPathChart();
window.setInterval(refreshPathChart, 1000);