// Kakeibo Ledger — application logic. Hash routing, live totals, charts drawn as inline SVG.
(function () {
  "use strict";
  var H = window.HOUSEHOLD;
  var catById = {}; H.categories.forEach(function (c) { catById[c.id] = c; });
  var recordedKeys = Object.keys(H.months).sort();
  var lastRecorded = recordedKeys[recordedKeys.length - 1];
  // Build the projected months from the standing monthly pattern, so the
  // month switcher always has somewhere real to go: each projection is the
  // recurring entries on their usual days, a weekly grocery run, and any
  // one-off items the household already expects that month.
  var projectedKeys = [];
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function buildProjection(key) {
    var rows = H.recurring.map(function (r) { return [key + "-" + pad2(r.day), r.description, r.category, r.amount]; });
    [5, 12, 19, 26].forEach(function (d) { rows.push([key + "-" + pad2(d), "Groceries — GreenMart (weekly, projected)", "groceries", -172.00]); });
    (H.projectionExtras[key] || []).forEach(function (x) { rows.push(x.slice()); });
    rows.sort(function (a, b) { return a[0].localeCompare(b[0]); });
    return rows;
  }
  ["2026-12", "2027-01"].forEach(function (key) { if (!H.months[key]) { H.months[key] = buildProjection(key); projectedKeys.push(key); } });
  var monthKeys = Object.keys(H.months).sort();
  function isProjected(key) { return projectedKeys.indexOf(key) >= 0; }
  var state = { month: lastRecorded, added: {}, budgets: JSON.parse(JSON.stringify(H.budgets)), billsPaid: {}, goals: {}, chartMode: "bar", txQuery: "", txCat: "all", txType: "all", txSort: "date-desc" };
  // Bill status is kept per month: settled for the recorded past, the
  // book's own flags for November, and still-to-pay for projected months.
  function billPaid(month, i) {
    var k = month + ":" + i;
    if (Object.prototype.hasOwnProperty.call(state.billsPaid, k)) return state.billsPaid[k];
    if (isProjected(month)) return false;
    if (month === "2026-11") return H.bills[i].paidNov;
    return true;
  }
  H.goals.forEach(function (g) { state.goals[g.id] = g.saved; });
  try { var saved = localStorage.getItem("kakeibo-ledger-v1"); if (saved) { var s = JSON.parse(saved); if (s.added) state.added = s.added; if (s.budgets) state.budgets = s.budgets; if (s.goals) state.goals = s.goals; if (s.billsPaid) state.billsPaid = s.billsPaid; } } catch (e) {}
  function persist() { try { localStorage.setItem("kakeibo-ledger-v1", JSON.stringify({ added: state.added, budgets: state.budgets, goals: state.goals, billsPaid: state.billsPaid })); } catch (e) {} }
  function txs(month) { return (H.months[month] || []).concat(state.added[month] || []).map(function (t) { return [t[0], t[1], t[2], t[3]]; }); }
  function fmt(n) { var v = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); return (n < 0 ? "-$" : "$") + v; }
  function monthName(key) { var names = ["January","February","March","April","May","June","July","August","September","October","November","December"]; var p = key.split("-"); return names[+p[1] - 1] + " " + p[0]; }
  function totals(month) { var inc = 0, exp = 0, byCat = {}; txs(month).forEach(function (t) { if (t[3] >= 0) inc += t[3]; else { exp -= t[3]; byCat[t[2]] = (byCat[t[2]] || 0) - t[3]; } }); return { inc: inc, exp: exp, bal: inc - exp, byCat: byCat }; }
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function donutSVG(byCat, total) {
    var cats = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });
    var r = 70, c = 2 * Math.PI * r, off = 0, parts = "", labels = "";
    cats.forEach(function (id) {
      var frac = byCat[id] / total; var len = frac * c;
      parts += '<circle cx="90" cy="90" r="' + r + '" fill="none" stroke="' + catById[id].color + '" stroke-width="26" stroke-dasharray="' + Math.max(len - 2, 0.5) + " " + (c - len) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 90 90)"><title>' + esc(catById[id].label) + ": " + fmt(byCat[id]) + " (" + Math.round(frac * 100) + "%)</title></circle>";
      // Slices wide enough get their percentage printed right on the ring.
      if (frac >= 0.08) {
        var ang = ((off + len / 2) / c) * 2 * Math.PI - Math.PI / 2;
        var lx = 90 + r * Math.cos(ang), ly = 90 + r * Math.sin(ang);
        labels += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="middle" style="font-size:12px;font-weight:700;fill:#fff">' + Math.round(frac * 100) + "%</text>";
      }
      off += len;
    });
    return '<svg viewBox="0 0 180 180" width="190" height="190" role="img" aria-label="Spending by category donut chart">' + parts + labels + '<text x="90" y="86" text-anchor="middle" style="font-size:15px;font-weight:700;fill:#1c2430">' + fmt(total) + '</text><text x="90" y="104" text-anchor="middle">spent</text></svg>';
  }
  function fmtShort(n) { return n >= 1000 ? "$" + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : fmt(n); }
  function barsSVG() {
    var rows = monthKeys.map(function (k) { var t = totals(k); return { k: k, inc: t.inc, exp: t.exp }; });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max(r.inc, r.exp); }));
    var w = 460, h = 196, bw = 46, gap = (w - 40) / rows.length;
    var s = '<svg viewBox="0 0 ' + w + " " + h + '" style="width:100%;max-width:520px" role="img" aria-label="Income versus spending by month">';
    [0.25, 0.5, 0.75, 1].forEach(function (f) { var y = 150 - 130 * f; s += '<line x1="26" x2="' + (w - 14) + '" y1="' + y + '" y2="' + y + '" stroke="#e8edf2" stroke-width="1"/><text x="22" y="' + (y + 3) + '" text-anchor="end" style="font-size:9px">' + fmtShort(max * f) + "</text>"; });
    s += '<line x1="26" x2="' + (w - 14) + '" y1="150" y2="150" stroke="#cbd5e1" stroke-width="1"/>';
    rows.forEach(function (r, i) { var x = 30 + i * gap + gap / 2 - bw; var ih = (r.inc / max) * 130, eh = (r.exp / max) * 130;
      s += '<rect x="' + x + '" y="' + (150 - ih) + '" width="' + (bw / 2 - 2) + '" height="' + ih + '" rx="2" fill="#059669"><title>Income ' + fmt(r.inc) + "</title></rect>";
      s += '<rect x="' + (x + bw / 2) + '" y="' + (150 - eh) + '" width="' + (bw / 2 - 2) + '" height="' + eh + '" rx="2" fill="#dc2626"><title>Spending ' + fmt(r.exp) + "</title></rect>";
      s += '<text x="' + (x + bw / 4 - 1) + '" y="' + (142 - ih) + '" text-anchor="middle" style="font-size:10px;font-weight:700;fill:#059669">' + fmtShort(r.inc) + "</text>";
      s += '<text x="' + (x + bw * 0.75) + '" y="' + (142 - eh) + '" text-anchor="middle" style="font-size:10px;font-weight:700;fill:#dc2626">' + fmtShort(r.exp) + "</text>";
      s += '<text x="' + (x + bw / 2 - 1) + '" y="168" text-anchor="middle">' + monthName(r.k).slice(0, 3) + " " + r.k.slice(2, 4) + (isProjected(r.k) ? " (proj.)" : "") + "</text>"; });
    return s + "</svg>";
  }
  // Cumulative spending across the days of a month, as a small sparkline
  // for the summary strip: shows how fast the month's money is going out.
  function sparkSVG(month) {
    var days = {}, totalOut = 0;
    txs(month).forEach(function (t) { if (t[3] < 0) { var d = +t[0].slice(8, 10); days[d] = (days[d] || 0) - t[3]; totalOut -= t[3]; } });
    var max = totalOut || 1, cum = 0, pts = ["0,26"];
    for (var d = 1; d <= 31; d++) { if (days[d]) { cum += days[d]; pts.push((d * 4) + "," + (26 - (cum / max) * 23).toFixed(1)); } }
    return '<svg class="spark" viewBox="0 0 128 30" width="128" height="30" role="img" aria-label="Cumulative spending sparkline"><polyline points="' + pts.join(" ") + '" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round"/></svg>';
  }

  function viewOverview() {
    var t = totals(state.month), prevKey = monthKeys[monthKeys.indexOf(state.month) - 1];
    var diffTxt = "First month on record in this book.";
    if (prevKey) { var p = totals(prevKey); var d = t.exp - p.exp; diffTxt = "Spending is " + fmt(Math.abs(d)) + (d <= 0 ? " lower" : " higher") + " than " + monthName(prevKey) + " (" + fmt(p.exp) + ")."; }
    var rate = t.inc ? Math.round((t.bal / t.inc) * 100) : 0;
    var recent = txs(state.month).slice().sort(function (a, b) { return b[0].localeCompare(a[0]); }).slice(0, 6);
    var legend = Object.keys(t.byCat).sort(function (a, b) { return t.byCat[b] - t.byCat[a]; }).map(function (id) { return '<span><i style="background:' + catById[id].color + '"></i>' + catById[id].label + " — " + fmt(t.byCat[id]) + " (" + Math.round(t.byCat[id] / t.exp * 100) + "%)</span>"; }).join("");
    var recentRows = recent.map(function (x) { return "<tr><td>" + x[0].slice(5) + "</td><td>" + esc(x[1]) + '</td><td>' + catById[x[2]].label + '</td><td class="num ' + (x[3] < 0 ? "neg" : "pos") + '">' + fmt(x[3]) + "</td></tr>"; }).join("");
    var banner = isProjected(state.month) ? '<div class="notice proj"><strong>' + monthName(state.month) + ' is a projection.</strong> It is built from the household\u2019s standing monthly pattern — rent, salaries, bills, the weekly grocery run — plus one-off items already expected. Mark bills paid on the Bills page as the month unfolds; the figures will firm up into the real book.</div>' : "";
    return banner + '<div class="cards">'
      + '<div class="card"><h3>Income</h3><div class="big pos">' + fmt(t.inc) + '</div><div class="sub">' + txs(state.month).filter(function (x) { return x[3] >= 0; }).length + ' payments in</div></div>'
      + '<div class="card"><h3>Spending</h3><div class="big neg">' + fmt(t.exp) + '</div><div class="sub">' + diffTxt + '</div></div>'
      + '<div class="card"><h3>Left over</h3><div class="big">' + fmt(t.bal) + '</div><div class="sub">Savings rate ' + rate + '% of income</div></div>'
      + '<div class="card"><h3>Bills still due</h3><div class="big">' + fmt(H.bills.filter(function (b, i) { return !billPaid(state.month, i); }).reduce(function (a, b) { return a + b.amount; }, 0)) + '</div><div class="sub"><a href="#/bills">See bills</a></div></div></div>'
      + '<div class="grid2"><section class="panel"><h2>Where the money went</h2><div style="display:flex;gap:18px;flex-wrap:wrap;align-items:center">' + donutSVG(t.byCat, t.exp) + '<div class="legend">' + legend + "</div></div></section>"
      + '<section class="panel"><h2>Income vs spending</h2>' + barsSVG() + '<div class="legend"><span><i style="background:#059669"></i>Income</span><span><i style="background:#dc2626"></i>Spending</span></div></section></div>'
      + '<section class="panel"><h2>Most recent entries</h2><div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' + recentRows + '</tbody></table></div><p><a href="#/transactions">All transactions →</a> · <a href="#/budgets">Check budgets →</a></p></section>';
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
      + '<section class="panel"><h2>Transactions — ' + monthName(state.month) + (isProjected(state.month) ? ' <span class="muted">(projected)</span>' : "") + '</h2><div class="form-row">'
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
    el("txTable").innerHTML = list.length ? '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="muted">' + list.length + " entries · net " + fmt(sum) + "</p>" : '<p class="muted">No entries match those filters. Clear the search or pick another category.</p>';
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
    var rows = H.bills.map(function (b, i) { var paid = billPaid(state.month, i); return "<tr><td>" + esc(b.name) + "</td><td>Due " + b.due + '</td><td class="num">' + fmt(b.amount) + '</td><td><span class="pill ' + (paid ? "paid" : "due") + '">' + (paid ? "Paid" : "Due") + '</span></td><td><button class="btn secondary" data-bill="' + i + '" type="button">' + (paid ? "Mark unpaid" : "Mark paid") + "</button></td></tr>"; }).join("");
    var dueTotal = H.bills.filter(function (b, i) { return !billPaid(state.month, i); }).reduce(function (a, b) { return a + b.amount; }, 0);
    var intro = isProjected(state.month)
      ? "This month has not happened yet, so every bill starts out due. These are the same standing bills that build the month\u2019s projection — tick them off here as they are paid and the amount still due updates everywhere."
      : "The household\u2019s regular bills for " + monthName(state.month) + ". Toggling a bill updates the amount still due everywhere; each month keeps its own record.";
    return '<section class="panel"><h2>Recurring bills — ' + monthName(state.month) + '</h2><p class="muted">' + intro + '</p><div class="table-wrap"><table><thead><tr><th>Bill</th><th>Due day</th><th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><p><strong>Still due:</strong> ' + fmt(dueTotal) + " · <strong>Paid so far:</strong> " + fmt(H.bills.reduce(function (a, b) { return a + b.amount; }, 0) - dueTotal) + "</p></section>";
  }

  function viewGoals() {
    var cards = H.goals.map(function (g) { var saved = state.goals[g.id], pct = Math.min(100, Math.round(saved / g.target * 100));
      return '<section class="panel"><div class="goal-head"><h2 style="margin:0">' + esc(g.name) + '</h2><span class="muted">' + fmt(saved) + " of " + fmt(g.target) + " (" + pct + "%)</span></div>"
      + '<div class="bar-track" style="margin:12px 0"><div class="bar-fill" style="width:' + pct + "%;background:var(--accent)\"></div></div>"
      + '<p class="muted">' + esc(g.note) + " · " + fmt(g.target - saved) + ' to go</p><div class="form-row"><label>Add contribution $<input type="number" min="1" step="1" value="50" data-goal-amt="' + g.id + '"></label><label>&nbsp;<button class="btn" type="button" data-goal-add="' + g.id + '">Add to goal</button></label></div></section>'; }).join("");
    var totS = H.goals.reduce(function (a, g) { return a + state.goals[g.id]; }, 0), totT = H.goals.reduce(function (a, g) { return a + g.target; }, 0);
    return '<div class="notice">Across all goals the household has saved <strong>' + fmt(totS) + "</strong> of <strong>" + fmt(totT) + "</strong>. Contributions are saved in this browser.</div>" + cards;
  }

  // The month-end review: the kakeibo ritual of sitting down with the book
  // and writing out, in plain words, what the month did — where it held,
  // where it slipped, and what to carry into the next month.
  function reviewPanel(month) {
    var t = totals(month);
    var prevKey = monthKeys[monthKeys.indexOf(month) - 1];
    var prev = prevKey ? totals(prevKey) : null;
    var rate = t.inc ? Math.round(t.bal / t.inc * 100) : 0;
    var headline;
    if (isProjected(month)) headline = "Looking ahead: on the standing pattern, " + monthName(month) + " should end " + fmt(t.bal) + " ahead — a projected savings rate of " + rate + "%. The review below is written from those projected figures and firms up as real entries replace them.";
    else if (rate >= 25) headline = monthName(month) + " was a strong month: the household kept " + fmt(t.bal) + " of what came in, a savings rate of " + rate + "%.";
    else if (rate >= 10) headline = monthName(month) + " was a steady month: " + fmt(t.bal) + " left over, a savings rate of " + rate + "%.";
    else if (rate >= 0) headline = monthName(month) + " was a tight month: only " + fmt(t.bal) + " left over, a savings rate of " + rate + "%.";
    else headline = monthName(month) + " ran over: spending passed income by " + fmt(-t.bal) + ". The categories below are where it went.";
    var notes = [];
    Object.keys(state.budgets).forEach(function (id) {
      var spent = t.byCat[id] || 0, cap = state.budgets[id];
      if (spent > cap) notes.push({ tone: "bad", text: "<strong>" + catById[id].label + "</strong> ran " + fmt(spent - cap) + " over its " + fmt(cap) + " budget (" + fmt(spent) + " spent). First place to look when trimming next month." });
    });
    if (prev) {
      var mover = null, moverDelta = 0;
      Object.keys(catById).forEach(function (id) { if (id === "income") return; var d = (t.byCat[id] || 0) - (prev.byCat[id] || 0); if (Math.abs(d) > Math.abs(moverDelta)) { moverDelta = d; mover = id; } });
      if (mover && Math.abs(moverDelta) >= 25) notes.push({ tone: moverDelta > 0 ? "warn" : "good", text: "<strong>" + catById[mover].label + "</strong> moved the most against " + monthName(prevKey) + ": " + (moverDelta > 0 ? "up " : "down ") + fmt(Math.abs(moverDelta)) + " to " + fmt(t.byCat[mover] || 0) + "." });
    }
    var best = null, bestSlack = 0;
    Object.keys(state.budgets).forEach(function (id) { var spent = t.byCat[id] || 0, slack = state.budgets[id] - spent; if (spent > 0 && slack > bestSlack) { bestSlack = slack; best = id; } });
    if (best) notes.push({ tone: "good", text: "<strong>" + catById[best].label + "</strong> was the most disciplined line: " + fmt(t.byCat[best]) + " spent against a " + fmt(state.budgets[best]) + " budget, leaving " + fmt(bestSlack) + " of headroom." });
    if (t.bal > 0) {
      var nearest = null, nearestLeft = Infinity;
      H.goals.forEach(function (g) { var left = g.target - state.goals[g.id]; if (left > 0 && left < nearestLeft) { nearestLeft = left; nearest = g; } });
      if (nearest) notes.push({ tone: "good", text: "<strong>Suggested transfer:</strong> move the " + fmt(t.bal) + " left over into savings before the new month starts — it would finish <strong>" + esc(nearest.name) + "</strong> (" + fmt(nearestLeft) + " to go) " + (t.bal >= nearestLeft ? "in one step." : "and leave " + fmt(nearestLeft - t.bal) + " still to find.") });
    }
    var items = notes.map(function (n) { return '<li class="verdict ' + n.tone + '">' + n.text + "</li>"; }).join("");
    return '<section class="panel review"><h2>Month-end review — ' + monthName(month) + (isProjected(month) ? " (projected)" : "") + '</h2><p class="review-head">' + headline + '</p><ul class="verdicts">' + items + "</ul></section>";
  }

  function viewReports() {
    var monthRows = monthKeys.map(function (k) { var t = totals(k); return "<tr><td>" + monthName(k) + (isProjected(k) ? ' <span class="muted">(proj.)</span>' : "") + '</td><td class="num pos">' + fmt(t.inc) + '</td><td class="num neg">' + fmt(t.exp) + '</td><td class="num">' + fmt(t.bal) + '</td><td class="num">' + (t.inc ? Math.round(t.bal / t.inc * 100) : 0) + "%</td></tr>"; }).join("");
    var t = totals(state.month);
    var catRows = Object.keys(t.byCat).sort(function (a, b) { return t.byCat[b] - t.byCat[a]; }).map(function (id) { var cap = state.budgets[id]; return "<tr><td>" + catById[id].label + '</td><td class="num">' + fmt(t.byCat[id]) + '</td><td class="num">' + Math.round(t.byCat[id] / t.exp * 100) + "%</td><td class=\"num\">" + (cap ? fmt(cap) : "—") + '</td><td class="num">' + (cap ? (t.byCat[id] > cap ? '<span class="over">Over by ' + fmt(t.byCat[id] - cap) + "</span>" : "Within budget") : "—") + "</td></tr>"; }).join("");
    return reviewPanel(state.month)
      + '<section class="panel"><h2>Month by month</h2><div class="table-wrap"><table><thead><tr><th>Month</th><th class="num">Income</th><th class="num">Spending</th><th class="num">Left over</th><th class="num">Savings rate</th></tr></thead><tbody>' + monthRows + '</tbody></table></div></section>'
      + '<section class="panel"><h2>Category report — ' + monthName(state.month) + '</h2><div class="table-wrap"><table><thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Budget</th><th class="num">Verdict</th></tr></thead><tbody>' + catRows + '</tbody></table></div><p class="muted">Household rule from the kakeibo tradition: review every category at month\u2019s end, move what is left over into savings goals before the new month starts.</p></section>';
  }

  // The summary strip under the header: the selected month at a glance,
  // whichever section is open — totals, savings rate, bills still due, and
  // a sparkline of how the month's spending accumulated day by day.
  function renderStrip() {
    var t = totals(state.month);
    var rate = t.inc ? Math.round(t.bal / t.inc * 100) : 0;
    var due = H.bills.filter(function (b, i) { return !billPaid(state.month, i); }).reduce(function (a, b) { return a + b.amount; }, 0);
    el("strip").innerHTML =
      '<span class="strip-item"><em>Income</em><strong class="pos">' + fmt(t.inc) + "</strong></span>"
      + '<span class="strip-item"><em>Spending</em><strong class="neg">' + fmt(t.exp) + "</strong></span>"
      + '<span class="strip-item"><em>Left over</em><strong>' + fmt(t.bal) + "</strong></span>"
      + '<span class="strip-item"><em>Savings rate</em><strong>' + rate + "%</strong></span>"
      + '<span class="strip-item"><em>Bills due</em><strong>' + fmt(due) + "</strong></span>"
      + '<span class="strip-spark"><em>Spending pace</em>' + sparkSVG(state.month) + "</span>"
      + (isProjected(state.month) ? '<span class="strip-tag">Projected month</span>' : "");
  }

  var views = { overview: viewOverview, transactions: viewTransactions, budgets: viewBudgets, bills: viewBills, goals: viewGoals, reports: viewReports };
  function route() {
    var key = (location.hash || "#/").replace("#/", "") || "overview"; if (!views[key]) key = "overview";
    document.querySelectorAll("[data-nav]").forEach(function (a) { a.classList.toggle("active", a.dataset.nav === key); });
    el("monthLabel").textContent = monthName(state.month);
    renderStrip();
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
  function wireBills() { document.querySelectorAll("[data-bill]").forEach(function (b) { b.addEventListener("click", function () { var i = +b.dataset.bill; state.billsPaid[state.month + ":" + i] = !billPaid(state.month, i); persist(); route(); }); }); }
  function wireGoals() { document.querySelectorAll("[data-goal-add]").forEach(function (b) { b.addEventListener("click", function () { var id = b.dataset.goalAdd; var inp = document.querySelector('[data-goal-amt="' + id + '"]'); var v = parseFloat(inp.value); if (!isNaN(v) && v > 0) { state.goals[id] = Math.min(state.goals[id] + v, H.goals.filter(function (g) { return g.id === id; })[0].target); persist(); route(); } }); }); }
  el("prevMonth").addEventListener("click", function () { var i = monthKeys.indexOf(state.month); if (i > 0) { state.month = monthKeys[i - 1]; route(); } });
  el("nextMonth").addEventListener("click", function () { var i = monthKeys.indexOf(state.month); if (i < monthKeys.length - 1) { state.month = monthKeys[i + 1]; route(); } });
  el("footHousehold").textContent = H.householdName + " (" + H.members.join(", ") + ")";
  window.addEventListener("hashchange", route);
  route();
})();
