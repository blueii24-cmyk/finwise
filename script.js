/* FinWise keeps the JavaScript small so the main ideas are easy to explain. */
const $ = id => document.getElementById(id);
const money = value => "₹" + Math.round(Number(value) || 0).toLocaleString("en-IN");
const read = id => Number($(id)?.value || 0);
const show = (id, message, type = "") => {
  if (!$(`${id}`)) return;
  $(`${id}`).textContent = message;
  $(`${id}`).className = `msg ${type}`;
};

const budgetKey = "finwise-budget";
const expenseKey = "finwise-expenses";
const themeKey = "finwise-theme";
const budgetCategories = ["food", "transport", "education", "entertainment", "shopping", "other"];

function getSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function totalBudgetExpenses() {
  return budgetCategories.reduce((sum, category) => sum + read(category), 0);
}

/* A small theme preference is shared between pages. */
function setupTheme() {
  document.documentElement.dataset.theme = localStorage.getItem(themeKey) || "light";
  const button = document.createElement("button");
  button.className = "theme-toggle";
  button.type = "button";
  const updateText = () => {
    button.textContent = document.documentElement.dataset.theme === "dark" ? "☀️ Light" : "🌙 Dark";
  };
  updateText();
  button.addEventListener("click", () => {
    const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeKey, theme);
    updateText();
  });
  document.querySelector(".nav")?.appendChild(button);
}

function setupMenu() {
  const menu = document.querySelector(".nav ul");
  const button = $("menuBtn");
  if (!menu || !button) return;
  button.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    button.setAttribute("aria-expanded", open);
    button.firstElementChild.className = open ? "fa-solid fa-xmark" : "fa-solid fa-bars";
  });
}

function showBudgetResults(income, expenses) {
  const total = expenses.reduce((sum, value) => sum + value, 0);
  const remaining = income - total;
  const rate = income ? remaining / income * 100 : 0;
  $("rIncome") && ($("rIncome").textContent = money(income));
  $("rExpense") && ($("rExpense").textContent = money(total));
  $("rRemain") && ($("rRemain").textContent = (remaining < 0 ? "-" : "") + money(Math.abs(remaining)));
  $("rRate") && ($("rRate").textContent = rate.toFixed(1) + "%");
  $("rRateText") && ($("rRateText").textContent = rate.toFixed(1) + "%");
  $("rBar") && ($("rBar").style.width = Math.max(0, Math.min(rate, 100)) + "%");
  return { total, remaining, rate };
}

if ($("budgetForm")) {
  $("budgetForm").addEventListener("submit", event => {
    event.preventDefault();
    const income = read("income");
    const expenses = budgetCategories.map(read);
    if (income <= 0) return show("budgetMsg", "Enter an income greater than 0.", "error");
    if (expenses.some(value => value < 0)) return show("budgetMsg", "Expenses cannot be negative.", "error");
    save(budgetKey, { income, expenses });
    const result = showBudgetResults(income, expenses);
    $("budgetHint").hidden = true;
    $("budgetOut").hidden = false;
    show("budgetAdvice", result.remaining < 0 ? "You are spending more than your income." : "Your budget has been calculated.", result.remaining < 0 ? "error" : "ok");
    updateDashboard();
  });
}

if ($("goalForm")) {
  $("goalForm").addEventListener("submit", event => {
    event.preventDefault();
    const target = read("goal");
    const saved = read("saved");
    const monthly = read("monthly");
    if (target <= 0 || saved < 0 || monthly <= 0) return show("goalMsg", "Enter positive target and monthly amounts.", "error");
    const remaining = Math.max(0, target - saved);
    const months = Math.ceil(remaining / monthly);
    const progress = Math.min(100, saved / target * 100);
    $("goalResult").textContent = saved >= target ? "Goal reached!" : `Estimated time: ${months} month${months === 1 ? "" : "s"}`;
    $("goalPct").textContent = progress.toFixed(0) + "%";
    $("goalBar").style.width = progress + "%";
    $("goalNote").textContent = `Remaining: ${money(remaining)}`;
    $("goalHint").hidden = true;
    $("goalOut").hidden = false;
  });
}

function renderExpenses() {
  const expenses = getSaved(expenseKey, []);
  if (!$("expenseList")) return;
  $("expenseList").innerHTML = expenses.length
    ? expenses.map(item => `<li class="expense-item"><div><b>${item.name}</b><small>${item.category} · ${item.date}</small></div><strong>${money(item.amount)}</strong><button class="delete-btn" data-id="${item.id}">Delete</button></li>`).join("")
    : "<li class=\"empty-state\">No expenses added yet.</li>";
  $("expenseTotal") && ($("expenseTotal").textContent = money(expenses.reduce((sum, item) => sum + item.amount, 0)));
  $("expenseCount") && ($("expenseCount").textContent = expenses.length);
}
if ($("expenseForm")) {
  $("expenseForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("expenseName").value.trim();
    const amount = read("expenseAmount");
    if (!name || amount <= 0) return show("expenseMsg", "Enter an expense name and amount.", "error");
    const expenses = getSaved(expenseKey, []);
    expenses.push({ id: Date.now(), name, amount, category: $("expenseCategory").value, date: $("expenseDate").value });
    save(expenseKey, expenses);
    event.target.reset();
    renderExpenses();
    show("expenseMsg", "Expense added.", "ok");
  });
  $("expenseList").addEventListener("click", event => {
    if (!event.target.dataset.id) return;
    const expenses = getSaved(expenseKey, []).filter(item => String(item.id) !== event.target.dataset.id);
    save(expenseKey, expenses);
    renderExpenses();
  });
  renderExpenses();
}

if ($("contactForm")) {
  $("contactForm").addEventListener("submit", event => {
    event.preventDefault();
    const name = $("cName").value.trim() || "there";
    show("contactMsg", `Thank you, ${name}! This demo form does not send messages.`, "ok");
    event.target.reset();
  });
}

function updateDashboard() {
  if (!$("dashboardRoot")) return;
  const budget = getSaved(budgetKey, null);
  const expenses = getSaved(expenseKey, []);
  const income = budget ? budget.income : 25000;
  const total = expenses.length ? expenses.reduce((sum, item) => sum + item.amount, 0) : (budget ? 0 : 2250);
  const remaining = income - total;
  $("dashIncome").textContent = money(income);
  $("dashExpenses").textContent = money(total);
  $("dashRemaining").textContent = money(remaining);
  $("dashSavings").textContent = money(remaining);
  $("dashboardLabel").textContent = budget || expenses.length ? "Saved data" : "Demo Data";
  $("recentTransactions").innerHTML = expenses.length
    ? expenses.slice(-4).reverse().map(item => `<li><span>${item.name} <small>${item.category}</small></span><b>${money(item.amount)}</b></li>`).join("")
    : "<li><span>Sample expenses</span><b>₹2,250</b></li>";
}

setupTheme();
setupMenu();
updateDashboard();
if ($("year")) $("year").textContent = new Date().getFullYear();
