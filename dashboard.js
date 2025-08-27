/* Dashboard logic with filters, charts, callouts, and AI summaries */
(function(){
  const CANDIDATES = {
    date:    [/date/i, /order.?date/i, /invoice.?date/i],
    product: [/product/i, /item/i, /sku/i, /flavor/i],
    region:  [/region/i, /country/i, /state/i, /market/i],
    location:[/location/i, /city/i, /market/i, /site/i],
    channel: [/channel/i, /source/i, /segment/i],
    salesrep: [/sales.?rep/i, /representative/i, /agent/i, /seller/i],
    qty:     [/qty/i, /quantity/i, /units?/i, /pcs?/i],
    price:   [/unit.?price/i, /price/i],
    revenue: [/revenue/i, /sales/i, /amount/i, /total/i, /net/i]
  };

  function inferColumns(headers){
    const map = {};
    function findMatch(key){
      for(const rx of CANDIDATES[key]){
        const idx = headers.findIndex(h => rx.test(h));
        if(idx !== -1) return headers[idx];
      }
      return null;
    }
    for(const key of Object.keys(CANDIDATES)){
      map[key] = findMatch(key);
    }
    return map;
  }

  function parseNumber(val){
    if(val === null || val === undefined) return 0;
    if(typeof val === "number") return val;
    const clean = String(val).replace(/[$,]/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  function toYMD(d){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  // State
  let raw = [];
  let columns = {};
  let charts = {};
  let products = new Set();
  let regions = new Set();
  let locations = new Set();

  // Elements
  const els = {
    kpiRevenue: document.getElementById("kpiRevenue"),
    kpiUnits:   document.getElementById("kpiUnits"),
    kpiAOV:     document.getElementById("kpiAOV"),
    kpiOrders:  document.getElementById("kpiOrders"),
    productSel: document.getElementById("productFilter"),
    regionSel:  document.getElementById("regionFilter"),
    locationSel:document.getElementById("locationFilter"),
    fromDate:   document.getElementById("fromDate"),
    toDate:     document.getElementById("toDate"),
    fileInput:  document.getElementById("fileInput"),
    loadLocal:  document.getElementById("loadLocal"),
    rangeFrom:  document.getElementById("rangeFrom"),
    rangeTo:    document.getElementById("rangeTo"),
    dateSlider: document.getElementById("dateSlider"),
  };

  function buildFilters(){
    els.productSel.innerHTML = `<option value="">All</option>`;
    els.regionSel.innerHTML = `<option value="">All</option>`;
    els.locationSel.innerHTML = `<option value="">All</option>`;

    [...products].sort().forEach(p => {
      const opt = document.createElement("option"); opt.value = p; opt.textContent = p;
      els.productSel.appendChild(opt);
    });
    [...regions].sort().forEach(r => {
      const opt = document.createElement("option"); opt.value = r; opt.textContent = r;
      els.regionSel.appendChild(opt);
    });
    [...locations].sort().forEach(l => {
      const opt = document.createElement("option"); opt.value = l; opt.textContent = l;
      els.locationSel.appendChild(opt);
    });

    const dates = raw.map(r => new Date(r.__date)).filter(d => !isNaN(d));
    if(dates.length){
      const min = new Date(Math.min(...dates));
      const max = new Date(Math.max(...dates));
      els.fromDate.value = toYMD(min);
      els.toDate.value   = toYMD(max);
      // Date slider
      if(els.dateSlider && typeof noUiSlider !== "undefined"){
        if(els.dateSlider.noUiSlider){ els.dateSlider.noUiSlider.destroy(); }
        const minT = min.getTime();
        const maxT = max.getTime();
        noUiSlider.create(els.dateSlider, {
          start: [minT, maxT],
          range: { min: minT, max: maxT },
          connect: true,
          step: 24*60*60*1000,
          format: { to: v => Math.round(v), from: v => Number(v) }
        });
        const upd = (vals)=>{
          const [a,b] = vals.map(v=> new Date(parseInt(v,10)));
          els.rangeFrom.textContent = toYMD(a);
          els.rangeTo.textContent   = toYMD(b);
          els.fromDate.value = toYMD(a);
          els.toDate.value   = toYMD(b);
          refresh();
        };
        els.dateSlider.noUiSlider.on("update", upd);
        upd([minT, maxT]);
      }
    }
  }

  function applyFilters(){
    const pf = els.productSel.value;
    const rf = els.regionSel.value;
    const lf = els.locationSel.value;
    const from = els.fromDate.value ? new Date(els.fromDate.value) : null;
    const to   = els.toDate.value ? new Date(els.toDate.value) : null;

    return raw.filter(r => {
      if(pf && r.__product !== pf) return false;
      if(rf && r.__region !== rf) return false;
      if(lf && r.__location !== lf) return false;
      const d = new Date(r.__date);
      if(from && d < from) return false;
      if(to && d > to) return false;
      return true;
    });
  }

  function k(n){ return n.toLocaleString(undefined, {maximumFractionDigits:0}); }
  function money(n){ return n.toLocaleString(undefined, {style:"currency", currency:"USD", maximumFractionDigits:0}); }

  function updateKPIs(data){
    const revenue = data.reduce((s,r)=> s + (r.__revenue || (r.__price*r.__qty)), 0);
    const units   = data.reduce((s,r)=> s + (r.__qty || 0), 0);
    const orders  = data.length;
    const aov     = orders ? revenue / orders : 0;
    const revPerBox = units ? revenue / units : 0;

    els.kpiRevenue.textContent = money(revenue);
    els.kpiUnits.textContent   = k(units);
    els.kpiOrders.textContent  = k(orders);
    els.kpiAOV.textContent     = money(aov);

    // Also compute callouts here or in updateCallouts
  }

  function groupBy(arr, keyFn){
    const m = new Map();
    for(const row of arr){
      const key = keyFn(row);
      m.set(key, (m.get(key)||[]).concat([row]));
    }
    return m;
  }

  function ensureChart(id, type, data, options){
    if(charts[id]){ charts[id].destroy(); }
    const ctx = document.getElementById(id).getContext("2d");
    charts[id] = new Chart(ctx, { type, data, options });
  }

  function updateCharts(data){
    // --- NEW: Weekday chart ---
    const weekdayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const weekdayTotals = [0,0,0,0,0,0,0];
    data.forEach(r => { const d=new Date(r.__date); if(!isNaN(d)) { const w=d.getDay(); const rev=(r.__revenue || r.__price*r.__qty)||0; weekdayTotals[w]+=rev; }});
    ensureChart("barWeekday","bar",{ labels: weekdayNames, datasets:[{ label:"Revenue", data: weekdayTotals }] }, {responsive:true, maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return "Total: "+ v.toLocaleString(undefined,{style:"currency",currency:"USD"}); }}} }});

    // --- NEW: Monthly Seasonality ---
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthTotals = Array(12).fill(0);
    data.forEach(r => { const d=new Date(r.__date); if(!isNaN(d)) { const m=d.getMonth(); const rev=(r.__revenue || r.__price*r.__qty)||0; monthTotals[m]+=rev; }});
    ensureChart("lineMonthly","line",{ labels: monthNames, datasets:[{ label:"Revenue", data: monthTotals }] }, {responsive:true, maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return "Total: "+ v.toLocaleString(undefined,{style:"currency",currency:"USD"}); }}} }});

    // --- NEW: Cumulative Revenue ---
    const cumLabels = [...byDate.keys()].sort();
    let run=0; const cumSeries = cumLabels.map(l=> { run += byDate.get(l).reduce((s,r)=> s + (r.__revenue || r.__price*r.__qty), 0); return run; });
    ensureChart("lineCumulative","line",{ labels: cumLabels, datasets:[{ label:"Cumulative Revenue", data: cumSeries }] }, {responsive:true, maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return (ctx.dataset.label? ctx.dataset.label+': ': '') + v.toLocaleString(undefined,{style:"currency",currency:"USD"}); }}} }});

    // --- NEW: Top 5 Sales Reps ---
    const byRep = groupBy(data, r => r.__rep||"(unknown)");
    const reps = [...byRep.keys()];
    const repRev = reps.map(rep => byRep.get(rep).reduce((s,r)=> s + (r.__revenue || r.__price*r.__qty), 0));
    const repPairs = reps.map((p,i)=>({p, v:repRev[i]})).sort((a,b)=>b.v-a.v).slice(0,5);
    ensureChart("barReps","bar",{ labels: repPairs.map(x=>x.p), datasets:[{ label:"Revenue", data: repPairs.map(x=>x.v) }] }, {responsive:true, indexAxis:"y", maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return "Total: "+ v.toLocaleString(undefined,{style:"currency",currency:"USD"}); }}} }});

    // Revenue over time (by day)
    const byDate = groupBy(data, r => toYMD(new Date(r.__date)));
    const labels = [...byDate.keys()].sort();
    const series = labels.map(l => byDate.get(l).reduce((s,r)=> s + (r.__revenue || r.__price*r.__qty), 0));

    ensureChart("lineRevenue","line",{
      labels,
      datasets:[{ label:"Revenue", data: series }]
    }, {responsive:true, maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return (ctx.dataset.label? ctx.dataset.label+': ': '') + v.toLocaleString(undefined,{style:'currency',currency:'USD'}); }}} }});

    // Top products (by revenue)
    const byProd = groupBy(data, r => r.__product||"(unknown)");
    const prods = [...byProd.keys()];
    const prodRev = prods.map(p => byProd.get(p).reduce((s,r)=> s + (r.__revenue || r.__price*r.__qty), 0));
    const topPairs = prods.map((p,i)=>({p, v:prodRev[i]})).sort((a,b)=>b.v-a.v).slice(0,10);
    ensureChart("barProducts","bar",{
      labels: topPairs.map(x=>x.p),
      datasets:[{ label:"Revenue", data: topPairs.map(x=>x.v) }]
    }, {responsive:true, indexAxis:"y", maintainAspectRatio:false, scales:{x:{ticks:{callback:v=>money(v)}}}, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return (ctx.dataset.label? ctx.dataset.label+': ': '') + v.toLocaleString(undefined,{style:'currency',currency:'USD'}); }}} }});

    // Revenue by region (donut)
    const byReg = groupBy(data, r => r.__region||"(unknown)");
    const regs = [...byReg.keys()];
    const regRev = regs.map(r => byReg.get(r).reduce((s,row)=> s + (row.__revenue || row.__price*row.__qty), 0));
    ensureChart("donutRegion","doughnut",{
      labels: regs, datasets:[{ data: regRev }]
    }, {responsive:true, maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return (ctx.dataset.label? ctx.dataset.label+': ': '') + (typeof v==='number'? v.toLocaleString(undefined,{style:'currency',currency:'USD'}) : ctx.formattedValue); }}} }});

    // Orders by channel
    const byCh = groupBy(data, r => r.__channel||"(unknown)");
    const chs = [...byCh.keys()];
    const chOrd = chs.map(c => byCh.get(c).length);
    ensureChart("barChannel","bar",{
      labels: chs, datasets:[{ label:"Orders", data: chOrd }]
    }, {responsive:true, maintainAspectRatio:false, plugins:{ tooltip:{ callbacks:{ label:(ctx)=>{ const v=ctx.raw; return (ctx.dataset.label? ctx.dataset.label+': ': '') + (typeof v==='number'? v.toLocaleString(undefined,{style:'currency',currency:'USD'}) : ctx.formattedValue); }}} }});
  }

  function updateCallouts(data){
    const byProd = new Map();
    for(const r of data){
      const p = r.__product || "(unknown)";
      const qty = r.__qty || 0;
      const rev = (r.__revenue || (r.__price * r.__qty) || 0);
      const cur = byProd.get(p) || {qty:0, rev:0};
      cur.qty += qty; cur.rev += rev;
      byProd.set(p, cur);
    }
    if(byProd.size === 0){
      document.getElementById("topAvgProduct").textContent = "—";
      document.getElementById("lowAvgProduct").textContent = "—";
      document.getElementById("topRevProduct").textContent = "—";
      document.getElementById("lowRevProduct").textContent = "—";
      document.getElementById("topAvgValue").textContent = "—";
      document.getElementById("lowAvgValue").textContent = "—";
      document.getElementById("topRevValue").textContent = "—";
      document.getElementById("lowRevValue").textContent = "—";
      return;
    }
    const avgCandidates = [];
    const revCandidates = [];
    for(const [p, agg] of byProd.entries()){
      const avg = agg.qty > 0 ? (agg.rev / agg.qty) : null;
      if(avg !== null && isFinite(avg)){
        avgCandidates.push({p, v: avg, qty: agg.qty, rev: agg.rev});
      }
      revCandidates.push({p, v: agg.rev, qty: agg.qty});
    }
    if(avgCandidates.length){
      avgCandidates.sort((a,b)=> b.v - a.v);
      const topA = avgCandidates[0];
      const lowA = avgCandidates[avgCandidates.length - 1];
      document.getElementById("topAvgProduct").textContent = topA.p;
      document.getElementById("topAvgValue").textContent   = (topA.v).toLocaleString(undefined,{style:'currency',currency:'USD'}) + " / box";
      document.getElementById("lowAvgProduct").textContent = lowA.p;
      document.getElementById("lowAvgValue").textContent   = (lowA.v).toLocaleString(undefined,{style:'currency',currency:'USD'}) + " / box";
    }
    if(revCandidates.length){
      revCandidates.sort((a,b)=> b.v - a.v);
      const topR = revCandidates[0];
      const lowR = revCandidates[revCandidates.length - 1];
      document.getElementById("topRevProduct").textContent = topR.p;
      document.getElementById("topRevValue").textContent   = (topR.v).toLocaleString(undefined,{style:'currency',currency:'USD'}) + " total";
      document.getElementById("lowRevProduct").textContent = lowR.p;
      document.getElementById("lowRevValue").textContent   = (lowR.v).toLocaleString(undefined,{style:'currency',currency:'USD'}) + " total";
    }
  }

  function maybeAutoSummary(){
  try{
    const provider = document.getElementById("aiProvider")?.value;
    const auto = document.getElementById("autoSummary")?.checked;
    if(provider === "local" && auto){
      const out = document.getElementById("aiOutput");
      if(out) { out.value = "Updating…"; }
      // Reuse the same generator but avoid double prompts when user is typing
      runAISummary();
    }
  }catch(e){}
}


  function updateRepCallouts(data){
    const byRep = new Map();
    for(const r of data){
      const rep = r.__rep || "(unknown)";
      const rev = (r.__revenue || (r.__price * r.__qty) || 0);
      byRep.set(rep, (byRep.get(rep)||0) + rev);
    }
    if(byRep.size === 0){
      document.getElementById("topRepName").textContent = "—";
      document.getElementById("lowRepName").textContent = "—";
      document.getElementById("topRepValue").textContent = "—";
      document.getElementById("lowRepValue").textContent = "—";
      return;
    }
    const arr = [...byRep.entries()].map(([rep,rev])=>({rep,rev})).sort((a,b)=> b.rev - a.rev);
    const top = arr[0], low = arr[arr.length-1];
    document.getElementById("topRepName").textContent = top.rep;
    document.getElementById("topRepValue").textContent = top.rev.toLocaleString(undefined,{style:'currency',currency:'USD'}) + " total";
    document.getElementById("lowRepName").textContent = low.rep;
    document.getElementById("lowRepValue").textContent = low.rev.toLocaleString(undefined,{style:'currency',currency:'USD'}) + " total";
  }

function refresh(){
    const filtered = applyFilters();
    if(provider === "local"){
      // Build a clean, human-readable summary from computed stats without any external API.
      const data = filtered;
      const revenue = data.reduce((s,r)=> s + (r.__revenue || (r.__price*r.__qty)), 0);
      const units   = data.reduce((s,r)=> s + (r.__qty || 0), 0);
      const orders  = data.length;
      const aov     = orders ? revenue/orders : 0;
      const revPerBox = units ? revenue/units : 0;

      // Identify extremes
      const byProd = new Map();
      data.forEach(r => {
        const p = r.__product || "(unknown)";
        const qty = r.__qty || 0;
        const rev = (r.__revenue || (r.__price*r.__qty) || 0);
        const cur = byProd.get(p) || {qty:0, rev:0};
        cur.qty += qty; cur.rev += rev;
        byProd.set(p, cur);
      });
      const rows = [...byProd.entries()].map(([p,agg]) => ({p, rev:agg.rev, qty:agg.qty, avg: agg.qty? agg.rev/agg.qty : 0}));
      rows.sort((a,b)=> b.rev - a.rev);
      const topRev = rows[0], lowRev = rows[rows.length-1];
      const nz = rows.filter(r=> r.qty>0).sort((a,b)=> b.avg - a.avg);
      const topAvg = nz[0], lowAvg = nz[nz.length-1];

      // Compose a crisp executive paragraph
      const toMoney = n => n.toLocaleString(undefined,{style:"currency", currency:"USD", maximumFractionDigits:0});
      const toUnits = n => n.toLocaleString(undefined,{maximumFractionDigits:0});
      const parts = [];
      parts.push(`Total revenue ${toMoney(revenue)} across ${toUnits(orders)} orders (${toUnits(units)} units). AOV ${toMoney(aov)}, Avg revenue/box ${toMoney(revPerBox)}.`);
      if(topRev && lowRev){
        parts.push(`Top revenue product: ${topRev.p} (${toMoney(topRev.rev)}). Lowest revenue: ${lowRev.p} (${toMoney(lowRev.rev)}).`);
      }
      if(topAvg && lowAvg){
        parts.push(`Highest avg/box: ${topAvg.p} (${toMoney(topAvg.avg)}). Lowest avg/box: ${lowAvg.p} (${toMoney(lowAvg.avg)}).`);
      }
      // Simple recommendation based on spread
      if(topAvg && lowAvg){
        const spread = topAvg.avg - lowAvg.avg;
        if(spread > 10){
          parts.push(`Recommendation: Promote ${topAvg.p} in regions/channels where ${lowAvg.p} underperforms; review price/pack-size on ${lowAvg.p}.`);
        }else{
          parts.push(`Recommendation: Focus on distribution and channel mix to lift overall AOV; no extreme outliers by avg/box.`);
        }
      }else{
        parts.push(`Recommendation: Increase data completeness (units and revenue) to enable product-level optimization.`);
      }
      out.value = parts.join(" ");
      return;
    }

    updateKPIs(filtered);
    updateCharts(filtered);
    updateCallouts(filtered);
    updateRepCallouts(filtered);
  }

  function loadRows(rows){
    raw = []; products.clear(); regions.clear(); locations.clear();
    if(!rows || !rows.length) return;
    const headers = Object.keys(rows[0]);
    columns = inferColumns(headers);
    rows.forEach(r => {
      const obj = {...r};
      obj.__date    = columns.date    ? r[columns.date] : r[headers[0]];
      obj.__product = columns.product ? r[columns.product] : (r.Product||r.Item||"");
      obj.__region  = columns.region  ? r[columns.region] : (r.Region||"");
      obj.__location= columns.location? r[columns.location]: (r.Location||r.City||"");
      obj.__channel = columns.channel ? r[columns.channel] : (r.Channel||"");
      obj.__rep     = columns.salesrep ? r[columns.salesrep] : (r.SalesRep||r.Rep||"");
      obj.__qty     = parseNumber(columns.qty ? r[columns.qty] : (r.Quantity||r.Qty||0));
      obj.__price   = parseNumber(columns.price ? r[columns.price] : (r["Unit Price"]||r.Price||0));
      obj.__revenue = parseNumber(columns.revenue ? r[columns.revenue] : (r.Revenue||r.Sales||0));
      raw.push(obj);
      if(obj.__product) products.add(obj.__product);
      if(obj.__region) regions.add(obj.__region);
      if(obj.__location) locations.add(obj.__location);
    });
    buildFilters();
    refresh();
  }

  // File picker + local sample
  document.getElementById("fileInput").addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: true,
      complete: (res)=> loadRows(res.data)
    });
  });
  document.getElementById("loadLocal").addEventListener("click", async ()=>{
    try{
      const resp = await fetch("data/chocolate_sales.csv");
      if(!resp.ok) throw new Error("Not found");
      const text = await resp.text();
      const parsed = Papa.parse(text, { header:true, dynamicTyping:false, skipEmptyLines:true });
      loadRows(parsed.data);
    }catch(e){
      alert("Sample file not found. Upload the CSV via the file picker or place it at /data/chocolate_sales.csv");
    }
  });
  document.getElementById("productFilter").addEventListener("change", refresh);
  document.getElementById("regionFilter").addEventListener("change", refresh);
  document.getElementById("locationFilter").addEventListener("change", refresh);
  document.getElementById("fromDate").addEventListener("change", refresh);
  document.getElementById("toDate").addEventListener("change", refresh);
  document.getElementById("clearFilters").addEventListener("click", ()=>{
    document.getElementById("productFilter").value = "";
    document.getElementById("regionFilter").value = "";
    document.getElementById("locationFilter").value = "";
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";
    refresh();
  });

  // ---------- AI SUMMARY (HF API or Space) ----------
  function summarizeNumber(n, style){
    if(style === "money") return n.toLocaleString(undefined,{style:"currency",currency:"USD"});
    return n.toLocaleString();
  }
  function buildInsightPrompt(data){
    const revenue = data.reduce((s,r)=> s + (r.__revenue || (r.__price*r.__qty)), 0);
    const units   = data.reduce((s,r)=> s + (r.__qty || 0), 0);
    const orders  = data.length;
    const aov     = orders ? revenue/orders : 0;
    const revPerBox = units ? revenue/units : 0;

    const byProd = new Map();
    data.forEach(r => {
      const p = r.__product || "(unknown)";
      const qty = r.__qty || 0;
      const rev = (r.__revenue || (r.__price*r.__qty) || 0);
      const cur = byProd.get(p) || {qty:0, rev:0};
      cur.qty += qty; cur.rev += rev;
      byProd.set(p, cur);
    });
    const prodRows = [...byProd.entries()].map(([p,agg]) => ({
      product:p,
      totalRevenue: agg.rev,
      totalUnits: agg.qty,
      avgRevPerBox: (agg.qty ? agg.rev/agg.qty : 0)
    }));
    prodRows.sort((a,b)=> b.totalRevenue - a.totalRevenue);
    const topRev = prodRows[0];
    const lowRev = prodRows[prodRows.length-1];
    const nonZero = prodRows.filter(r=> r.totalUnits>0).sort((a,b)=> b.avgRevPerBox - a.avgRevPerBox);
    const topAvg = nonZero[0];
    const lowAvg = nonZero[nonZero.length-1];

    const sketch = {
      totals: { revenue: Math.round(revenue), units: Math.round(units), orders: orders, aov: Math.round(aov) },
      revPerBox: Math.round(revPerBox),
      products: {
        topRevenue: topRev ? {name: topRev.product, revenue: Math.round(topRev.totalRevenue)} : null,
        lowRevenue: lowRev ? {name: lowRev.product, revenue: Math.round(lowRev.totalRevenue)} : null,
        topAvgPerBox: topAvg ? {name: topAvg.product, avg: Math.round(topAvg.avgRevPerBox)} : null,
        lowAvgPerBox: lowAvg ? {name: lowAvg.product, avg: Math.round(lowAvg.avgRevPerBox)} : null
      }
    };
    const prompt = `You are a business analyst. Using the following metrics, write a concise (80-120 words) summary for an executive. State overall performance, call out the top and bottom products by total revenue and by average revenue per box, and recommend one actionable next step.\n` +
      `Data (rounded): ${JSON.stringify(sketch)}\n` +
      `Focus on clarity. Avoid hedging and restating the numbers verbatim; synthesize insights.`;
    return prompt;
  }

  async function runAISummary(){
    const provider = document.getElementById("aiProvider").value;
    const key = document.getElementById("aiKey").value.trim();
    const spaceUrl = (document.getElementById("aiSpaceUrl")?.value || "").trim();
    const out = document.getElementById("aiOutput");
    const filtered = applyFilters();
    if(provider === "local"){
      // Build a clean, human-readable summary from computed stats without any external API.
      const data = filtered;
      const revenue = data.reduce((s,r)=> s + (r.__revenue || (r.__price*r.__qty)), 0);
      const units   = data.reduce((s,r)=> s + (r.__qty || 0), 0);
      const orders  = data.length;
      const aov     = orders ? revenue/orders : 0;
      const revPerBox = units ? revenue/units : 0;

      // Identify extremes
      const byProd = new Map();
      data.forEach(r => {
        const p = r.__product || "(unknown)";
        const qty = r.__qty || 0;
        const rev = (r.__revenue || (r.__price*r.__qty) || 0);
        const cur = byProd.get(p) || {qty:0, rev:0};
        cur.qty += qty; cur.rev += rev;
        byProd.set(p, cur);
      });
      const rows = [...byProd.entries()].map(([p,agg]) => ({p, rev:agg.rev, qty:agg.qty, avg: agg.qty? agg.rev/agg.qty : 0}));
      rows.sort((a,b)=> b.rev - a.rev);
      const topRev = rows[0], lowRev = rows[rows.length-1];
      const nz = rows.filter(r=> r.qty>0).sort((a,b)=> b.avg - a.avg);
      const topAvg = nz[0], lowAvg = nz[nz.length-1];

      // Compose a crisp executive paragraph
      const toMoney = n => n.toLocaleString(undefined,{style:"currency", currency:"USD", maximumFractionDigits:0});
      const toUnits = n => n.toLocaleString(undefined,{maximumFractionDigits:0});
      const parts = [];
      parts.push(`Total revenue ${toMoney(revenue)} across ${toUnits(orders)} orders (${toUnits(units)} units). AOV ${toMoney(aov)}, Avg revenue/box ${toMoney(revPerBox)}.`);
      if(topRev && lowRev){
        parts.push(`Top revenue product: ${topRev.p} (${toMoney(topRev.rev)}). Lowest revenue: ${lowRev.p} (${toMoney(lowRev.rev)}).`);
      }
      if(topAvg && lowAvg){
        parts.push(`Highest avg/box: ${topAvg.p} (${toMoney(topAvg.avg)}). Lowest avg/box: ${lowAvg.p} (${toMoney(lowAvg.avg)}).`);
      }
      // Simple recommendation based on spread
      if(topAvg && lowAvg){
        const spread = topAvg.avg - lowAvg.avg;
        if(spread > 10){
          parts.push(`Recommendation: Promote ${topAvg.p} in regions/channels where ${lowAvg.p} underperforms; review price/pack-size on ${lowAvg.p}.`);
        }else{
          parts.push(`Recommendation: Focus on distribution and channel mix to lift overall AOV; no extreme outliers by avg/box.`);
        }
      }else{
        parts.push(`Recommendation: Increase data completeness (units and revenue) to enable product-level optimization.`);
      }
      out.value = parts.join(" ");
      return;
    }

    const prompt = buildInsightPrompt(filtered);
    out.value = "Generating summary…";

    // Persist preferences locally (so GitHub Pages remembers without exposing in code repo)
    try {
      localStorage.setItem("aiProvider", provider);
      if(key) localStorage.setItem("hfKey", key);
      if(spaceUrl) localStorage.setItem("hfSpaceUrl", spaceUrl);
    } catch (e) {}

    if(provider === "space"){
      if(!spaceUrl){
        out.value = "Enter your public Hugging Face Space URL (e.g., https://huggingface.co/spaces/yourname/summary).";
        return;
      }
      try{
        const resp = await fetch(spaceUrl.replace(/\/+$/,"") + "/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });
        if(!resp.ok){
          const t = await resp.text();
          throw new Error(`Space error (${resp.status}): ${t}`);
        }
        const data = await resp.json();
        out.value = (data?.summary || data?.text || JSON.stringify(data));
        return;
      }catch(e){
        out.value = "Error calling Space: " + (e?.message || String(e));
        return;
      }
    }

    // Default: Hugging Face Inference API (flan-t5-large)
    if(!key){
      out.value = "Please paste your Hugging Face API key (Settings → Tokens).";
      return;
    }
    try{
      const model = "google/flan-t5-large";
      const resp = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 180, temperature: 0.4 } })
      });
      if(!resp.ok){
        const t = await resp.text();
        throw new Error(`HF API error (${resp.status}): ${t}`);
      }
      const data = await resp.json();
      const text = Array.isArray(data) ? (data[0]?.generated_text || "") : (data.generated_text || "");
      const cleaned = text.replace(prompt, "").trim();
      out.value = cleaned || text || "No text generated.";
    }catch(err){
      out.value = "Error: " + (err?.message || String(err));
    }
  }

  // Wire buttons + restore persisted prefs
  const genBtn = document.getElementById("genSummary");
  if(genBtn){ genBtn.addEventListener("click", runAISummary); }
  const copyBtn = document.getElementById("copySummary");
  if(copyBtn){
    copyBtn.addEventListener("click", ()=>{
      const ta = document.getElementById("aiOutput");
      ta.select(); document.execCommand("copy");
    });
  }
  // Restore
  try{
    const p = localStorage.getItem("aiProvider"); if(p) document.getElementById("aiProvider").value = p;
    const k = localStorage.getItem("hfKey"); if(k) document.getElementById("aiKey").value = k;
    const s = localStorage.getItem("hfSpaceUrl"); if(s) document.getElementById("aiSpaceUrl").value = s;
  }catch(e){}

})();