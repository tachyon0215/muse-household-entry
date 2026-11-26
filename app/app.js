// Kakeibo Ledger — application logic. Hash routing, live totals, charts drawn as inline SVG.
(function () {
  "use strict";
  var H = window.HOUSEHOLD;
  var catById = {}; H.categories.forEach(function (c) { catById[c.id] = c; });
  var monthKeys = Object.keys(H.months).sort();
  var state = { month: monthKeys[monthKeys.length - 1], added: {}, budgets: JSON.parse(JSON.stringify(H.budgets)), billsPaid: {}, goals: {}, chartMode: "bar", txQuery: "", txCat: "all", txType: "all", txSort: "date-desc" };
  H.bills.forEach(function (b, i) { state.billsPaid[i] = b.paidNov; });
  H.goals.forEach(function (g) { state.goals[g.id] = g.saved; });
  try { var saved = localStorage.getItem("kakeibo-ledger-v1"); if (saved) { var s = JSON.parse(saved); if (s.added) state.added = s.added; if (s.budgets) state.budgets = s.budgets; if (s.goals) state.goals = s.goals; } } catch (e) {}
  function persist() { try { localStorage.setItem("kakeibo-ledger-v1", JSON.stringify({ added: state.added, budgets: state.budgets, goals: state.goals })); } catch (e) {} }
  function txs(month) { return (H.months[month] || []).concat(state.added[month] || []).map(function (t) { return [t[0], t[1], t[2], t[3]]; }); }
  function fmt(n) { var v = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); return (n < 0 ? "-$" : "$") + v; }
  function monthName(key) { var names = ["January","February","March","April","May","June","July","August","September","October","November","December"]; var p = key.split("-"); return names[+p[1] - 1] + " " + p[0]; }
  function totals(month) { var inc = 0, exp = 0, byCat = {}; txs(month).forEach(function (t) { if (t[3] >= 0) inc += t[3]; else { exp -= t[3]; byCat[t[2]] = (byCat[t[2]] || 0) - t[3]; } }); return { inc: inc, exp: exp, bal: inc - exp, byCat: byCat }; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function donutSVG(byCat, total) {
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    var r = 70, c = 2 * Math.PI * r, off = 0, parts = "";
    cats.forEach(function (id) { var frac = byCat[id] / total; var len = frac * c; parts += '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + catById[id].color + '" stroke-width="26" stroke-dasharray="' + Math.max(len - 2, 0.5) + " " + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"><title>' + esc(catById[id].label) + ": " + fmt(byCat[id]) + "</title></circle>"; off += len; });
    return '<svg viewBox="0 0 180 180" width="180" height="180" role="img" aria-label="Spending by category donut chart">' + parts + '<text x="90" y="86" text-anchor="middle" style="font-size:15px;font-weight:700;fill:#1c2430">' + fmt(total) + '</text><text x="90" y="104" text-anchor="middle">spent</text></svg>';
  }
  function barsSVG() {
    var rows = monthKeys.map(function (k) { var t = totals(k); return { k: k, inc: t.inc, exp: t.exp }; });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.inc, r.exp); }));
    var w = 460, h = 190, bw = 46, gap = (w - 40) / rows.length;
    var s = '<svg viewBox="0 0 ' + w + " " + h + '" style="width:100%;max-width:520px" role="img" aria-label="Income versus spending by month">';
    rows.forEach(function (r, i) { var x = 30 + i * gap + gap / 2 - bw; var ih = (r.inc / max) * 130, eh = (r.exp / max) * 130;
      s += '<rect x="' + x + '" y="' + (150 - ih) + '" width="' + (bw / 2 - 2) + '" height="' + ih + '" fill="#059669"><title>Income ' + fmt(r.inc) + "</title></rect>";
      s += '<rect x="' + (x + bw / 2) + '" y="' + (150 - eh) + '" width="' + (bw / 2 - 2) + '" height="' + eh + '" fill="#dc2626"><title>Spending ' + fmt(r.exp) + "</title></rect>";
      s += '<text x="' + (x + bw / 2 - 1) + '" y="168" text-anchor="middle">' + monthName(r.k).slice(0, 3) + " " + r.k.slice(2, 4) + "</text>"; });
    return s + "</svg>";
  }

  function viewOverview() {
    var t = totals(state.month), prevKey = monthKeys[monthKeys.indexOf(state.month) - 1];
    var diffTxt = "First month on record in this book.";
    if (prevKey) { var p = totals(prevKey); var d = t.exp - p.exp; diffTxt = "Spending is " + fmt(Math.abs(d)) + (d <= 0 ? " lower" : " higher") + " than " + monthName(prevKey) + " (" + fmt(p.exp) + ")."; }
    var rate = t.inc ? Math.round((t.bal / t.inc) * 100) : 0;
    var recent = txs(state.month).slice().sort(function (a, b) { return b[0].localeCompare(a[0]); }).slice(0, 6);
    var legend = Object.keys(t.byCat).sort(function (a, b) { return t.byCat[b] - t.byCat[a]; }).map(function (id) { return '<span><i style="background:' + catById[id].color + '"></i>' + catById[id].label + " — " + fmt(t.byCat[id]) + " (" + Math.round(t.byCat[id] / t.exp * 100) + "%)</span>"; }).join("");
    var recentRows = recent.map(function (x) { return "<tr><td>" + x[0].slice(5) + "</td><td>" + esc(x[1]) + '</td><td>' + catById[x[2]].label + '</td><td class="num ' + (x[3] < 0 ? "neg" : "pos") + '">' + fmt(x[3]) + "</td></tr>"; }).join("");
    return '<div class="cards">'
      + '<div class="card"><h3>Income</h3><div class="big pos">' + fmt(t.inc) + '</div><div class="sub">' + txs(state.month).filter(function (x) { return x[3] >= 0; }).length + ' payments in</div></div>'
      + '<div class="card"><h3>Spending</h3><div class="big neg">' + fmt(t.exp) + '</div><div class="sub">' + diffTxt + '</div></div>'
      + '<div class="card"><h3>Left over</h3><div class="big">' + fmt(t.bal) + '</div><div class="sub">Savings rate ' + rate + '% of income</div></div>'
      + '<div class="card"><h3>Bills still due</h3><div class="big">' + fmt(H.bills.filter(function (b, i) { return !state.billsPaid[i]; }).reduce(function (a, b) { return a + b.amount; }, 0)) + '</div><div class="sub"><a href="#/bills">See bills</a></div></div></div>'
      + '<div class="grid2"><section class="panel"><h2>Where the money went</h2><div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">' + donutSVG(t.byCat, t.exp) + '<div class="legend">' + legend + "</div></div></section>"
      + '<section class="panel"><h2>Income vs spending</h2>' + barsSVG() + '<div class="legend"><span><i style="background:#059669"></i>Income</span><span><i style="background:#dc2626"></i>Spending</span></div></section></div>'
      + '<section class="panel"><h2>Most recent entries</h2><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' + recentRows + '</tbody></table><p><a href="#/transactions">All transactions →</a> · <a href="#/budgets">Check budgets →</a></p></section>';
  }

  function viewTransactions() {
    var cats = H.categories.map(function (c) { return '<option value="' + c.id + '">' + c.label + "</option>"; }).join("");
    return '<section class="panel"><h2>Add a transaction</h2><form id="txForm"><div class="form-row">'
      + '<label>Date<input type="date" id="fDate" required value="' + state.month + '-27"></label>'
      + '<label>Description<input type="text" id="fDesc" required placeholder="e.g. GreenMart weekly shop" size="26"></label>'
      + '<label>Category<select id="fCat">' + cats + '</select></label>'
      + '<label>Amount (use − for spending)<input type="number" id="fAmt" step="0.01" required placeholder="-42.50"></label>'
      + '<label>&nbsp;<button class="btn" type="submit">Add entry</button></label></div>'
      + '<p class="muted">Entries you add are saved in this browser and included in every total, chart and report.</p></form></section>'
      + '<section class="panel"><h2>Transactions — ' + monthName(state.month) + '</h2><div class="form-row">'
      + '<label>Search<input type="search" id="txSearch" placeholder="Search descriptions" value="' + esc(state.txQuery) + '"></label>'
      + '<label>Category<select id="txCatSel"><option value="all">All categories</option>' + cats + '</select></label>'
      + '<label>Type<select id="txTypeSel"><option value="all">Income &amp; spending</option><option value="exp">Spending only</option><option value="inc">Income only</option></select></label>'
      + '<label>Sort<select id="txSortSel"><option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option><option value="amt-desc">Largest amount</option><option value="amt-asc">Smallest amount</option></select></label>'
      + '<label>&nbsp;<button class="btn secondary" id="txCsv" type="button">Download CSV</button></label></div>'
      + '<div id="txTable"></div></section>';
  }
  function renderTxTable() {
    var list = txs(state.month).filter(function (t) {
      if (state.txCat !== "all" && t[2] !== state.txCat) return false;
      if (state.txType === "exp" && t[3] >= 0) return false;
      if (state.txType === "inc" && t[3] < 0) return false;
      return t[1].toLowerCase().indexOf(state.txQuery.toLowerCase()) >= 0;
    });
    var sorts = { "date-desc": function (a, b) { return b[0].localeCompare(a[0]); }, "date-asc": function (a, b) { return a[0].localeCompare(b[0]); }, "amt-desc": function (a, b) { return Math.abs(b[3]) - Math.abs(a[3]); }, "amt-asc": function (a, b) { return Math.abs(a[3]) - Math.abs(b[3]); } };
    list.sort(sorts[state.txSort]);
    var sum = list.reduce(function (a, t) { return a + t[3]; }, 0);
    var rows = list.map(function (t) { return "<tr><td>" + t[0] + "</td><td>" + esc(t[1]) + "</td><td>" + catById[t[2]].label + '</td><td class="num ' + (t[3] < 0 ? "neg" : "pos") + '">' + fmt(t[3]) + "</td></tr>"; }).join("");
    el("txTable").innerHTML = list.length ? '<table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' + rows + '</tbody></table><p class="muted">' + list.length + " entries · net " + fmt(sum) + "</p>" : '<p class="muted">No entries match those filters. Clear the search or pick another category.</p>';
  }

  function viewBudgets() {
    var t = totals(state.month);
    var rows = Object.keys(state.budgets).map(function (id) {
      var spent = t.byCat[id] || 0, cap = state.budgets[id], pct = cap ? Math.min(100, Math.round(spent / cap * 100)) : 0;
      var cls = spent > cap ? "over" : ""; var barColor = spent > cap ? "#dc2626" : catById[id].color;
      return '<div class="bar-row"><span>' + catById[id].icon + " " + catById[id].label + '</span><span class="bar-track"><span class="bar-fill" style="display:block;width:' + pct + "%;background:" + barColor + '"></span></span><span class="num ' + cls + '">' + fmt(spent) + " / " + fmt(cap) + "</span></div>"
        + '<div class="form-row" style="margin:0 0 10px 140px"><label>Monthly budget $<input type="number" min="0" step="10" data-budget="' + id + '" value="' + cap + '"></label><span class="muted">' + (spent > cap ? fmt(spent - cap) + " over budget" : fmt(cap - spent) + " left") + "</span></div>";
    }).join("");
    return '<section class="panel"><h2>Monthly budgets — ' + monthName(state.month) + '</h2><p class="muted">Budgets are the household\u2019s agreed caps. Change a number and every bar, total and warning updates at once; your figures are saved in this browser.</p>' + rows + '<p><strong>Total budget:</strong> ' + fmt(Object.values(state.budgets).reduce(function (a, b) { return a + b; }, 0)) + " · <strong>Total spent:</strong> " + fmt(t.exp) + "</p></section>";
  }

  function viewBills() {
    var rows = H.bills.map(function (b, i) { var paid = state.billsPaid[i]; return "<tr><td>" + esc(b.name) + "</td><td>Due " + b.due + '</td><td class="num">' + fmt(b.amount) + '</td><td><span class="pill ' + (paid ? "paid" : "due") + '">' + (paid ? "Paid" : "Due") + '</span></td><td><button class="btn secondary" data-bill="' + i + '" type="button">' + (paid ? "Mark unpaid" : "Mark paid") + "</button></td></tr>"; }).join("");
    var dueTotal = H.bills.filter(function (b, i) { return !state.billsPaid[i]; }).reduce(function (a, b) { return a + b.amount; }, 0);
    return '<section class="panel"><h2>Recurring bills — November 2026</h2><p class="muted">The household\u2019s regular bills for this month. Toggling a bill updates the amount still due everywhere.</p><table><thead><tr><th>Bill</th><th>Due day</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table><p><strong>Still due:</strong> ' + fmt(dueTotal) + " · <strong>Paid so far:</strong> " + fmt(H.bills.reduce(function (a, b) { return a + b.amount; }, 0) - dueTotal) + "</p></section>";
  }

  function viewGoals() {
    var cards = H.goals.map(function (g) { var saved = state.goals[g.id], pct = Math.min(100, Math.round(saved / g.target * 100));
      return '<section class="panel"><div class="goal-head"><h2 style="margin:0">' + esc(g.name) + '</h2><span class="muted">' + fmt(saved) + " of " + fmt(g.target) + " (" + pct + "%)</span></div>"
      + '<div class="bar-track" style="margin:12px 0"><div class="bar-fill" style="width:' + pct + "%;background:var(--accent)\"></div></div>"
      + '<p class="muted">' + esc(g.note) + " · " + fmt(g.target - saved) + ' to go</p><div class="form-row"><label>Add contribution $<input type="number" min="1" step="1" value="50" data-goal-amt="' + g.id + '"></label><label>&nbsp;<button class="btn" type="button" data-goal-add="' + g.id + '">Add to goal</button></label></div></section>'; }).join("");
    var totS = H.goals.reduce(function (a, g) { return a + state.goals[g.id]; }, 0), totT = H.goals.reduce(function (a, g) { return a + g.target; }, 0);
    return '<div class="notice">Across all goals the household has saved <strong>' + fmt(totS) + "</strong> of <strong>" + fmt(totT) + "</strong>. Contributions are saved in this browser.</div>" + cards;
  }

  function viewReports() {
    var monthRows = monthKeys.map(function (k) { var t = totals(k); return "<tr><td>" + monthName(k) + '</td><td class="num pos">' + fmt(t.inc) + '</td><td class="num neg">' + fmt(t.exp) + '</td><td class="num">' + fmt(t.bal) + '</td><td class="num">' + (t.inc ? Math.round(t.bal / t.inc * 100) : 0) + "%</td></tr>"; }).join("");
    var t = totals(state.month);
    var catRows = Object.keys(t.byCat).sort(function (a, b) { return t.byCat[b] - t.byCat[a]; }).map(function (id) { var cap = state.budgets[id]; return "<tr><td>" + catById[id].label + '</td><td class="num">' + fmt(t.byCat[id]) + '</td><td class="num">' + Math.round(t.byCat[id] / t.exp * 100) + "%</td><td class=\"num\">" + (cap ? fmt(cap) : "—") + '</td><td class="num">' + (cap ? (t.byCat[id] > cap ? '<span class="over">Over by ' + fmt(t.byCat[id] - cap) + "</span>" : "Within budget") : "—") + "</td></tr>"; }).join("");
    return '<section class="panel"><h2>Month by month</h2><table><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Spending</th><th class="num">Left over</th><th class="num">Savings rate</th></tr></thead><tbody>' + monthRows + '</tbody></table></section>'
      + '<section class="panel"><h2>Category report — ' + monthName(state.month) + '</h2><table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Budget</th><th class="num">Verdict</th></tr></thead><tbody>' + catRows + '</tbody></table><p class="muted">Household rule from the kakeibo tradition: review every category at month\u2019s end, move what is left over into savings goals before the new month starts.</p></section>';
  }

  var views = { overview: viewOverview, transactions: viewTransactions, budgets: viewBudgets, bills: viewBills, goals: viewGoals, reports: viewReports };
  function route() {
    var key = (location.hash || "#/").replace("#/", "") || "overview"; if (!views[key]) key = "overview";
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.classList.toggle("active", a.dataset.nav === key); });
    el("monthLabel").textContent = monthName(state.month);
    el("prevMonth").disabled = monthKeys.indexOf(state.month) === 0;
    el("nextMonth").disabled = monthKeys.indexOf(state.month) === monthKeys.length - 1;
    el("view").innerHTML = views[key]();
    if (key === "transactions") wireTransactions();
    if (key === "budgets") wireBudgets();
    if (key === "bills") wireBills();
    if (key === "goals") wireGoals();
  }
  function wireTransactions() {
    el("txCatSel").value = state.txCat; el("txTypeSel").value = state.txType; el("txSortSel").value = state.txSort;
    el("txSearch").addEventListener("input", function (e) { state.txQuery = e.target.value; renderTxTable(); });
    el("txCatSel").addEventListener("change", function (e) { state.txCat = e.target.value; renderTxTable(); });
    el("txTypeSel").addEventListener("change", function (e) { state.txType = e.target.value; renderTxTable(); });
    el("txSortSel").addEventListener("change", function (e) { state.txSort = e.target.value; renderTxTable(); });
    el("txCsv").addEventListener("click", function () {
      var csv = "date,description,category,amount_usd\n" + txs(state.month).map(function (t) { return [t[0], '"' + t[1].replace(/"/g, '""') + '"', catById[t[2]].label, t[3].toFixed(2)].join(","); }).join("\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "kakeibo-" + state.month + ".csv"; a.click(); URL.revokeObjectURL(a.href);
    });
    el("txForm").addEventListener("submit", function (e) { e.preventDefault();
      var d = el("fDate").value, desc = el("fDesc").value.trim(), cat = el("fCat").value, amt = parseFloat(el("fAmt").value);
      if (!d || !desc || isNaN(amt) || amt === 0) return;
      var mk = d.slice(0, 7); if (!state.added[mk]) state.added[mk] = []; state.added[mk].push([d, desc, cat, amt]); persist();
      if (monthKeys.indexOf(mk) < 0) { H.months[mk] = []; monthKeys.push(mk); monthKeys.sort(); }
      state.month = mk; route();
    });
    renderTxTable();
  }
  function wireBudgets() { document.querySelectorAll("[data-budget]").forEach(function (inp) { inp.addEventListener("change", function () { var v = parseFloat(inp.value); if (!isNaN(v) && v >= 0) { state.budgets[inp.dataset.budget] = v; persist(); route(); } }); }); }
  function wireBills() { document.querySelectorAll("[data-bill]").forEach(function (b) { b.addEventListener("click", function () { var i = +b.dataset.bill; state.billsPaid[i] = !state.billsPaid[i]; route(); }); }); }
  function wireGoals() { document.querySelectorAll("[data-goal-add]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.goalAdd; var inp = document.querySelector('[data-goal-amt="' + id + '"]'); var v = parseFloat(inp.value); if (!isNaN(v) && v > 0) { state.goals[id] = Math.min(state.goals[id] + v, H.goals.filter(function (g) { return g.id === id; })[0].target); persist(); route(); } }); }); }
  el("prevMonth").addEventListener("click", function () { var i = monthKeys.indexOf(state.month); if (i > 0) { state.month = monthKeys[i - 1]; route(); } });
  el("nextMonth").addEventListener("click", function () { var i = monthKeys.indexOf(state.month); if (i < monthKeys.length - 1) { state.month = monthKeys[i + 1]; route(); } });
  el("footHousehold").textContent = H.householdName + " (" + H.members.join(", ") + ")";
  window.addEventListener("hashchange", route);
  route();
})();
