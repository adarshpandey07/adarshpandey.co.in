/**
 * Adarsh Command Center — Main Application
 * Enhanced with: Supabase health checks, localStorage Kanban persistence,
 * revenue tracker, auto-refresh, and keyboard shortcuts.
 */

// ─── Data ───────────────────────────────────────────────────────────

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

const AWS_SERVICES = [
  { name: 'S3 (Static Hosting)', icon: '📦', type: 'AWS' },
  { name: 'CloudFront CDN', icon: '🌐', type: 'AWS' },
  { name: 'Lambda Functions', icon: '⚡', type: 'AWS' },
  { name: 'EventBridge (Cron)', icon: '⏰', type: 'AWS' },
];

const ETSY_TEMPLATES = [
  { id: 'budget-tracker', name: '50/30/20 Budget Tracker', price: '$7.99', status: 'built', tags: ['finance', 'budget', 'popular'] },
  { id: 'bookkeeping', name: 'Small Business Bookkeeping', price: '$9.99', status: 'built', tags: ['business', 'accounting'] },
  { id: 'debt-payoff', name: 'Debt Payoff Tracker', price: '$6.99', status: 'planned', tags: ['finance', 'debt', 'snowball'] },
  { id: 'savings-goal', name: 'Savings Goal Tracker', price: '$5.99', status: 'planned', tags: ['savings', 'goals'] },
  { id: 'subscription-tracker', name: 'Subscription Tracker', price: '$4.99', status: 'planned', tags: ['subscriptions', 'bills'] },
];

const DEFAULT_KANBAN_TASKS = [
  { id: 1, title: 'Build remaining 3 Etsy templates', desc: 'Run build:debt, build:savings, build:subs via Google Sheets API', status: 'backlog', tag: 'money' },
  { id: 2, title: 'Register Etsy Developer API', desc: 'Go to etsy.com/developers, create app, get API keys', status: 'backlog', tag: 'money' },
  { id: 3, title: 'Set up Polymarket account', desc: 'Create account, fund with USDC on Polygon network', status: 'backlog', tag: 'money' },
  { id: 4, title: 'Build Polymarket trading bot', desc: 'Edge detection + Kelly criterion sizing + auto-execution', status: 'backlog', tag: 'ai' },
  { id: 5, title: 'Deploy Command Center to AWS', desc: 'S3 + CloudFront + DNS configuration', status: 'in-progress', tag: 'infra' },
  { id: 6, title: 'Set up Lambda health checks', desc: 'Ping all Supabase projects every 5 min, log to CloudWatch', status: 'backlog', tag: 'infra' },
  { id: 7, title: 'List first 5 templates on Etsy', desc: 'Use Etsy API to create listings with mockup images', status: 'backlog', tag: 'money' },
  { id: 8, title: 'Niche research weekly cron', desc: 'Automated trending analysis every Monday', status: 'automated', tag: 'ai' },
  { id: 9, title: 'Daily analytics reporting', desc: 'Pull Etsy stats, update dashboard, log revenue', status: 'automated', tag: 'ai' },
  { id: 10, title: 'Auto-generate SEO tags', desc: 'AI analyzes top sellers and suggests optimized tags', status: 'automated', tag: 'ai' },
];

const ACTIVITIES = [
  { icon: '🛠️', text: 'Built <strong>3 new templates</strong> — Debt Payoff, Savings Goal, Subscription Tracker', time: 'just now' },
  { icon: '🎨', text: 'Generated <strong>mockup images</strong> for all 5 templates', time: '5 min ago' },
  { icon: '🔧', text: '<strong>Pipeline runner</strong> wired up with full automation', time: '10 min ago' },
  { icon: '📊', text: 'Added <strong>research module</strong> with niche scoring algorithm', time: '15 min ago' },
  { icon: '🚀', text: 'Created <strong>Command Center</strong> project on AWS', time: '20 min ago' },
  { icon: '📦', text: 'Committed <strong>3,418 lines</strong> to adarsh-moneymaker repo', time: '30 min ago' },
];

// ─── [1] Supabase Health Checks ─────────────────────────────────────
//
// TO ENABLE REAL HEALTH CHECKS:
// 1. Add your Supabase project refs below (find them in each project's Settings > General)
// 2. Add your anon keys for each project
// 3. Set USE_REAL_HEALTH_CHECKS to true
//
// Example:
//   const SUPABASE_PROJECT_REFS = {
//     'Financial Analysis': { ref: 'abcdefghijklmnop', anonKey: 'eyJhbGci...' },
//     'Franchise Hub':      { ref: 'qrstuvwxyz123456', anonKey: 'eyJhbGci...' },
//     // ... add all 19 projects
//   };

const USE_REAL_HEALTH_CHECKS = false;
const SUPABASE_PROJECT_REFS = {
  // 'Financial Analysis': { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Franchise Hub':      { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Gilehri R&D':        { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'HRMS':               { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Marketing 360':      { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Raja Portal':        { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Task Flow Portal':   { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'All-in-One Sales':   { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Customer Support':   { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Darshan AI':         { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Finance 360':        { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Katyayani EXIM':     { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Katyayani AI':       { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Komal Extension':    { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Munmun':             { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Procurement Hub':    { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Shaadi Matcher':     { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Stock':              { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
  // 'Vardhman Clinic':    { ref: 'YOUR_PROJECT_REF_HERE', anonKey: 'YOUR_ANON_KEY_HERE' },
};

const HEALTH_CHECK_TIMEOUT_MS = 8000;

// Stores the latest health status for each service: { name: 'online'|'warning'|'offline', ... }
let healthResults = {};

/**
 * Pings a single Supabase project's REST API.
 * Returns 'online', 'warning' (slow >3s), or 'offline'.
 */
async function pingSupabaseProject(projectName) {
  const config = SUPABASE_PROJECT_REFS[projectName];
  if (!config || !USE_REAL_HEALTH_CHECKS) {
    // Simulated: 95% online, 4% warning, 1% offline
    const rand = Math.random();
    if (rand < 0.01) return 'offline';
    if (rand < 0.05) return 'warning';
    return 'online';
  }

  const url = `https://${config.ref}.supabase.co/rest/v1/`;
  const startTime = performance.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = performance.now() - startTime;

    if (!response.ok) return 'offline';
    if (elapsed > 3000) return 'warning';
    return 'online';
  } catch (err) {
    return 'offline';
  }
}

/**
 * Runs health checks against all Supabase projects and AWS services.
 * Updates the healthResults object and re-renders the health grid.
 */
async function checkSupabaseHealth() {
  // Ping all Supabase projects concurrently
  const supabaseChecks = SUPABASE_PROJECTS.map(async (project) => {
    const status = await pingSupabaseProject(project.name);
    healthResults[project.name] = status;
  });

  // AWS services are simulated for now (would need CloudWatch API access for real checks)
  const awsChecks = AWS_SERVICES.map(async (service) => {
    // Simulated: AWS services are almost always online
    const rand = Math.random();
    if (rand < 0.005) healthResults[service.name] = 'offline';
    else if (rand < 0.02) healthResults[service.name] = 'warning';
    else healthResults[service.name] = 'online';
  });

  await Promise.all([...supabaseChecks, ...awsChecks]);

  // Update health page counters
  const statuses = Object.values(healthResults);
  const onlineCount = statuses.filter(s => s === 'online').length;
  const warningCount = statuses.filter(s => s === 'warning').length;
  const offlineCount = statuses.filter(s => s === 'offline').length;

  const el = (id) => document.getElementById(id);
  if (el('healthOnline')) el('healthOnline').textContent = onlineCount;
  if (el('healthWarnings')) el('healthWarnings').textContent = warningCount;
  if (el('healthDown')) el('healthDown').textContent = offlineCount;
  if (el('servicesOnline')) el('servicesOnline').textContent = onlineCount;

  renderHealthGrid();
}

// ─── [2] Local Storage for Kanban ───────────────────────────────────

const KANBAN_STORAGE_KEY = 'adarsh_cc_kanban_tasks';

/**
 * Loads Kanban tasks from localStorage, falling back to DEFAULT_KANBAN_TASKS.
 */
function loadKanbanTasks() {
  try {
    const stored = localStorage.getItem(KANBAN_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load Kanban tasks from localStorage, using defaults.', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_KANBAN_TASKS));
}

/**
 * Saves the current Kanban tasks to localStorage.
 */
function saveKanbanTasks() {
  try {
    localStorage.setItem(KANBAN_STORAGE_KEY, JSON.stringify(KANBAN_TASKS));
  } catch (e) {
    console.warn('Failed to save Kanban tasks to localStorage.', e);
  }
}

// Initialize KANBAN_TASKS from localStorage (or defaults)
let KANBAN_TASKS = loadKanbanTasks();

// ─── [3] Revenue Tracker (Etsy) ─────────────────────────────────────

const REVENUE_STORAGE_KEY = 'adarsh_cc_revenue_entries';

/**
 * Adds a revenue entry to localStorage.
 * @param {number} amount - Revenue amount in USD
 * @param {string} source - Source of revenue (e.g., 'etsy', 'polymarket')
 * @param {string} [date] - ISO date string. Defaults to today.
 */
function addRevenue(amount, source, date) {
  if (typeof amount !== 'number' || amount <= 0) {
    console.warn('addRevenue: amount must be a positive number.');
    return;
  }
  const entries = getRevenueEntries();
  entries.push({
    id: Date.now(),
    amount: amount,
    source: source || 'etsy',
    date: date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(REVENUE_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to save revenue entry.', e);
  }
}

/**
 * Reads all revenue entries from localStorage.
 * @returns {Array} Array of revenue entry objects.
 */
function getRevenueEntries() {
  try {
    const stored = localStorage.getItem(REVENUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load revenue entries.', e);
  }
  return [];
}

/**
 * Calculates revenue statistics from stored entries.
 * @returns {Object} { total, monthlyAvg, dailyAvg, thisMonth, entryCount, bySource }
 */
function getRevenueStats() {
  const entries = getRevenueEntries();
  if (entries.length === 0) {
    return { total: 0, monthlyAvg: 0, dailyAvg: 0, thisMonth: 0, entryCount: 0, bySource: {} };
  }

  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  // Determine date range for averages
  const dates = entries.map(e => new Date(e.date));
  const earliest = new Date(Math.min(...dates));
  const latest = new Date(Math.max(...dates));
  const daySpan = Math.max(1, Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24)) + 1);
  const monthSpan = Math.max(1, (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth()) + 1);

  const dailyAvg = total / daySpan;
  const monthlyAvg = total / monthSpan;

  // This month's revenue
  const now = new Date();
  const thisMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
  const thisMonth = entries
    .filter(e => e.date.startsWith(thisMonthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  // Revenue by source
  const bySource = {};
  entries.forEach(e => {
    bySource[e.source] = (bySource[e.source] || 0) + e.amount;
  });

  return {
    total: Math.round(total * 100) / 100,
    monthlyAvg: Math.round(monthlyAvg * 100) / 100,
    dailyAvg: Math.round(dailyAvg * 100) / 100,
    thisMonth: Math.round(thisMonth * 100) / 100,
    entryCount: entries.length,
    bySource,
  };
}

/**
 * Updates the Etsy page Revenue stat card with real data from localStorage.
 */
function renderRevenueStats() {
  const stats = getRevenueStats();
  // Update the Revenue stat card on the Etsy page (4th stat card)
  const etsyPage = document.getElementById('page-etsy');
  if (!etsyPage) return;

  const statValues = etsyPage.querySelectorAll('.stat-value');
  const statSubs = etsyPage.querySelectorAll('.stat-sub');

  // The 4th stat card (index 3) is the Revenue card
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

// ─── Navigation ─────────────────────────────────────────────────────

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  etsy: 'Etsy Digital Products',
  polymarket: 'Polymarket Trading Bot',
  health: 'Server Health',
  kanban: 'AI Kanban Board',
  projects: 'All Projects',
};

// Ordered page list for keyboard shortcuts (1-6)
const PAGE_ORDER = ['dashboard', 'etsy', 'polymarket', 'health', 'kanban', 'projects'];

let currentPage = 'dashboard';

function navigateTo(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target page
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Update nav
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  // Update title
  document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');

  // Track current page
  currentPage = page;

  // Render revenue stats when visiting Etsy page
  if (page === 'etsy') {
    renderRevenueStats();
  }
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

// ─── [5] Keyboard Shortcuts ─────────────────────────────────────────
//
// Press 1-6 to switch pages:
//   1 = Dashboard, 2 = Etsy, 3 = Polymarket,
//   4 = Health, 5 = Kanban, 6 = Projects
// Press 'r' to refresh health checks (works from any page)

document.addEventListener('keydown', (e) => {
  // Don't capture shortcuts when typing in input fields
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
    return;
  }

  // Number keys 1-6 for page navigation
  const num = parseInt(e.key);
  if (num >= 1 && num <= 6) {
    e.preventDefault();
    navigateTo(PAGE_ORDER[num - 1]);
    return;
  }

  // 'r' key to refresh health checks
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    refreshHealth();
    return;
  }
});

// ─── Clock ──────────────────────────────────────────────────────────

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  document.getElementById('liveClock').textContent = `${date} ${time}`;
  document.getElementById('lastUpdated').textContent = `Updated: ${time}`;
}
setInterval(updateClock, 1000);
updateClock();

// ─── Render Status List (Dashboard) ────────────────────────────────

function renderStatusList() {
  const list = document.getElementById('statusList');
  if (!list) return;

  const allServices = [...SUPABASE_PROJECTS.slice(0, 8), ...AWS_SERVICES];
  list.innerHTML = allServices.map(s => {
    const status = healthResults[s.name] || 'online';
    const dotClass = status === 'online' ? 'green' : status === 'warning' ? 'orange' : 'red';
    return `
    <div class="status-item">
      <span class="status-dot ${dotClass}"></span>
      <span class="name">${s.icon} ${s.name}</span>
      <span class="type">${s.type}</span>
    </div>
  `;
  }).join('');
}

// ─── Render Activity Feed ──────────────────────────────────────────

function renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  feed.innerHTML = ACTIVITIES.map(a => `
    <div class="activity-item">
      <div class="activity-icon">${a.icon}</div>
      <div class="activity-text">${a.text}</div>
      <div class="activity-time">${a.time}</div>
    </div>
  `).join('');
}

// ─── Render Template Grid (Etsy Page) ──────────────────────────────

function renderTemplateGrid() {
  const grid = document.getElementById('templateGrid');
  if (!grid) return;

  grid.innerHTML = ETSY_TEMPLATES.map(t => `
    <div class="template-card">
      <h3>${t.name}</h3>
      <div class="price">${t.price}</div>
      <span class="template-status ${t.status}">${t.status}</span>
      <div class="template-tags">
        ${t.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

// ─── Render Health Grid ────────────────────────────────────────────

function renderHealthGrid() {
  const grid = document.getElementById('healthGrid');
  if (!grid) return;

  grid.innerHTML = SUPABASE_PROJECTS.map(p => {
    const status = healthResults[p.name] || 'online';
    return `
    <div class="health-card">
      <span style="font-size:20px">${p.icon}</span>
      <span class="name">${p.name}</span>
      <span class="status-indicator ${status}"></span>
    </div>
  `;
  }).join('');

  const awsGrid = document.getElementById('awsHealthGrid');
  if (!awsGrid) return;

  awsGrid.innerHTML = AWS_SERVICES.map(s => {
    const status = healthResults[s.name] || 'online';
    return `
    <div class="health-card">
      <span style="font-size:20px">${s.icon}</span>
      <span class="name">${s.name}</span>
      <span class="status-indicator ${status}"></span>
    </div>
  `;
  }).join('');
}

function refreshHealth() {
  // Show a brief loading state on all indicators
  document.querySelectorAll('.status-indicator').forEach(dot => {
    dot.className = 'status-indicator warning'; // flash orange briefly while checking
  });

  // Run the actual health checks
  checkSupabaseHealth().then(() => {
    // After checks complete, also update the dashboard status list
    renderStatusList();
  });
}

// ─── [4] Auto-Refresh for Health Page ──────────────────────────────

let healthAutoRefreshInterval = null;
const HEALTH_AUTO_REFRESH_MS = 60000; // 60 seconds

/**
 * Starts the 60-second auto-refresh cycle for the health page.
 * Called once on init; continues running in the background.
 */
function startHealthAutoRefresh() {
  // Clear any existing interval to avoid duplicates
  if (healthAutoRefreshInterval) clearInterval(healthAutoRefreshInterval);

  healthAutoRefreshInterval = setInterval(() => {
    // Only auto-refresh if we're currently on the health page
    if (currentPage === 'health') {
      console.log('[Auto-Refresh] Running health checks...');
      refreshHealth();
    }
  }, HEALTH_AUTO_REFRESH_MS);
}

// ─── Render Kanban Board ───────────────────────────────────────────

function renderKanban() {
  const columns = { backlog: [], 'in-progress': [], done: [], automated: [] };

  KANBAN_TASKS.forEach(task => {
    if (columns[task.status]) {
      columns[task.status].push(task);
    }
  });

  Object.entries(columns).forEach(([status, tasks]) => {
    const col = document.getElementById(`col-${status}`);
    if (!col) return;

    col.innerHTML = tasks.map(t => `
      <div class="kanban-card" draggable="true" data-id="${t.id}">
        <div class="kanban-card-title">${t.title}</div>
        <div class="kanban-card-desc">${t.desc}</div>
        <div class="kanban-card-meta">
          <span class="kanban-tag ${t.tag}">${t.tag}</span>
        </div>
      </div>
    `).join('');
  });

  // Update counters
  const el = (id) => document.getElementById(id);
  if (el('kanbanBacklog')) el('kanbanBacklog').textContent = columns.backlog.length;
  if (el('kanbanProgress')) el('kanbanProgress').textContent = columns['in-progress'].length;
  if (el('kanbanDone')) el('kanbanDone').textContent = columns.done.length;
  if (el('kanbanAuto')) el('kanbanAuto').textContent = columns.automated.length;
  if (el('aiTasksCount')) el('aiTasksCount').textContent = columns.automated.length;

  // Persist to localStorage after each render
  saveKanbanTasks();

  // Enable drag and drop
  setupDragDrop();
}

function setupDragDrop() {
  const cards = document.querySelectorAll('.kanban-card');
  const columns = document.querySelectorAll('.kanban-cards');

  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', card.dataset.id);
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
  });

  columns.forEach(col => {
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.style.background = 'rgba(139, 92, 246, 0.05)';
    });
    col.addEventListener('dragleave', () => {
      col.style.background = '';
    });
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.style.background = '';
      const id = parseInt(e.dataTransfer.getData('text/plain'));
      const newStatus = col.id.replace('col-', '');
      const task = KANBAN_TASKS.find(t => t.id === id);
      if (task) {
        task.status = newStatus;
        renderKanban(); // This will also call saveKanbanTasks()
      }
    });
  });
}

function addTask(status) {
  const title = prompt('Task title:');
  if (!title) return;

  const desc = prompt('Description (optional):') || '';
  const tag = prompt('Tag (money/infra/ai):') || 'money';

  // Generate a unique ID based on the max existing ID
  const maxId = KANBAN_TASKS.reduce((max, t) => Math.max(max, t.id), 0);

  KANBAN_TASKS.push({
    id: maxId + 1,
    title,
    desc,
    status,
    tag,
  });

  renderKanban(); // This will also call saveKanbanTasks()
}

// ─── Render Projects Grid ──────────────────────────────────────────

function renderProjectsGrid() {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const allProjects = [
    ...SUPABASE_PROJECTS.map(p => ({ ...p, desc: 'Supabase project — PostgreSQL + Auth + Storage + Edge Functions' })),
    { name: 'Adarsh Moneymaker', icon: '💰', type: 'Node.js', desc: 'Etsy digital product pipeline — Google Sheets templates' },
    { name: 'Command Center', icon: '⚡', type: 'AWS', desc: 'This dashboard — S3 + CloudFront static site' },
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

// ─── Initialize ─────────────────────────────────────────────────────

function init() {
  renderStatusList();
  renderActivityFeed();
  renderTemplateGrid();
  renderKanban();
  renderProjectsGrid();
  renderRevenueStats();

  // Run initial health checks (populates healthResults, then renders health grid)
  checkSupabaseHealth().then(() => {
    renderStatusList(); // Re-render dashboard status with real results
  });

  // Start auto-refresh for health page (every 60 seconds)
  startHealthAutoRefresh();
}

init();
