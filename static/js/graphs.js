const snapshot = window.__TRAFFIC__ || {};
const counts = snapshot.counts || {};
const comparison = snapshot.comparison || { labels: [], static: [], dynamic: [] };

const pathCtx = document.getElementById('pathChart');
const comparisonCtx = document.getElementById('comparisonChart');

if (pathCtx) {
  new Chart(pathCtx, {
    type: 'bar',
    data: {
      labels: Object.keys(counts),
      datasets: [{
        label: 'Vehicles',
        data: Object.values(counts),
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