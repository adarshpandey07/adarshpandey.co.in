/**
 * Adarsh Command Center — Main Application
 * Connected to EC2 Brain API at 13.203.99.103:3000
 *
 * Features:
 *   - Live brain status from EC2
 *   - Real template catalog from moneymaker pipeline
 *   - Real cycle history as activity feed
 *   - Server health from EC2 OS metrics
 *   - Dynamic kanban from brain state
 *   - Auto-refresh every 30s on active page
 */

// ─── Configuration ─────────────────────────────────────────────────

const API_BASE = 'http://13.203.99.103:3000';
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
const API_TIMEOUT_MS = 10000;

// Connection state
let isConnected = false;
let lastApiResponse = null;
let connectionRetries = 0;
const MAX_RETRIES = 3;

// ─── Static Data (fallbacks when API is offline) ───────────────────

const SUPABASE_PROJECTS = [
  { name: 'Financial Analysis', icon: '💹', type: 'Supabase' },
  { name: 'Franchise Hub', icon: '🏪', type: 'Supabase' },
  { name: 'Gilehri R&D', icon: '🔬', type: 'Supabase' },
  { name: 'HRMS', icon: '👥', type: 'Supabase' },
  { name: 'Marketing 360', icon: '📣', type: 'Supabase' },
  { name: 'Raja Portal', icon: '👑', type: 'Supabase' },
  { name: 'Task Flow Portal', icon: '📋', type: 'Supabase' },
  { name: 'All-in-One Sales', icon: '💼', type: 'Supabase' },
  { name: 'Customer Support', icon: '🎧', type: 'Supabase' },
  { name: 'Darshan AI', icon: '🤖', type: 'Supabase' },
  { name: 'Finance 360', icon: '💰', type: 'Supabase' },
  { name: 'Katyayani EXIM', icon: '🚢', type: 'Supabase' },
  { name: 'Katyayani AI', icon: '🧠', type: 'Supabase' },
  { name: 'Komal Extension', icon: '🧩', type: 'Supabase' },
  { name: 'Munmun', icon: '💎', type: 'Supabase' },
  { name: 'Procurement Hub', icon: '🛒', type: 'Supabase' },
  { name: 'Shaadi Matcher', icon: '💍', type: 'Supabase' },
  { name: 'Stock', icon: '📊', type: 'Supabase' },
  { name: 'Vardhman Clinic', icon: '🏥', type: 'Supabase' },
];

// ─── API Client ────────────────────────────────────────────────────

async function apiFetch(endpoint) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    isConnected = true;
    connectionRetries = 0;
    lastApiResponse = Date.now();
    updateConnectionStatus(true);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    isConnected = false;
    connectionRetries++;
    updateConnectionStatus(false);
    console.warn(`[API] ${endpoint} failed:`, err.message);
    return null;
  }
}

function updateConnectionStatus(connected) {
  const dot = document.querySelector('.sidebar-footer .status-dot');
  const text = document.querySelector('.sidebar-footer .server-status span:last-child');
  const indicator = document.getElementById('connectionIndicator');

  if (dot) {
    dot.className = `status-dot ${connected ? 'green' : 'red'} pulse`;
  }
  if (text) {
    text.textContent = connected ? 'EC2 Brain connected' : 'EC2 Brain offline';
  }
  if (indicator) {
    indicator.className = `connection-indicator ${connected ? 'connected' : 'disconnected'}`;
    indicator.title = connected
      ? `Connected to EC2 Brain (${API_BASE})`
      : `Disconnected from EC2 Brain — showing cached/offline data`;
  }
}

// ─── Data Loaders ──────────────────────────────────────────────────

// Cache for API data
let cachedStatus = null;
let cachedCatalog = null;
let cachedHealth = null;
let cachedCycles = null;
let cachedKanban = null;
let cachedActivity = null;
let cachedLearnings = null;

async function loadBrainStatus() {
  const data = await apiFetch('/api/status');
  if (data) cachedStatus = data;
  return cachedStatus;
}

async function loadCatalog() {
  const data = await apiFetch('/api/catalog');
  if (data) cachedCatalog = data;
  return cachedCatalog;
}

async function loadHealth() {
  const data = await apiFetch('/api/health');
  if (data) cachedHealth = data;
  return cachedHealth;
}

async function loadCycles(count = 20) {
  const data = await apiFetch(`/api/cycles?count=${count}`);
  if (data) cachedCycles = data;
  return cachedCycles;
}

async function loadKanban() {
  const data = await apiFetch('/api/kanban');
  if (data) cachedKanban = data;
  return cachedKanban;
}

async function loadActivity(count = 20) {
  const data = await apiFetch(`/api/activity?count=${count}`);
  if (data) cachedActivity = data;
  return cachedActivity;
}

async function loadLearnings() {
  const data = await apiFetch('/api/learnings');
  if (data) cachedLearnings = data;
  return cachedLearnings;
}

// ─── Navigation ─────────────────────────────────────────────────────

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  etsy: 'Etsy Digital Products',
  polymarket: 'Polymarket Trading Bot',
  health: 'Server Health',
  kanban: 'AI Kanban Board',
  projects: 'All Projects',
};

const PAGE_ORDER = ['dashboard', 'etsy', 'polymarket', 'health', 'kanban', 'projects'];

let currentPage = 'dashboard';

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;
  document.getElementById('sidebar').classList.remove('open');

  currentPage = page;

  // Load data for the page
  refreshCurrentPage();
}

// Nav click handlers
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) navigateTo(page);
  });
});

// Mobile menu toggle
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Keyboard shortcuts (1-6 for pages, r for refresh)
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

  const num = parseInt(e.key);
  if (num >= 1 && num <= 6) {
    e.preventDefault();
    navigateTo(PAGE_ORDER[num - 1]);
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    refreshCurrentPage();
    return;
  }
});

// ─── Clock ──────────────────────────────────────────────────────────

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('liveClock').textContent = `${date} ${time}`;
  document.getElementById('lastUpdated').textContent = lastApiResponse
    ? `Synced: ${new Date(lastApiResponse).toLocaleTimeString()}`
    : 'Not synced yet';
}
setInterval(updateClock, 1000);
updateClock();

// ─── Render: Dashboard ─────────────────────────────────────────────

async function renderDashboard() {
  const [status, catalog, activity] = await Promise.all([
    loadBrainStatus(),
    loadCatalog(),
    loadActivity(10),
  ]);

  // Hero stats
  const el = (id) => document.getElementById(id);

  if (status) {
    if (el('brainState')) el('brainState').textContent = status.state === 'running' ? 'RUNNING' : 'PAUSED';
    if (el('brainStateIcon')) el('brainStateIcon').textContent = status.state === 'running' ? '🟢' : '⏸';
    if (el('cycleCount')) el('cycleCount').textContent = status.cycleCount;
    if (el('brainUptime')) el('brainUptime').textContent = status.uptime || '—';
  }

  if (catalog && catalog.stats) {
    if (el('templateCount')) el('templateCount').textContent = catalog.stats.total;
    if (el('templateBuilt')) el('templateBuilt').textContent = catalog.stats.built;
    if (el('templateLive')) el('templateLive').textContent = catalog.stats.live;
    if (el('templatePlanned')) el('templatePlanned').textContent = catalog.stats.planned;
  }

  if (el('servicesOnline')) el('servicesOnline').textContent = SUPABASE_PROJECTS.length;

  // AI Tasks count
  if (status && el('aiTasksCount')) {
    el('aiTasksCount').textContent = status.state === 'running' ? '3' : '0';
  }

  // Money card progress
  if (catalog && catalog.stats) {
    const total = catalog.stats.total || 5;
    const built = catalog.stats.built || 0;
    const pct = Math.round((built / total) * 100);
    const fill = document.querySelector('.money-card.etsy .progress-fill');
    const label = document.querySelector('.money-card.etsy .progress-label');
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = `${built}/${total} templates built`;

    // Template mini stats
    const miniValues = document.querySelectorAll('.money-card.etsy .mini-value');
    if (miniValues[0]) miniValues[0].textContent = total;
    if (miniValues[1]) miniValues[1].textContent = built;
  }

  // Status list
  renderStatusList();

  // Activity feed
  renderActivityFeed(activity);
}

function renderStatusList() {
  const list = document.getElementById('statusList');
  if (!list) return;

  const ec2Status = isConnected ? 'online' : 'offline';

  const services = [
    { icon: '🧠', name: 'EC2 Brain Server', type: 'AWS EC2', status: ec2Status },
    { icon: '🌐', name: 'Brain API', type: 'Express', status: ec2Status },
    { icon: '📱', name: 'Telegram Bot', type: 'Bot', status: ec2Status },
    ...SUPABASE_PROJECTS.slice(0, 8).map(s => ({
      icon: s.icon, name: s.name, type: s.type, status: 'online',
    })),
  ];

  list.innerHTML = services.map(s => {
    const dotClass = s.status === 'online' ? 'green' : s.status === 'warning' ? 'orange' : 'red';
    return `
    <div class="status-item">
      <span class="status-dot ${dotClass}"></span>
      <span class="name">${s.icon} ${s.name}</span>
      <span class="type">${s.type}</span>
    </div>
  `;
  }).join('');
}

function renderActivityFeed(activityData) {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  if (!activityData || !activityData.activities || activityData.activities.length === 0) {
    feed.innerHTML = `
      <div class="activity-item">
        <div class="activity-icon">🔌</div>
        <div class="activity-text">${isConnected
          ? 'No cycle history yet — brain is waiting for first cycle'
          : '<strong>EC2 Brain offline</strong> — connect to see live activity'}</div>
        <div class="activity-time">now</div>
      </div>
    `;
    return;
  }

  const actionIcons = {
    'build': '🛠️',
    'list': '📋',
    'research': '🔍',
    'analytics': '📊',
    'optimize': '⚡',
    'mockups': '🎨',
    'full': '🚀',
    'idle': '😴',
    'error': '❌',
  };

  feed.innerHTML = activityData.activities.map(a => {
    const icon = actionIcons[a.action?.split(':')[0]] || (a.type === 'error' ? '❌' : '🔄');
    const timeStr = a.timestamp ? timeAgo(new Date(a.timestamp)) : 'unknown';
    const statusBadge = a.status === 'success'
      ? '<span style="color:var(--green)">success</span>'
      : a.status === 'failed'
      ? '<span style="color:var(--red)">failed</span>'
      : a.status;

    return `
      <div class="activity-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-text">
          <strong>${a.action || 'unknown'}</strong> — ${a.summary || 'no details'} [${statusBadge}]
          ${a.duration ? `<span class="activity-duration">(${a.duration})</span>` : ''}
        </div>
        <div class="activity-time">${timeStr}</div>
      </div>
    `;
  }).join('');
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── Render: Etsy Page ─────────────────────────────────────────────

async function renderEtsyPage() {
  const catalog = await loadCatalog();
  if (!catalog) return;

  const el = (id) => document.getElementById(id);
  const etsyPage = document.getElementById('page-etsy');
  if (!etsyPage) return;

  // Stat cards
  const statValues = etsyPage.querySelectorAll('.hero-stats .stat-value');
  const statSubs = etsyPage.querySelectorAll('.hero-stats .stat-sub');

  if (statValues[0]) statValues[0].textContent = catalog.stats.total;
  if (statSubs[0]) statSubs[0].textContent = `${catalog.stats.built} built, ${catalog.stats.planned} planned, ${catalog.stats.live} live`;

  if (catalog.templates.length > 0) {
    const prices = catalog.templates.map(t => parseFloat(t.price) || 0).filter(p => p > 0);
    const avgPrice = prices.length > 0 ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
    if (statValues[1]) statValues[1].textContent = `$${avgPrice.toFixed(2)}`;
    if (statSubs[1]) statSubs[1].textContent = `Net ~$${(avgPrice * 0.8).toFixed(2)} after fees`;

    const salesNeeded = avgPrice > 0 ? Math.ceil(540 / (avgPrice * 0.8)) : 0;
    if (statValues[2]) statValues[2].textContent = `~${salesNeeded}/mo`;
    if (statSubs[2]) statSubs[2].textContent = `~${(salesNeeded / 30).toFixed(1)} per day`;
  }

  // Template grid
  renderTemplateGrid(catalog.templates);

  // Revenue stats
  renderRevenueStats();
}

function renderTemplateGrid(templates) {
  const grid = document.getElementById('templateGrid');
  if (!grid) return;

  if (!templates || templates.length === 0) {
    grid.innerHTML = '<div class="empty-state">No templates yet — waiting for brain to build them</div>';
    return;
  }

  grid.innerHTML = templates.map(t => {
    const statusClass = t.status === 'live' ? 'live' : t.status === 'built' ? 'built' : 'planned';
    const tags = (t.tags || []).slice(0, 5);

    return `
    <div class="template-card">
      <h3>${t.name || t.title}</h3>
      <div class="price">$${t.price || '0.00'}</div>
      <span class="template-status ${statusClass}">${t.status}</span>
      ${t.sheetId ? `<a href="${t.copyLink}" target="_blank" class="template-link">Open Sheet</a>` : ''}
      <div class="template-tags">
        ${tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
      </div>
    </div>
  `;
  }).join('');
}

// Revenue tracking (localStorage)
const REVENUE_STORAGE_KEY = 'adarsh_cc_revenue_entries';

function getRevenueEntries() {
  try {
    const stored = localStorage.getItem(REVENUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { /* empty */ }
  return [];
}

function getRevenueStats() {
  const entries = getRevenueEntries();
  if (entries.length === 0) {
    return { total: 0, dailyAvg: 0, entryCount: 0 };
  }
  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const dates = entries.map(e => new Date(e.date));
  const earliest = new Date(Math.min(...dates));
  const latest = new Date(Math.max(...dates));
  const daySpan = Math.max(1, Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) + 1);
  return {
    total: Math.round(total * 100) / 100,
    dailyAvg: Math.round((total / daySpan) * 100) / 100,
    entryCount: entries.length,
  };
}

function renderRevenueStats() {
  const stats = getRevenueStats();
  const etsyPage = document.getElementById('page-etsy');
  if (!etsyPage) return;

  const statValues = etsyPage.querySelectorAll('.hero-stats .stat-value');
  const statSubs = etsyPage.querySelectorAll('.hero-stats .stat-sub');

  if (statValues[3]) {
    statValues[3].textContent = stats.total > 0 ? `$${stats.total.toFixed(2)}` : '$0';
  }
  if (statSubs[3]) {
    if (stats.entryCount > 0) {
      statSubs[3].textContent = `$${stats.dailyAvg.toFixed(2)}/day avg | ${stats.entryCount} sales`;
    } else {
      statSubs[3].textContent = 'Just getting started';
    }
  }
}

// ─── Render: Health Page ───────────────────────────────────────────

async function renderHealthPage() {
  const health = await loadHealth();

  const el = (id) => document.getElementById(id);

  if (health) {
    // Update EC2 stats
    if (el('ec2Cpu')) el('ec2Cpu').textContent = `${health.cpu.loadPercent}%`;
    if (el('ec2CpuCores')) el('ec2CpuCores').textContent = `${health.cpu.cores} cores`;
    if (el('ec2Memory')) el('ec2Memory').textContent = `${health.memory.usedPercent}%`;
    if (el('ec2MemDetail')) el('ec2MemDetail').textContent = `${health.memory.freeGB}GB free / ${health.memory.totalGB}GB`;
    if (el('ec2Disk')) el('ec2Disk').textContent = health.disk?.usedPercent || '—';
    if (el('ec2DiskDetail')) el('ec2DiskDetail').textContent = `${health.disk?.available || '?'} available`;
    if (el('ec2Uptime')) el('ec2Uptime').textContent = health.uptime || '—';
    if (el('ec2ProcessUptime')) el('ec2ProcessUptime').textContent = health.processUptime || '—';
    if (el('ec2Node')) el('ec2Node').textContent = health.nodeVersion || '—';
    if (el('ec2Hostname')) el('ec2Hostname').textContent = health.hostname || '—';
    if (el('ec2Platform')) el('ec2Platform').textContent = health.platform || '—';

    // Service statuses
    if (el('svcBrain')) {
      el('svcBrain').className = `status-indicator ${health.services.brain === 'ok' ? 'online' : 'warning'}`;
    }
    if (el('svcTelegram')) {
      el('svcTelegram').className = `status-indicator ${health.services.telegram === 'configured' ? 'online' : 'warning'}`;
    }

    // Update header stats
    if (el('healthOnline')) {
      const online = SUPABASE_PROJECTS.length + (isConnected ? 4 : 0); // supabase + EC2 services
      el('healthOnline').textContent = online;
    }
    if (el('healthWarnings')) el('healthWarnings').textContent = isConnected ? '0' : '1';
    if (el('healthDown')) el('healthDown').textContent = isConnected ? '0' : '1';
  }

  // Render Supabase project grid
  renderSupabaseGrid();
}

function renderSupabaseGrid() {
  const grid = document.getElementById('healthGrid');
  if (!grid) return;

  grid.innerHTML = SUPABASE_PROJECTS.map(p => `
    <div class="health-card">
      <span style="font-size:20px">${p.icon}</span>
      <span class="name">${p.name}</span>
      <span class="status-indicator online"></span>
    </div>
  `).join('');
}

function refreshHealth() {
  renderHealthPage();
}

// ─── Render: Kanban Page ───────────────────────────────────────────

async function renderKanbanPage() {
  const kanban = await loadKanban();
  const status = cachedStatus;

  if (!kanban || !kanban.tasks) {
    renderOfflineKanban();
    return;
  }

  // Map API tasks to kanban columns
  const columns = {
    backlog: [],
    'in-progress': [],
    done: [],
    automated: [],
  };

  // Add brain-driven tasks
  kanban.tasks.forEach(task => {
    if (task.status === 'todo') columns.backlog.push(task);
    else if (task.status === 'in-progress') columns['in-progress'].push(task);
    else if (task.status === 'done') columns.done.push(task);
  });

  // Add automated tasks (always-running brain cycles)
  columns.automated.push(
    { id: 'auto-1', title: 'Niche research weekly cron', desc: 'Automated trending analysis', tag: 'ai' },
    { id: 'auto-2', title: 'Daily analytics reporting', desc: 'Pull Etsy stats, update dashboard', tag: 'ai' },
    { id: 'auto-3', title: 'Brain cycle decision engine', desc: `Every 6h — ${status?.cycleCount || 0} cycles completed`, tag: 'ai' },
  );

  // Render columns
  Object.entries(columns).forEach(([colId, tasks]) => {
    const col = document.getElementById(`col-${colId}`);
    if (!col) return;

    col.innerHTML = tasks.map(t => {
      const tagClass = t.category === 'build' || t.category === 'listing' ? 'money'
        : t.category === 'fix' ? 'infra'
        : t.tag || 'ai';
      const isUserTask = t.source === 'kanban' || t.source === 'telegram' || t.source === 'telegram-chat';
      const deleteBtn = (isUserTask && t.taskId)
        ? `<button class="kanban-delete" onclick="deleteTask(${t.taskId})" title="Delete task">&times;</button>`
        : '';

      return `
        <div class="kanban-card ${isUserTask ? 'user-task' : ''}" draggable="true" data-id="${t.id}" data-task-id="${t.taskId || ''}">
          ${deleteBtn}
          <div class="kanban-card-title">${t.title}</div>
          <div class="kanban-card-desc">${t.desc || t.details || ''}</div>
          <div class="kanban-card-meta">
            <span class="kanban-tag ${t.tag || tagClass}">${t.tag || t.category || 'task'}</span>
            ${t.priority ? `<span class="kanban-priority ${t.priority}">${t.priority}</span>` : ''}
            ${isUserTask ? '<span class="kanban-source">assigned</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  });

  // Update counters
  const el = (id) => document.getElementById(id);
  if (el('kanbanBacklog')) el('kanbanBacklog').textContent = columns.backlog.length;
  if (el('kanbanProgress')) el('kanbanProgress').textContent = columns['in-progress'].length;
  if (el('kanbanDone')) el('kanbanDone').textContent = columns.done.length;
  if (el('kanbanAuto')) el('kanbanAuto').textContent = columns.automated.length;

  // Set up drag-and-drop
  setupKanbanDragDrop();
}

// Offline fallback kanban
function renderOfflineKanban() {
  const columns = { backlog: [], 'in-progress': [], done: [], automated: [] };
  columns.backlog.push(
    { id: 'offline-1', title: 'Brain offline — connect to see live tasks', desc: 'Start the EC2 brain service', tag: 'infra' }
  );
  columns.automated.push(
    { id: 'auto-1', title: 'Brain cycle engine', desc: 'Claude-powered decisions every 6h', tag: 'ai' },
    { id: 'auto-2', title: 'Niche research cron', desc: 'Automated trending analysis', tag: 'ai' },
  );

  Object.entries(columns).forEach(([colId, colTasks]) => {
    const col = document.getElementById(`col-${colId}`);
    if (!col) return;
    col.innerHTML = colTasks.map(t => `
      <div class="kanban-card" data-id="${t.id}">
        <div class="kanban-card-title">${t.title}</div>
        <div class="kanban-card-desc">${t.desc}</div>
        <div class="kanban-card-meta"><span class="kanban-tag ${t.tag}">${t.tag}</span></div>
      </div>
    `).join('');
  });

  const el = (id) => document.getElementById(id);
  if (el('kanbanBacklog')) el('kanbanBacklog').textContent = columns.backlog.length;
  if (el('kanbanProgress')) el('kanbanProgress').textContent = columns['in-progress'].length;
  if (el('kanbanDone')) el('kanbanDone').textContent = columns.done.length;
  if (el('kanbanAuto')) el('kanbanAuto').textContent = columns.automated.length;
}

// ─── Task Modal ───────────────────────────────────────────────────────

function openTaskModal() {
  document.getElementById('taskModal').classList.add('active');
  document.getElementById('taskTitle').focus();
}

function closeTaskModal() {
  document.getElementById('taskModal').classList.remove('active');
  document.getElementById('taskForm').reset();
}

async function submitTask(e) {
  e.preventDefault();
  const btn = document.getElementById('submitTaskBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  const title = document.getElementById('taskTitle').value.trim();
  const desc = document.getElementById('taskDesc').value.trim();
  const actionBase = document.getElementById('taskAction').value;
  const target = document.getElementById('taskTarget').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const tag = document.getElementById('taskTag').value;

  // Build action string
  let action = null;
  if (actionBase) {
    action = actionBase.endsWith(':') && target ? `${actionBase}${target}` : actionBase;
  }

  try {
    const response = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc || title, action, priority, tag, category: tag }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const task = await response.json();
    console.log('[KANBAN] Task created:', task);

    closeTaskModal();
    renderKanbanPage(); // refresh
  } catch (err) {
    console.error('[KANBAN] Failed to create task:', err);
    alert(`Failed to assign task: ${err.message}\n\nIs the brain server running?`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Assign to Brain';
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;

  try {
    await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'DELETE' });
    renderKanbanPage();
  } catch (err) {
    console.error('[KANBAN] Failed to delete task:', err);
  }
}

async function updateTaskStatus(taskId, newStatus) {
  try {
    await fetch(`${API_BASE}/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    renderKanbanPage();
  } catch (err) {
    console.error('[KANBAN] Failed to update task:', err);
  }
}

// ─── Kanban Drag & Drop ──────────────────────────────────────────────

function setupKanbanDragDrop() {
  const cards = document.querySelectorAll('.kanban-card[data-task-id]');
  const columns = document.querySelectorAll('.kanban-cards');

  cards.forEach(card => {
    if (!card.dataset.taskId) return; // only user tasks can be dragged
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.dataset.taskId);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      if (!taskId) return;

      const colId = col.id.replace('col-', '');
      const statusMap = { 'backlog': 'pending', 'in-progress': 'in-progress', 'done': 'completed' };
      const newStatus = statusMap[colId];
      if (newStatus) updateTaskStatus(parseInt(taskId), newStatus);
    });
  });
}

// Close modal on escape / backdrop click
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('taskModal');
    if (modal && modal.classList.contains('active')) closeTaskModal();
  }
});
document.getElementById('taskModal')?.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) closeTaskModal();
});

// ─── Render: Projects Page ─────────────────────────────────────────

async function renderProjectsPage() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const status = cachedStatus;

  const allProjects = [
    ...SUPABASE_PROJECTS.map(p => ({
      ...p,
      desc: 'Supabase project — PostgreSQL + Auth + Storage + Edge Functions',
    })),
    {
      name: 'Adarsh Moneymaker',
      icon: '💰',
      type: 'Node.js',
      desc: `Etsy template pipeline — ${status?.catalog?.built || 0} built, ${status?.catalog?.planned || 0} planned`,
    },
    {
      name: 'Moneymaker Brain',
      icon: '🧠',
      type: 'AWS EC2',
      desc: `Autonomous AI brain — ${status?.cycleCount || 0} cycles, ${status?.state || 'unknown'} state`,
    },
    {
      name: 'Command Center',
      icon: '⚡',
      type: 'S3+CDN',
      desc: 'This dashboard — adarshpandey.co.in',
    },
  ];

  grid.innerHTML = allProjects.map(p => `
    <div class="project-card">
      <div class="project-card-header">
        <span style="font-size:24px">${p.icon}</span>
        <h3>${p.name}</h3>
      </div>
      <p>${p.desc}</p>
      <div style="margin-top:10px">
        <span class="template-status live" style="font-size:9px">${p.type}</span>
      </div>
    </div>
  `).join('');
}

// ─── Page Refresh Logic ────────────────────────────────────────────

async function refreshCurrentPage() {
  switch (currentPage) {
    case 'dashboard':
      await renderDashboard();
      break;
    case 'etsy':
      await renderEtsyPage();
      break;
    case 'health':
      await renderHealthPage();
      break;
    case 'kanban':
      await renderKanbanPage();
      break;
    case 'projects':
      await renderProjectsPage();
      break;
    // polymarket page is static for now
  }
}

// Auto-refresh
let autoRefreshInterval = null;

function startAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => {
    refreshCurrentPage();
  }, REFRESH_INTERVAL_MS);
}

// ─── Initialize ─────────────────────────────────────────────────────

async function init() {
  console.log('[CMD] Adarsh Command Center initializing...');
  console.log(`[CMD] API endpoint: ${API_BASE}`);

  // Initial load — fetch brain status first to test connection
  await loadBrainStatus();

  // Render current page
  await refreshCurrentPage();

  // Start auto-refresh
  startAutoRefresh();

  console.log(`[CMD] Initialized. Connected: ${isConnected}`);
}

init();
