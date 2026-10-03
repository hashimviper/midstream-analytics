if (!window.Plotly || !window.jQuery || !$.fn.DataTable) {
  document.getElementById("err").style.display = "block";
}
// ---------- Data: 520 batches (244 flagged anomalies) generated deterministically to match dashboard totals ----------
let sd = 7;
const rnd = () => {
  sd |= 0;
  sd = (sd + 0x6d2b79f5) | 0;
  let t = Math.imul(sd ^ (sd >>> 15), 1 | sd);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const NODES = [
  {
    n: "Habshan Complex",
    p: ["Murban Crude", "Condensate"],
    w: 0.42,
    g: 32.5e6,
  },
  { n: "Bu Hasa", p: ["Upper Zakum Crude"], w: 0.2, g: 15.2e6 },
  { n: "Das Island", p: ["Das Crude"], w: 0.19, g: 14.3e6 },
  { n: "Asab Central", p: ["Murban Crude"], w: 0.19, g: 14.0e6 },
];
const DEST = [
  "Ruwais Refinery",
  "Fujairah Terminal",
  "Jebel Dhanna",
  "Das Island Export",
];
const COL = {
  "Murban Crude": "#0B2545",
  Condensate: "#00A8E8",
  "Upper Zakum Crude": "#E63946",
  "Das Crude": "#1D4E89",
};
let D = [];
for (let i = 0; i < 520; i++) {
  let r = rnd(),
    a = 0,
    nd = NODES[3];
  if (i < 4) nd = NODES[i];
  else
    for (const x of NODES) {
      a += x.w;
      if (r < a) {
        nd = x;
        break;
      }
    }
  D.push({
    id: "BATCH-" + (1001 + i),
    prod: nd.p[Math.floor(rnd() * nd.p.length)],
    node: nd.n,
    dest: DEST[Math.floor(rnd() * 4)],
    loss: 120 + rnd() * 1630,
    psi: 850 + rnd() * 350,
    co2: 12.5 + rnd() * 32.5,
    gross: 0.6 + rnd() * 0.8,
    _g: nd.g,
  });
}
const norm = (k, t) => {
  const s = D.reduce((a, b) => a + b[k], 0);
  D.forEach((b) => (b[k] = (b[k] * t) / s));
};
NODES.forEach((nd) => {
  const rows = D.filter((b) => b.node === nd.n),
    s = rows.reduce((a, b) => a + b.gross, 0);
  rows.forEach((b) => (b.gross = (b.gross / s) * nd.g));
});
norm("gross", 75.96e6);
norm("loss", 346445.68);
norm("co2", 14590);
const thr = [...D].map((b) => b.loss).sort((a, b) => b - a)[243];
D.forEach((b) => (b.anom = b.loss >= thr));
D.forEach((b) => {
  b.loss = +b.loss.toFixed(2);
  b.psi = Math.round(b.psi);
  b.co2 = +b.co2.toFixed(2);
});

// ---------- Helpers ----------
const big = (v) =>
  v >= 1e6
    ? (v / 1e6).toFixed(2) + "M"
    : v >= 1e3
      ? (v / 1e3).toFixed(2) + "K"
      : Math.round(v).toLocaleString();
const sum = (a, k) => a.reduce((s, b) => s + b[k], 0),
  fmt = (v) =>
    v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
const PRODS = ["All", ...Object.keys(COL).sort()];
let sel = "All";
let cur = () => (sel === "All" ? D : D.filter((b) => b.prod === sel));
const cfg = { responsive: true, displaylogo: false, displayModeBar: false },
  F = "Segoe UI,system-ui,sans-serif";

// ---------- Tabs ----------
document.getElementById("tabs").onclick = (e) => {
  const v = e.target.dataset.v;
  if (!v) return;
  document
    .querySelectorAll(".tabs button")
    .forEach((b) => b.classList.toggle("on", b === e.target));
  document
    .querySelectorAll(".view")
    .forEach((s) => s.classList.toggle("on", s.id === v));
  setTimeout(() => {
    ["tree", "bars", "scatter"].forEach((i) => Plotly.Plots.resize(i));
    if (v === "v2") tbl.columns.adjust();
  }, 30);
};

// ---------- Slicer ----------
document.getElementById("slicer").innerHTML = PRODS.map(
  (p) =>
    `<label><input type="radio" name="p" value="${p}" ${p === "All" ? "checked" : ""}>${p}</label>`,
).join("");
document.getElementById("slicer").onchange = (e) => {
  sel = e.target.value;
  render();
};

// ---------- Tab 1 ----------
let nodeSel = null;
const cur0 = cur;
cur = () => {
  let d = cur0();
  return nodeSel ? d.filter((b) => b.node === nodeSel) : d;
};
function setNode(n) {
  nodeSel = n === nodeSel ? null : n;
  render();
}
function overview() {
  const d = cur(),
    g = sum(d, "gross"),
    l = sum(d, "loss"),
    c = sum(d, "co2");
  const k = (t, v) =>
    `<div class="col-6 col-md-4 col-xl-2 col-xxl"><div class="cardx kpi"><div class="l">${t}</div><div class="v">${v}</div></div></div>`;
  document.getElementById("kpis").innerHTML =
    k("Total Anomalies", d.filter((b) => b.anom).length) +
    k("Total Gross BBL", big(g)) +
    k("Total Loss BBL", big(l)) +
    k("Loss %", ((l / g) * 100).toFixed(2) + "%") +
    `<div class="col-12 col-md-8 col-xl-3"><div class="cardx kpi"><div class="l">Total CO2e Tons</div><div id="gauge" style="height:130px"></div></div></div>`;
  Plotly.react(
    "gauge",
    [
      {
        type: "indicator",
        mode: "gauge+number",
        value: c,
        number: {
          valueformat: ",.0f",
          font: { size: 22, color: "#0B2545" },
          suffix: " t",
        },
        gauge: {
          axis: {
            range: [0, 29170],
            tickfont: { size: 9 },
            tickvals: [0, 14585, 29170],
            ticktext: ["0", "14.6K", "29.2K"],
          },
          bar: { color: "#0B2545" },
          bgcolor: "#C8C8C8",
          borderwidth: 0,
        },
      },
    ],
    {
      margin: { t: 28, b: 4, l: 30, r: 30 },
      height: 130,
      paper_bgcolor: "rgba(0,0,0,0)",
    },
    cfg,
  );
  // treemap
  const ids = [""],
    lab = [""],
    par = [""],
    val = [0],
    cl = ["#fff"];
  const pr = [...new Set(d.map((b) => b.prod))];
  pr.forEach((p) => {
    ids.push(p);
    lab.push(p);
    par.push("");
    val.push(0);
    cl.push(COL[p]);
    [...new Set(d.filter((b) => b.prod === p).map((b) => b.node))].forEach(
      (n) => {
        ids.push(p + "|" + n);
        lab.push(n);
        par.push(p);
        val.push(
          sum(
            d.filter((b) => b.prod === p && b.node === n),
            "loss",
          ),
        );
        cl.push(COL[p]);
      },
    );
  });
  Plotly.react(
    "tree",
    [
      {
        type: "treemap",
        ids: ids.slice(1),
        labels: lab.slice(1),
        parents: par.slice(1),
        values: val.slice(1),
        marker: { colors: cl.slice(1) },
        branchvalues: "remainder",
        textfont: { color: "#fff", family: F },
        texttemplate: "%{label}<br>%{value:,.0f} BBL",
        hovertemplate: "%{label}<br>%{value:,.2f} BBL<extra></extra>",
      },
    ],
    { margin: { t: 0, b: 0, l: 0, r: 0 }, paper_bgcolor: "rgba(0,0,0,0)" },
    cfg,
  );
  // bars
  const nn = NODES.map((x) => x.n),
    G = nn.map((n) =>
      sum(
        d.filter((b) => b.node === n),
        "gross",
      ),
    ),
    L = nn.map((n) =>
      sum(
        d.filter((b) => b.node === n),
        "loss",
      ),
    );
  const bp = Plotly.react(
    "bars",
    [
      {
        type: "bar",
        name: "Total Gross BBL",
        x: nn,
        y: G,
        marker: { color: "#0B2545" },
        offsetgroup: 1,
        hovertemplate: "%{y:,.0f} BBL<extra>Gross</extra>",
      },
      {
        type: "bar",
        name: "Total Loss BBL",
        x: nn,
        y: L,
        yaxis: "y2",
        marker: { color: "#00A8E8" },
        offsetgroup: 2,
        hovertemplate: "%{y:,.0f} BBL<extra>Loss</extra>",
      },
    ],
    {
      barmode: "group",
      margin: { t: 20, b: 40, l: 65, r: 65 },
      font: { family: F, size: 11 },
      legend: { orientation: "h", y: -0.18 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      yaxis: {
        title: "Gross BBL",
        gridcolor: "#EEF1F5",
        tickformat: ".2s",
        range: [0, Math.max(...G, 1) * 1.12],
      },
      yaxis2: {
        title: "Loss BBL",
        overlaying: "y",
        side: "right",
        showgrid: false,
        tickformat: ".2s",
        range: [0, Math.max(...L, 1) * 1.12],
      },
    },
    cfg,
  );
}

document.addEventListener("DOMContentLoaded", () => {});
function wire() {
  const b = document.getElementById("bars"),
    t = document.getElementById("tree"),
    sc = document.getElementById("scatter");
  if (b.removeAllListeners) {
    b.removeAllListeners("plotly_click");
    t.removeAllListeners("plotly_click");
    sc.removeAllListeners("plotly_click");
  }
  b.on("plotly_click", (e) => setNode(e.points[0].x));
  t.on("plotly_click", (e) => {
    const i = e.points[0].id || "";
    if (i.includes("|")) setNode(i.split("|")[1]);
  });
  sc.on("plotly_click", (e) => {
    const id = e.points[0].customdata[0];
    tbl.search(id).draw();
    document.getElementById("tbl").scrollIntoView({ behavior: "smooth" });
  });
}
// ---------- Tab 2 ----------
let tbl;
const maxL = Math.max(...D.map((b) => b.loss));
function telemetry() {
  const d = cur();
  document.getElementById("flt").textContent =
    sel + (nodeSel ? " / " + nodeSel : "");
  Plotly.react(
    "scatter",
    Object.keys(COL)
      .filter((p) => d.some((b) => b.prod === p))
      .map((p) => {
        const r = d.filter((b) => b.prod === p);
        return {
          type: "scatter",
          mode: "markers",
          name: p,
          x: r.map((b) => b.psi),
          y: r.map((b) => b.co2),
          marker: {
            color: COL[p],
            size: 9,
            opacity: 0.85,
            line: { color: "#fff", width: 0.5 },
          },
          customdata: r.map((b) => [b.id, b.node, b.dest]),
          hovertemplate:
            "<b>%{customdata[0]}</b><br>Source: %{customdata[1]}<br>Destination: %{customdata[2]}<br>Pressure: %{x:,} psi<br>CO2e: %{y:.2f} t<extra>" +
            p +
            "</extra>",
        };
      }),
    {
      margin: { t: 10, b: 50, l: 55, r: 15 },
      font: { family: F, size: 11 },
      hovermode: "closest",
      xaxis: { title: "pipeline_pressure_psi", gridcolor: "#EEF1F5" },
      yaxis: { title: "co2e_emissions_tons", gridcolor: "#EEF1F5" },
      shapes: [
        {
          type: "line",
          x0: 1150,
          x1: 1150,
          yref: "paper",
          y0: 0,
          y1: 1,
          line: { color: "#C0392B", dash: "dash", width: 1.5 },
        },
      ],
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      legend: { orientation: "h", y: -0.2 },
    },
    cfg,
  );
  tbl.clear().rows.add(d).draw();
  wire();
}
$(function () {
  tbl = $("#tbl").DataTable({
    data: [],
    pageLength: 15,
    lengthMenu: [10, 15, 25, 50, 100],
    order: [[4, "desc"]],
    columns: [
      { data: "id" },
      { data: "prod" },
      { data: "node" },
      { data: "dest" },
      {
        data: "loss",
        render: (v, t) =>
          t === "display"
            ? `<div class="db"><i style="width:${(v / maxL) * 100}%"></i>${fmt(v)}</div>`
            : v,
      },
      { data: "co2", render: (v, t) => (t === "display" ? fmt(v) : v) },
      {
        data: "psi",
        render: (v, t) => (t === "display" ? v.toLocaleString() : v),
      },
    ],
    drawCallback: function () {
      document.getElementById("cnt").textContent =
        this.api().rows({ search: "applied" }).count() +
        " of " +
        D.length +
        " batches shown";
    },
    createdRow: (row, r) => {
      if (r.psi > 1150) {
        $(row).addClass("hi-row");
        $("td:eq(6)", row).addClass("hi");
        $("td:eq(0)", row).addClass("hi");
      }
    },
  });
  render();
});

// ---------- Tab 3 ----------
const REC = [
  [
    "Critical",
    "Pressure spikes >1,150 psi at Asab Central",
    "Install pressure-relief controls and re-seat/upgrade pump and valve seals; add alarm at 1,100 psi",
    "Pipeline Integrity",
    "7 days",
  ],
  [
    "Critical",
    "Vapor venting during pressure excursions",
    "Route vents to flare/vapor-recovery unit and add continuous emissions monitoring",
    "HSE & Sustainability",
    "14 days",
  ],
  [
    "High",
    "Condensate custody-transfer metering drift",
    "Recalibrate Habshan meters, proof against master meter, set quarterly drift tolerance",
    "Metering & Custody Transfer",
    "30 days",
  ],
  [
    "High",
    "Highest-loss batches concentrated at Habshan Complex",
    "Run mass-balance root-cause review on the top 10 loss batches",
    "Mass-Balance Team",
    "30 days",
  ],
  [
    "Medium",
    "Anomalies detected only in retrospective review",
    "Stream telemetry to Power BI with threshold alerts for pressure, loss % and CO2e",
    "Data & Analytics",
    "60 days",
  ],
  [
    "Medium",
    "Inconsistent loss tolerance across nodes",
    "Standardise loss-% limits per product and node in the operating procedure",
    "Operations Excellence",
    "90 days",
  ],
];
let pf = "All";
function recs() {
  const q = document.getElementById("rs").value.toLowerCase();
  document.getElementById("rb").innerHTML =
    REC.filter(
      (r) =>
        (pf === "All" || r[0] === pf) && r.join(" ").toLowerCase().includes(q),
    )
      .map(
        (r) =>
          `<tr><td><span class="pr ${r[0]}">${r[0]}</span></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="5" class="text-muted">No recommendations match. Clear the search or choose another priority.</td></tr>';
}
document.getElementById("chips").innerHTML = [
  "All",
  "Critical",
  "High",
  "Medium",
]
  .map(
    (p) =>
      `<button class="chip ${p === "All" ? "on" : ""}" data-p="${p}">${p}</button>`,
  )
  .join("");
document.getElementById("chips").onclick = (e) => {
  if (!e.target.dataset.p) return;
  pf = e.target.dataset.p;
  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.toggle("on", c === e.target));
  recs();
};
document.getElementById("rs").oninput = recs;
function exportCSV() {
  const rows = tbl.rows({ search: "applied" }).data().toArray(),
    h = ["id", "prod", "node", "dest", "loss", "co2", "psi"];
  const csv = [h.join(",")]
      .concat(rows.map((r) => h.map((k) => r[k]).join(",")))
      .join("\n"),
    a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "adnoc_batch_audit_log.csv";
  a.click();
}
function problems() {
  const A = D.filter((b) => b.node === "Asab Central"),
    sp = A.filter((b) => b.psi > 1150),
    all = D.filter((b) => b.psi > 1150);
  const C = D.filter((b) => b.prod === "Condensate"),
    lp = C.map((b) => (b.loss / b.gross) * 100),
    m = lp.reduce((a, b) => a + b, 0) / lp.length,
    sdv = Math.sqrt(lp.reduce((a, b) => a + (b - m) ** 2, 0) / lp.length);
  const fl = (D.reduce((a, b) => a + b.loss, 0) / sum(D, "gross")) * 100;
  const st = (t) => `<span class="st">${t}</span>`;
  document.getElementById("ps1").innerHTML =
    `<p>Pressure excursions above 1,150 psi at Asab Central stress pump and valve seals. Displaced vapor escapes through degraded seals, causing volumetric leakage and carbon venting that the mass balance records as loss.</p>
${st(`<b>${sp.length}</b> of ${A.length} Asab Central batches above 1,150 psi`)}${st(`<b>${fmt(sum(sp, "loss"))}</b> BBL lost in those batches`)}${st(`<b>${fmt(sum(sp, "co2"))}</b> t CO2e`)}${st(`<b>${all.length}</b> spikes network-wide`)}`;
  document.getElementById("ps2").innerHTML =
    `<p>Condensate streams show wide batch-to-batch loss percentages at custody-transfer points. A spread this wide points to meter drift or calibration gaps rather than true physical loss.</p>
${st(`Mean loss <b>${m.toFixed(2)}%</b> vs fleet <b>${fl.toFixed(2)}%</b>`)}${st(`Std. deviation <b>${sdv.toFixed(2)} pts</b>`)}${st(`Range <b>${Math.min(...lp).toFixed(2)}%</b> to <b>${Math.max(...lp).toFixed(2)}%</b>`)}${st(`<b>${C.length}</b> condensate batches`)}`;
}
function render() {
  overview();
  telemetry();
  const f = document.getElementById("fchip");
  f.innerHTML =
    "Filters: " +
    sel +
    (nodeSel
      ? ` <span class="pill" onclick="setNode(nodeSel)">${nodeSel} &#10005;</span>`
      : "") +
    " &nbsp;<a href='#' style='color:#00A8E8' onclick='resetAll();return false'>Reset all</a>";
}
function resetAll() {
  sel = "All";
  nodeSel = null;
  document.querySelector("#slicer input[value=All]").checked = true;
  render();
}
problems();
recs();
