/**
 * AI Cooking To-Do List — Frontend Application
 * @module app
 */

const form = document.getElementById('plan-form');
const scheduleInput = document.getElementById('schedule-input');
const budgetInput = document.getElementById('budget-input');
const dietRadios = document.querySelectorAll('input[name="diet"]');
const mealPlanEl = document.getElementById('meal-plan');
const groceryListEl = document.getElementById('grocery-list');
const substitutionsEl = document.getElementById('substitutions');
const budgetTrackerEl = document.getElementById('budget-tracker');
const loadingOverlay = document.getElementById('loading-overlay');
const themeToggle = document.getElementById('theme-toggle');

// ── Theme Toggle ───────────────────────────────────────────────────────

/**
 * Initialize theme from localStorage or default to dark.
 */
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/**
 * Toggle between light and dark themes.
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

themeToggle.addEventListener('click', toggleTheme);
initTheme();

// ── Meal Card Component ────────────────────────────────────────────────

/**
 * Create a meal item element for the timeline.
 * @param {string} label - Meal label (breakfast, lunch, dinner).
 * @param {object} meal - Meal data { meal, description, estimated_cost }.
 * @param {number} index - Index for animation delay.
 * @returns {HTMLElement}
 */
function createMealItem(label, meal, index) {
  const article = document.createElement('article');
  article.className = 'meal-item fade-in-up';
  article.style.animationDelay = `${index * 0.1}s`;

  const emojis = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' };

  article.innerHTML = `
    <div class="meal-item-header">
      <span class="meal-label">
        <span class="emoji">${emojis[label] || '🍽️'}</span>
        ${label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
      <span class="meal-cost">₹${meal.estimated_cost.toFixed(2)}</span>
    </div>
    <p class="meal-desc">
      <strong>${meal.meal}</strong> &mdash; ${meal.description}
    </p>
  `;

  return article;
}

// ── DOM Renderers ──────────────────────────────────────────────────────

/**
 * Render the meal plan timeline.
 * @param {object} plan - { breakfast, lunch, dinner }
 */
function renderPlan(plan) {
  mealPlanEl.innerHTML = '';
  const meals = [
    { label: 'breakfast', data: plan.breakfast },
    { label: 'lunch', data: plan.lunch },
    { label: 'dinner', data: plan.dinner },
  ];

  meals.forEach(({ label, data }, i) => {
    if (data) mealPlanEl.appendChild(createMealItem(label, data, i));
  });

  if (mealPlanEl.children.length === 0) {
    mealPlanEl.innerHTML = '<p class="placeholder-text">No meal plan data received.</p>';
  }
}

/**
 * Render the grocery list.
 * @param {string[]} items
 */
function renderGroceryList(items) {
  groceryListEl.innerHTML = '';
  if (!items || items.length === 0) {
    groceryListEl.innerHTML = '<li class="placeholder-text">No grocery items.</li>';
    return;
  }
  items.forEach((item, i) => {
    const li = document.createElement('li');
    li.className = 'fade-in-up';
    li.style.animationDelay = `${i * 0.06}s`;
    li.textContent = item;
    groceryListEl.appendChild(li);
  });
}

/**
 * Render ingredient substitutions.
 * @param {Array<{ ingredient: string, alternative: string }>} subs
 */
function renderSubstitutions(subs) {
  substitutionsEl.innerHTML = '';
  if (!subs || subs.length === 0) {
    substitutionsEl.innerHTML = '<p class="placeholder-text">No substitutions available.</p>';
    return;
  }
  subs.forEach((sub, i) => {
    const div = document.createElement('div');
    div.className = 'sub-item fade-in-up';
    div.style.animationDelay = `${i * 0.08}s`;
    div.innerHTML = `<strong>${sub.ingredient}</strong> <span class="arrow">→</span> ${sub.alternative}`;
    substitutionsEl.appendChild(div);
  });
}

/**
 * Render the budget tracker.
 * @param {object} bc - Budget check object.
 * @param {number} bc.total_estimated_cost
 * @param {number} bc.budget
 * @param {boolean} bc.within_budget
 * @param {string} bc.note
 */
function renderBudget(bc) {
  budgetTrackerEl.innerHTML = '';

  if (!bc) {
    budgetTrackerEl.innerHTML = '<p class="placeholder-text">No budget data.</p>';
    return;
  }

  const inBudget = bc.within_budget;

  budgetTrackerEl.innerHTML = `
    <div class="budget-row">
      <span class="label">Total Estimated Cost</span>
      <span class="value">₹${bc.total_estimated_cost.toFixed(2)}</span>
    </div>
    <div class="budget-row">
      <span class="label">Your Budget</span>
      <span class="value">₹${bc.budget.toFixed(2)}</span>
    </div>
    <div class="budget-row total-row">
      <span class="label">Remaining</span>
      <span class="value" style="color: ${inBudget ? 'var(--success)' : 'var(--danger)'}">
        ${inBudget ? '+' : '-'}₹${Math.abs(bc.budget - bc.total_estimated_cost).toFixed(2)}
      </span>
    </div>
    <div class="budget-status ${inBudget ? 'within' : 'exceeded'}">
      ${bc.note}
    </div>
  `;
}

/**
 * Display error state across all panels.
 * @param {string} message
 */
function renderError(message) {
  [mealPlanEl, groceryListEl, substitutionsEl, budgetTrackerEl].forEach(el => {
    el.innerHTML = `<p class="placeholder-text" style="color: var(--danger)">${message}</p>`;
  });
}

/**
 * Scroll smoothly to the timeline panel on mobile.
 */
function scrollToResults() {
  const timeline = document.querySelector('.timeline-panel');
  if (timeline) {
    timeline.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Form Submit ────────────────────────────────────────────────────────

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const schedule = scheduleInput.value.trim();
  const budget = budgetInput.value.trim();
  const diet = document.querySelector('input[name="diet"]:checked')?.value || 'veg';

  if (!schedule || !budget) return;

  // Show loading
  loadingOverlay.hidden = false;
  form.querySelector('.btn-primary').classList.add('loading');

  try {
    const res = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule, budget: Number(budget), diet }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server error (${res.status})`);
    }

    const data = await res.json();

    renderPlan(data.plan);
    renderGroceryList(data.grocery_list);
    renderSubstitutions(data.substitutions);
    renderBudget(data.budget_check);
    scrollToResults();
  } catch (err) {
    renderError(err.message || 'Something went wrong. Please try again.');
  } finally {
    loadingOverlay.hidden = true;
    form.querySelector('.btn-primary').classList.remove('loading');
  }
});
