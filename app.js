/* ── Expense & Budget Visualizer — app.js ─────────── */

// ── Constants ──────────────────────────────────────
var STORAGE_KEY = 'expense_tracker_transactions';

var CATEGORY_COLORS = {
  Food:      '#22c55e',
  Transport: '#3b82f6',
  Fun:       '#a855f7'
};

// ── State ──────────────────────────────────────────
var transactions = [];   // Array of { id, name, amount, category }
var spendingChart = null; // Chart.js instance

// ── DOM refs ───────────────────────────────────────
var form          = document.getElementById('transaction-form');
var inputName     = document.getElementById('item-name');
var inputAmount   = document.getElementById('item-amount');
var inputCategory = document.getElementById('item-category');
var errorName     = document.getElementById('error-name');
var errorAmount   = document.getElementById('error-amount');
var errorCategory = document.getElementById('error-category');
var totalBalanceEl= document.getElementById('total-balance');
var listEl        = document.getElementById('transaction-list');
var emptyStateEl  = document.getElementById('empty-state');
var chartEmpty    = document.getElementById('chart-empty');
var chartCanvas   = document.getElementById('spending-chart');

// ── localStorage helpers ───────────────────────────
function loadFromStorage() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ── Validation ─────────────────────────────────────
function validateForm() {
  var valid = true;

  // Clear previous errors
  errorName.textContent     = '';
  errorAmount.textContent   = '';
  errorCategory.textContent = '';
  inputName.classList.remove('invalid');
  inputAmount.classList.remove('invalid');
  inputCategory.classList.remove('invalid');

  if (!inputName.value.trim()) {
    errorName.textContent = 'Item name is required.';
    inputName.classList.add('invalid');
    valid = false;
  }

  var amtVal = parseFloat(inputAmount.value);
  if (!inputAmount.value.trim() || isNaN(amtVal) || amtVal <= 0) {
    errorAmount.textContent = 'Enter a valid amount greater than 0.';
    inputAmount.classList.add('invalid');
    valid = false;
  }

  if (!inputCategory.value) {
    errorCategory.textContent = 'Please select a category.';
    inputCategory.classList.add('invalid');
    valid = false;
  }

  return valid;
}

// ── Format currency ─────────────────────────────────
function formatCurrency(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// ── Render balance ─────────────────────────────────
function renderBalance() {
  var total = transactions.reduce(function(sum, t) {
    return sum + t.amount;
  }, 0);
  totalBalanceEl.textContent = formatCurrency(total);
}

// ── Render transaction list ────────────────────────
function renderList() {
  // Clear existing items (except empty-state placeholder)
  var items = listEl.querySelectorAll('.transaction-item');
  items.forEach(function(item) {
    item.parentNode.removeChild(item);
  });

  if (transactions.length === 0) {
    emptyStateEl.style.display = 'block';
    return;
  }

  emptyStateEl.style.display = 'none';

  // Render newest first
  var reversed = transactions.slice().reverse();
  reversed.forEach(function(t) {
    var item = document.createElement('div');
    item.className = 'transaction-item';
    item.setAttribute('data-id', t.id);

    var badgeClass = 'badge badge-' + t.category.toLowerCase();

    item.innerHTML =
      '<div class="item-info">' +
        '<div class="item-name">' + escapeHtml(t.name) + '</div>' +
        '<div class="item-meta">' +
          '<span class="item-amount">' + formatCurrency(t.amount) + '</span>' +
          '<span class="' + badgeClass + '">' + escapeHtml(t.category) + '</span>' +
        '</div>' +
      '</div>' +
      '<button class="btn-delete" aria-label="Delete transaction" data-id="' + t.id + '">&#x1F5D1;</button>';

    listEl.appendChild(item);
  });
}

// ── Escape HTML to prevent XSS ─────────────────────
function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Chart helpers ──────────────────────────────────
function getCategoryTotals() {
  var totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(function(t) {
    if (totals[t.category] !== undefined) {
      totals[t.category] += t.amount;
    }
  });
  return totals;
}

function renderChart() {
  var totals = getCategoryTotals();
  var data   = [totals.Food, totals.Transport, totals.Fun];
  var hasData = data.some(function(v) { return v > 0; });

  // Show/hide empty message
  if (hasData) {
    chartEmpty.style.display  = 'none';
    chartCanvas.style.display = 'block';
  } else {
    chartEmpty.style.display  = 'block';
    chartCanvas.style.display = 'none';
    // Destroy chart if it exists so canvas is clean
    if (spendingChart) {
      spendingChart.destroy();
      spendingChart = null;
    }
    return;
  }

  if (spendingChart) {
    // Update existing chart
    spendingChart.data.datasets[0].data = data;
    spendingChart.update();
  } else {
    // Create new chart
    var ctx = chartCanvas.getContext('2d');
    spendingChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Food', 'Transport', 'Fun'],
        datasets: [{
          data: data,
          backgroundColor: [
            CATEGORY_COLORS.Food,
            CATEGORY_COLORS.Transport,
            CATEGORY_COLORS.Fun
          ],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              font: { size: 13, family: "'Segoe UI', system-ui, sans-serif" },
              color: '#1e1e2e'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                var label = context.label || '';
                var value = context.parsed || 0;
                return ' ' + label + ': ' + formatCurrency(value);
              }
            }
          }
        }
      }
    });
  }
}

// ── Full render (all UI pieces) ────────────────────
function render() {
  renderBalance();
  renderList();
  renderChart();
}

// ── Add transaction ────────────────────────────────
function addTransaction(name, amount, category) {
  var transaction = {
    id:       Date.now(),
    name:     name,
    amount:   amount,
    category: category
  };
  transactions.push(transaction);
  saveToStorage();
  render();
}

// ── Delete transaction ─────────────────────────────
function deleteTransaction(id) {
  transactions = transactions.filter(function(t) {
    return t.id !== id;
  });
  saveToStorage();
  render();
}

// ── Event: form submit ─────────────────────────────
form.addEventListener('submit', function(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  var name     = inputName.value.trim();
  var amount   = parseFloat(inputAmount.value);
  var category = inputCategory.value;

  addTransaction(name, amount, category);

  // Clear form
  inputName.value     = '';
  inputAmount.value   = '';
  inputCategory.value = '';
});

// ── Event: delete button (delegated) ──────────────
listEl.addEventListener('click', function(event) {
  var btn = event.target.closest('.btn-delete');
  if (!btn) return;
  var id = parseInt(btn.getAttribute('data-id'), 10);
  deleteTransaction(id);
});

// ── Init: load from storage and render ─────────────
transactions = loadFromStorage();
render();
