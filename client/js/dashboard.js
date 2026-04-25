/**
 * Dashboard JavaScript
 * Production-ready realtime dashboard logic with efficient updates.
 */

const API_BASE = window.location.origin && window.location.origin !== 'null'
  ? window.location.origin
  : 'http://localhost:5000';

const API = {
  latest: `${API_BASE}/api/data/latest`,
  history: `${API_BASE}/api/data/history?limit=50`,
  stats: `${API_BASE}/api/data/stats?range=24h`,
  alerts: `${API_BASE}/api/data/alerts?limit=10`,
};

const POLL_MS = 2000;
const AUX_REFRESH_MS = 15000;
const MAP_MOVE_EPSILON = 0.00005;

const state = {
  dashboardData: [],
  chartInstances: {},
  map: null,
  marker: null,
  pollTimer: null,
  timeTimer: null,
  inFlight: false,
  lastLatestId: null,
  lastFall: false,
  lastUpdateTime: null,
  lastCoords: null,
  lastAlertsSignature: '',
  domReady: false,
  hasRenderedOnce: false,
};

const dom = {};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  animation: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    filler: {
      propagate: true,
    },
  },
  scales: {
    y: {
      beginAtZero: false,
    },
  },
};

function q(id) {
  return document.getElementById(id);
}

function scrollWithOffset(target) {
  if (!target) return;
  const nav = document.getElementById('topNav');
  const navHeight = nav ? nav.getBoundingClientRect().height : 0;
  const offset = 16;
  const top = window.scrollY + target.getBoundingClientRect().top - navHeight - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

function bindDom() {
  dom.loadingIndicator = q('loadingIndicator');
  dom.dashboardContent = q('dashboardContent');
  dom.currentUser = q('currentUser');
  dom.lastUpdateTime = q('lastUpdateTime');

  dom.temperatureValue = q('temperatureValue');
  dom.tempStatus = q('tempStatus');
  dom.tempBar = q('tempBar');

  dom.bpmValue = q('bpmValue');
  dom.bpmStatus = q('bpmStatus');
  dom.bpmBar = q('bpmBar');

  dom.spo2Value = q('spo2Value');
  dom.spo2Status = q('spo2Status');
  dom.spo2Bar = q('spo2Bar');

  dom.fallStatus = q('fallStatus');
  dom.fallAlert = q('fallAlert');

  dom.latValue = q('latValue');
  dom.lonValue = q('lonValue');
  dom.map = q('map');

  dom.avgTemp = q('avgTemp');
  dom.avgBpm = q('avgBpm');
  dom.avgSpo2 = q('avgSpo2');
  dom.fallCount = q('fallCount');

  dom.alertsList = q('alertsList');

  state.domReady = true;
}

function setText(element, value) {
  if (!element) return;
  const next = String(value);
  if (element.textContent !== next) {
    element.textContent = next;
  }
}

async function safeFetchJson(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
    cache: 'no-store',
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  return { response, data };
}

function showDashboard() {
  dom.loadingIndicator.style.display = 'none';
  // Preserve CSS grid spacing between dashboard sections.
  dom.dashboardContent.style.display = 'grid';
  state.hasRenderedOnce = true;
}

function showLoading() {
  dom.loadingIndicator.style.display = 'flex';
  dom.dashboardContent.style.display = 'none';
}

function showNoDataState(message = 'Waiting for sensor data...') {
  showDashboard();

  setText(dom.temperatureValue, '--');
  setText(dom.bpmValue, '--');
  setText(dom.spo2Value, '--');
  setText(dom.fallStatus, 'NO DATA');
  dom.fallStatus.className = 'fall-status-normal';
  dom.fallAlert.style.display = 'none';

  setText(dom.latValue, '--');
  setText(dom.lonValue, '--');
  setText(dom.lastUpdateTime, `Last update: ${message}`);
}

function checkUserLogin() {
  const userInfo = sessionStorage.getItem('user');
  if (!userInfo) {
    window.location.href = 'index.html';
    return false;
  }

  try {
    const user = JSON.parse(userInfo);
    const displayName = user.username || user.email || 'User';
    setText(dom.currentUser, `Welcome, ${displayName}`);
  } catch (error) {
    setText(dom.currentUser, 'Welcome, User');
  }

  return true;
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
  }
}
window.logout = logout;

function updateProgressBar(element, value, min, max) {
  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const nextWidth = `${percentage}%`;
  if (element.style.width !== nextWidth) {
    element.style.width = nextWidth;
  }
}

function updateTempStatus(temp) {
  let status = 'Normal';
  let classes = '';

  if (temp < 36.1) {
    status = 'Low';
    classes = 'low-temp';
  } else if (temp > 37.5) {
    status = 'High Fever';
    classes = 'high-temp';
  }

  setText(dom.tempStatus, status);
  dom.tempStatus.className = `status-pill ${classes}`.trim();
}

function updateBpmStatus(bpm) {
  let status = 'Normal';
  let classes = '';

  if (bpm < 60) {
    status = 'Low';
    classes = 'low-bpm';
  } else if (bpm > 100) {
    status = 'High';
    classes = 'high-bpm';
  }

  setText(dom.bpmStatus, status);
  dom.bpmStatus.className = `status-pill ${classes}`.trim();
}

function updateSpo2Status(spo2) {
  let status = 'Good';
  let classes = '';

  if (spo2 < 95) {
    status = 'Low';
    classes = 'low-spo2';
  }

  setText(dom.spo2Status, status);
  dom.spo2Status.className = `status-pill ${classes}`.trim();
}

function maybeNotifyFallTransition(currentFall) {
  if (currentFall && !state.lastFall) {
    playAlertSound();
    showNotification('Fall detected - immediate attention needed', 'urgent');
  }
  state.lastFall = currentFall;
}

function updateFallStatus(fallDetected) {
  setText(dom.fallStatus, fallDetected ? 'FALL DETECTED' : 'NORMAL');
  dom.fallStatus.className = fallDetected ? 'fall-status-detected' : 'fall-status-normal';
  dom.fallAlert.style.display = fallDetected ? 'block' : 'none';
  maybeNotifyFallTransition(fallDetected);
}

function updateLiveDataCards(data) {
  const temperature = Number(data.temperature) || 0;
  const bpm = Number(data.bpm) || 0;
  const spo2 = Number(data.spo2) || 0;

  setText(dom.temperatureValue, temperature.toFixed(1));
  updateTempStatus(temperature);
  updateProgressBar(dom.tempBar, temperature, 35, 40);

  setText(dom.bpmValue, bpm);
  updateBpmStatus(bpm);
  updateProgressBar(dom.bpmBar, bpm, 60, 100);

  setText(dom.spo2Value, spo2);
  updateSpo2Status(spo2);
  updateProgressBar(dom.spo2Bar, spo2, 95, 100);

  updateFallStatus(Boolean(data.fall));

  // Prefer createdAt for reliable freshness when sensor timestamp is fixed.
  state.lastUpdateTime = new Date(data.createdAt || data.timestamp || Date.now());
  updateTimeDisplay();
}

function initializeMap() {
  if (!dom.map || state.map) return;
  if (typeof L === 'undefined') {
    console.warn('Leaflet library unavailable; skipping map initialization.');
    return;
  }

  state.map = L.map(dom.map, { preferCanvas: true }).setView([28.6139, 77.2090], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(state.map);

  state.marker = L.marker([28.6139, 77.2090]).addTo(state.map);
}

function coordsChanged(lat, lon) {
  if (!state.lastCoords) return true;
  const dLat = Math.abs(lat - state.lastCoords.lat);
  const dLon = Math.abs(lon - state.lastCoords.lon);
  return dLat > MAP_MOVE_EPSILON || dLon > MAP_MOVE_EPSILON;
}

function updateLocation(data) {
  const lat = Number(data.lat) || 0;
  const lon = Number(data.lon) || 0;

  setText(dom.latValue, lat.toFixed(6));
  setText(dom.lonValue, lon.toFixed(6));

  if (!state.map || !state.marker) return;

  if (coordsChanged(lat, lon)) {
    state.marker.setLatLng([lat, lon]);
    state.map.panTo([lat, lon], { animate: false });
    state.lastCoords = { lat, lon };
  }
}

function getChartData() {
  const labels = state.dashboardData.map((d) => new Date(d.createdAt || d.timestamp).toLocaleTimeString());
  const tempValues = state.dashboardData.map((d) => Number(d.temperature) || 0);
  const bpmValues = state.dashboardData.map((d) => Number(d.bpm) || 0);
  const spo2Values = state.dashboardData.map((d) => Number(d.spo2) || 0);

  return { labels, tempValues, bpmValues, spo2Values };
}

function upsertChart(canvasId, chartData, options = chartOptions) {
  if (typeof Chart === 'undefined') {
    return;
  }

  const existing = state.chartInstances[canvasId];
  const canvas = q(canvasId);
  if (!canvas) return;

  if (existing) {
    existing.data.labels = chartData.labels;
    existing.data.datasets.forEach((dataset, idx) => {
      dataset.data = chartData.datasets[idx].data;
    });
    existing.update('none');
    return;
  }

  const ctx = canvas.getContext('2d');
  state.chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: chartData,
    options,
  });
}

function updateCharts() {
  if (!state.dashboardData.length) return;

  const { labels, tempValues, bpmValues, spo2Values } = getChartData();

  upsertChart('temperatureChart', {
    labels,
    datasets: [{
      label: 'Temperature (°C)',
      data: tempValues,
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
    }],
  });

  upsertChart('bpmChart', {
    labels,
    datasets: [{
      label: 'Heart Rate (BPM)',
      data: bpmValues,
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
    }],
  });

  upsertChart('spo2Chart', {
    labels,
    datasets: [{
      label: 'Oxygen Saturation (%)',
      data: spo2Values,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      fill: true,
      tension: 0.35,
    }],
  });

  upsertChart(
    'combinedChart',
    {
      labels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: tempValues,
          borderColor: '#f59e0b',
          yAxisID: 'y',
          tension: 0.35,
        },
        {
          label: 'Heart Rate (BPM)',
          data: bpmValues,
          borderColor: '#ef4444',
          yAxisID: 'y1',
          tension: 0.35,
        },
        {
          label: 'SpO2 (%)',
          data: spo2Values,
          borderColor: '#10b981',
          yAxisID: 'y2',
          tension: 0.35,
        },
      ],
    },
    {
      ...chartOptions,
      scales: {
        y: {
          type: 'linear',
          position: 'left',
          title: { display: true, text: 'Temperature (°C)' },
        },
        y1: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'BPM' },
        },
        y2: {
          type: 'linear',
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'SpO2 (%)' },
          min: 80,
          max: 100,
        },
      },
    }
  );
}

function updateStatistics(stats) {
  if (!stats) return;
  setText(dom.avgTemp, `${Number(stats.avgTemperature || 0).toFixed(1)}°C`);
  setText(dom.avgBpm, `${Math.round(Number(stats.avgBpm || 0))} BPM`);
  setText(dom.avgSpo2, `${Math.round(Number(stats.avgSpo2 || 0))}%`);
  setText(dom.fallCount, Number(stats.fallCount || 0));
}

function buildAlertsSignature(alerts) {
  return alerts.map((a) => `${a._id || ''}:${a.timestamp || ''}:${a.fall ? 1 : 0}`).join('|');
}

function renderAlerts(alerts) {
  const signature = buildAlertsSignature(alerts);
  if (signature === state.lastAlertsSignature) {
    return;
  }
  state.lastAlertsSignature = signature;

  dom.alertsList.innerHTML = '';

  if (!alerts.length) {
    dom.alertsList.innerHTML = '<p class="no-data">No fall alerts in recent history</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  alerts.forEach((alert) => {
    const alertItem = document.createElement('div');
    alertItem.className = 'alert-item';

    const ts = new Date(alert.createdAt || alert.timestamp || Date.now()).toLocaleString();
    const lat = Number(alert.lat || 0).toFixed(4);
    const lon = Number(alert.lon || 0).toFixed(4);

    alertItem.innerHTML = [
      '<strong>⚠️ Fall Detected</strong>',
      `<p class="alert-time">${ts}</p>`,
      `<small>Location: ${lat}, ${lon}</small>`,
    ].join('');

    fragment.appendChild(alertItem);
  });

  dom.alertsList.appendChild(fragment);
}

function changeTimeRange(range) {
  // Kept for UI compatibility; backend currently returns latest fixed limit history.
  document.querySelectorAll('.range-btn').forEach((btn, index) => {
    btn.classList.toggle('active', index + 1 === range);
  });
}
window.changeTimeRange = changeTimeRange;

function updateTimeDisplay() {
  const ts = state.lastUpdateTime ? state.lastUpdateTime.toLocaleString() : 'Waiting for data...';
  setText(dom.lastUpdateTime, `Last update: ${ts}`);
}

function playAlertSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Unable to play alert sound:', error);
  }
}

function showNotification(message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('ElderCare Alert', {
      body: message,
      tag: 'eldercare-alert',
    });
  }
}

async function refreshAuxiliaryData() {
  const [statsResult, alertsResult] = await Promise.all([
    safeFetchJson(API.stats),
    safeFetchJson(API.alerts),
  ]);

  if (statsResult.response.ok && statsResult.data && statsResult.data.success) {
    updateStatistics(statsResult.data.stats);
  }

  if (alertsResult.response.ok && alertsResult.data && alertsResult.data.success) {
    renderAlerts(alertsResult.data.data || []);
  }
}

async function loadDashboardData() {
  if (state.inFlight) return;
  state.inFlight = true;

  try {
    const latestResult = await safeFetchJson(API.latest);

    // Graceful empty state: keep UI visible even when backend has no records yet.
    if (latestResult.response.status === 404) {
      showNoDataState('No records yet');
      return;
    }

    if (!latestResult.response.ok || !latestResult.data || !latestResult.data.success) {
      if (!state.hasRenderedOnce) {
        showNoDataState('Unable to load latest data');
      }
      return;
    }

    const latest = latestResult.data.data;
    if (!latest) {
      showNoDataState('Waiting for incoming sensor data');
      return;
    }

    updateLiveDataCards(latest);
    updateLocation(latest);
    showDashboard();

    const latestId = String(latest._id || latest.createdAt || latest.timestamp || '');
    const shouldRefreshHistory = state.lastLatestId !== latestId;

    if (shouldRefreshHistory) {
      state.lastLatestId = latestId;

      const historyResult = await safeFetchJson(API.history);
      if (historyResult.response.ok && historyResult.data && historyResult.data.success) {
        state.dashboardData = (historyResult.data.data || []).slice().reverse();
        updateCharts();
      }

      await refreshAuxiliaryData();
    }
  } catch (error) {
    console.error('Dashboard refresh error:', error);
    if (!state.hasRenderedOnce) {
      showNoDataState('Connection issue - retrying');
    }
  } finally {
    state.inFlight = false;
  }
}

function startPolling() {
  state.pollTimer = setInterval(loadDashboardData, POLL_MS);
  state.timeTimer = setInterval(updateTimeDisplay, 30000);

  // Slow-changing sections refresh on a larger interval.
  setInterval(refreshAuxiliaryData, AUX_REFRESH_MS);
}

function setupNavAndReveal() {
  const nav = document.getElementById('topNav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));

  const updateNav = () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 20);
  };

  const closeMenu = () => {
    if (!nav || !navToggle) return;
    nav.classList.remove('menu-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };

  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  navToggle?.addEventListener('click', () => {
    if (!nav) return;
    const open = nav.classList.toggle('menu-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      const target = targetId ? document.querySelector(targetId) : null;
      if (target) {
        event.preventDefault();
        scrollWithOffset(target);
        history.replaceState(null, '', targetId);
      }
      if (window.innerWidth <= 780) {
        closeMenu();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 780) {
      closeMenu();
    }
  });

  const revealNodes = Array.from(document.querySelectorAll('.reveal'));
  if (!('IntersectionObserver' in window)) {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: '0px 0px -50px 0px' }
  );

  revealNodes.forEach((node) => observer.observe(node));
}

document.addEventListener('DOMContentLoaded', async () => {
  setupNavAndReveal();
  bindDom();

  if (!checkUserLogin()) return;

  initializeMap();

  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  await loadDashboardData();
  startPolling();
});
