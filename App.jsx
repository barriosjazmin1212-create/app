/**
 * App de comandas y ventas gastronómicas — Highball Bar
 * Archivo único: React 18 + Tailwind CSS 3.
 *
 * REQUISITOS
 * 1) Tailwind CSS 3 instalado en tu proyecto.
 * 2) En tailwind.config.js agregá estos colores:
 *      theme: { extend: { colors: {
 *        olive: "#8F802F", gold: "#E0C94D", pine: "#004530", ink: "#212117",
 *      } } }
 * 3) La tipografía Quicksand se carga sola desde Google Fonts (ver CSS al final).
 *
 * USO:  import App from "./App";  y renderizalo en tu main.jsx.
 *
 * AVISO: los datos viven solo en memoria (al recargar vuelve todo al inicio) y
 * los botones de pago de planes son una demo: no se conecta con Mercado Pago,
 * Stripe ni Paddle, y no se cobra nada.
 */
import { useState } from "react";

/* ───────── Datos y utilidades ───────── */

const ARS = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const USD = new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD" });

// [id, nombre, precio en ARS]
const CATALOG = {
  Bebidas: [
    ["b1", "Café", 2800],
    ["b2", "Cerveza IPA", 4800],
    ["b3", "Gin tonic", 6500],
    ["b4", "Fernet con coca", 5500],
    ["b5", "Highball whisky", 7000],
    ["b6", "Agua mineral", 2000],
  ],
  Comida: [
    ["c1", "Hamburguesa", 9800],
    ["c2", "Medialunas x3", 3600],
    ["c3", "Papas rústicas", 5500],
    ["c4", "Tabla de picada", 14500],
    ["c5", "Empanadas x3", 6000],
  ],
  Postres: [
    ["c6", "Brownie", 4800],
    ["p1", "Flan con dulce de leche", 4200],
    ["p2", "Helado 2 bochas", 3900],
  ],
};

const PRICE = {};
Object.values(CATALOG)
  .flat()
  .forEach(([id, n, p]) => {
    PRICE[id] = { n, p };
  });

const QUICK_NOTES = ["Devolución", "Cambio de plato", "Sin hielo", "Cuenta dividida"];

const INITIAL_TABLES = [
  { id: 1, name: "Mesa 1", seats: 2, status: "ocupada", items: [{ id: "b3", q: 2 }, { id: "c5", q: 1 }], note: "" },
  { id: 2, name: "Mesa 2", seats: 4, status: "libre", items: [], note: "" },
  { id: 3, name: "Mesa 3", seats: 4, status: "por cobrar", items: [{ id: "c1", q: 2 }, { id: "b2", q: 2 }], note: "Cambio: papas sin sal" },
  { id: 4, name: "Mesa 4", seats: 6, status: "libre", items: [], note: "" },
  { id: 5, name: "Barra", seats: 3, status: "ocupada", items: [{ id: "b5", q: 1 }], note: "" },
];

// [id, nombre, precio ARS, precio USD, beneficios]
const PLANS = [
  ["free", "Plan Gratuito", 0, 0, ["Hasta 5 mesas", "1 dispositivo", "Comandas y ventas del turno"]],
  ["pro", "Plan PRO", 45000, 45, ["Mesas ilimitadas", "Multi-dispositivo", "Métricas avanzadas"]],
  ["premium", "Plan Premium", 75000, 75, ["Todo lo de PRO", "Funciones avanzadas", "Soporte prioritario"]],
];
const PLAN_LABEL = { free: "Plan Gratuito", pro: "Plan PRO", premium: "Plan Premium" };
const FREE_TABLE_LIMIT = 5;

const STATUS = {
  libre: { label: "Libre", cls: "border-olive bg-[var(--panel)]" },
  ocupada: { label: "Ocupada", cls: "bg-gold text-ink border-gold" },
  "por cobrar": { label: "Por cobrar", cls: "bg-pine text-white border-gold pulse" },
};
const flat = (cls) => cls.replace("pulse", "");

const tableTotal = (t) => t.items.reduce((s, i) => s + PRICE[i.id].p * i.q, 0);

/* ───────── Componentes chicos ───────── */

function NavButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={
        "w-[68px] h-[68px] rounded-2xl bg-gold text-ink flex flex-col items-center justify-center gap-0.5 shadow-md " +
        (active ? "ring-2 ring-pine ring-offset-2 ring-offset-[var(--bg)]" : "opacity-90 hover:opacity-100")
      }
    >
      <span className="text-2xl font-bold leading-none">{icon}</span>
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

function BigCard({ title, value, onClick }) {
  return (
    <button onClick={onClick} className="kpi card text-left p-6 flex flex-col justify-between">
      <span className="text-lg font-semibold uppercase text-[var(--muted)]">{title}</span>
      <span className="text-5xl font-bold tabular-nums text-[var(--val)]">{value}</span>
    </button>
  );
}

/* ───────── App ───────── */

export default function App() {
  const [cur, setCur] = useState("ARS");
  const [rate, setRate] = useState("1200"); // tipo de cambio referencial ARS por USD
  const [tables, setTables] = useState(INITIAL_TABLES);
  const [sel, setSel] = useState(1);
  const [tab, setTab] = useState("Bebidas");
  const [view, setView] = useState("inicio");
  const [plan, setPlan] = useState("free");
  const [modal, setModal] = useState(false);
  const [sales, setSales] = useState(0);
  const [count, setCount] = useState(0);
  const [log, setLog] = useState([]);
  const [toast, setToast] = useState("");

  const R = Number(rate) > 0 ? Number(rate) : 1;
  const fmt = (v) => (cur === "ARS" ? ARS.format(v) : USD.format(v / R));
  const pro = plan !== "free";
  const t = tables.find((x) => x.id === sel);
  const tt = tableTotal(t);
  const open = tables.filter((x) => x.status !== "libre").length;
  const libres = tables.filter((x) => x.status === "libre").length;
  const go = (v) => () => setView(v);

  const say = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  };

  /* Acciones sobre la mesa seleccionada */
  const upd = (fn) => setTables((ts) => ts.map((x) => (x.id === sel ? fn(x) : x)));

  const addItem = (id) =>
    upd((x) => {
      const found = x.items.find((i) => i.id === id);
      const items = found ? x.items.map((i) => (i.id === id ? { ...i, q: i.q + 1 } : i)) : [...x.items, { id, q: 1 }];
      return { ...x, items, status: "ocupada" };
    });

  const changeQty = (id, d) =>
    upd((x) => {
      const items = x.items.map((i) => (i.id === id ? { ...i, q: i.q + d } : i)).filter((i) => i.q > 0);
      return { ...x, items, status: items.length ? x.status : "libre" };
    });

  const setItemNote = (id, v) => upd((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, note: v } : i)) }));
  const requestBill = () => upd((x) => ({ ...x, status: "por cobrar" }));
  const appendNote = (s) => upd((x) => ({ ...x, note: x.note ? x.note + " · " + s : s }));

  // Tick de pago: cierra la comanda, libera la mesa y suma al acumulador del turno
  const pay = () => {
    const m = tableTotal(t);
    if (!m) return;
    setSales((s) => s + m);
    setCount((c) => c + 1);
    setLog((l) => [
      {
        k: Date.now(),
        n: t.name,
        it: t.items.map((i) => PRICE[i.id].n + " ×" + i.q).join(", "),
        lines: t.items.map((i) => ({ id: i.id, q: i.q })),
        m,
        h: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
        note: t.note,
      },
      ...l,
    ]);
    upd((x) => ({ ...x, items: [], note: "", status: "libre" }));
    say(t.name + " cobrada: " + fmt(m) + " sumados al turno");
  };

  const newTable = () =>
    setTables((ts) => {
      const id = Math.max(...ts.map((x) => x.id)) + 1;
      return [...ts, { id, name: "Mesa " + id, seats: 4, status: "libre", items: [], note: "" }];
    });

  const choosePlan = (id, name) => {
    setPlan(id);
    say(name + " activado (demo)");
  };

  const payLabel = cur === "ARS" ? "Pagar con Mercado Pago" : "Pagar con Stripe / Paddle";

  /* Métricas avanzadas (PRO / Premium) */
  const prod = {};
  const byTable = {};
  log.forEach((r) => {
    byTable[r.n] = (byTable[r.n] || 0) + r.m;
    (r.lines || []).forEach((l) => {
      prod[l.id] = (prod[l.id] || 0) + l.q;
    });
  });
  const top = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tableSales = Object.entries(byTable).sort((a, b) => b[1] - a[1]);

  /* ───── Pantalla: Inicio ───── */
  const Inicio = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[960px] w-full h-full max-h-[520px] min-h-0 content-start">
      <BigCard title="Ventas del turno" value={fmt(sales)} onClick={go("ventas")} />
      <BigCard title="Comandas" value={count + open} onClick={go("comandas")} />
      <BigCard title="Cuentas abiertas" value={open} onClick={go("comandas")} />
      <BigCard title="Mesas disponibles" value={libres + " / " + tables.length} onClick={go("mesas")} />
    </div>
  );

  /* ───── Pantalla: Mesas ───── */
  const Mesas = (
    <section className="card p-4 flex flex-col h-full min-h-0" aria-label="Mapa de mesas">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-xl font-bold mr-auto">Mesas</h2>
        {Object.values(STATUS).map((s) => (
          <span key={s.label} className={"rounded-full border-2 px-3 text-xs font-bold " + flat(s.cls)}>
            {s.label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start flex-1 min-h-0 overflow-y-auto">
        {tables.map((x) => {
          const s = STATUS[x.status];
          return (
            <button
              key={x.id}
              onClick={() => {
                setSel(x.id);
                setView("comandas");
              }}
              className={"rounded-xl border-2 p-3 text-left h-[116px] flex flex-col justify-between " + s.cls}
            >
              <div className="flex justify-between">
                <span className="text-lg font-bold">{x.name}</span>
                <span className="text-xs font-semibold opacity-80">{x.seats} lugares</span>
              </div>
              <div>
                <div className="text-sm font-bold">{s.label}</div>
                <div className="text-base font-bold tabular-nums">{x.items.length ? fmt(tableTotal(x)) : "—"}</div>
              </div>
            </button>
          );
        })}
        {pro ? (
          <button onClick={newTable} className="rounded-xl border-2 border-dashed border-olive h-[116px] font-bold text-[var(--val)]">
            ＋ Nueva mesa
          </button>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-[var(--line)] h-[116px] flex items-center justify-center text-center px-3 text-sm font-semibold text-[var(--muted)]">
            🔒 Mesa 6 disponible en PRO
          </div>
        )}
      </div>
      <div className="mt-3 rounded-xl border-2 border-gold bg-gold/15 p-3 flex flex-wrap items-center gap-3" role="status">
        {pro ? (
          <span className="font-bold">Plan PRO: mesas sin límite ({tables.length} activas)</span>
        ) : (
          <>
            <span className="font-bold mr-auto">
              Límite del Plan Gratuito: {Math.min(tables.length, FREE_TABLE_LIMIT)}/{FREE_TABLE_LIMIT} mesas activas
            </span>
            <button onClick={() => setModal(true)} className="rounded-lg bg-pine text-white font-bold px-4 py-2 hover:bg-[#005c40]">
              Actualizar a PRO ($45.000 ARS / $45 USD al mes)
            </button>
          </>
        )}
      </div>
    </section>
  );

  /* ───── Pantalla: Comandas ───── */
  const Comandas = (
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex gap-2 overflow-x-auto shrink-0 pb-1" role="group" aria-label="Elegir mesa">
        {tables.map((x) => (
          <button
            key={x.id}
            onClick={() => setSel(x.id)}
            aria-pressed={sel === x.id}
            className={
              "rounded-full border-2 px-4 py-1 text-sm font-bold whitespace-nowrap " +
              flat(STATUS[x.status].cls) +
              (sel === x.id ? " ring-2 ring-[#1c8ee0] ring-offset-2 ring-offset-[var(--bg)]" : "")
            }
          >
            {x.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-[1fr_450px] flex-1 min-h-0">
        {/* Catálogo */}
        <section className="card p-4 flex flex-col min-h-0" aria-label="Catálogo">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Catálogo</h2>
            <div role="tablist" className="flex gap-1 rounded-full border-2 border-olive p-0.5 text-sm">
              {Object.keys(CATALOG).map((k) => (
                <button
                  key={k}
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={"px-4 py-1 rounded-full font-bold " + (tab === k ? "bg-pine text-white" : "text-[var(--muted)]")}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 content-start overflow-y-auto">
            {CATALOG[tab].map(([id, n, p]) => (
              <button
                key={id}
                onClick={() => addItem(id)}
                className="rounded-xl border-2 border-[var(--line)] hover:border-gold active:scale-[.98] transition p-3 text-left h-[104px] flex flex-col justify-between bg-[var(--soft)]"
              >
                <span className="font-bold text-lg leading-tight">{n}</span>
                <span className="text-[var(--val)] font-bold tabular-nums">{fmt(p)}</span>
              </button>
            ))}
          </div>
          <p className="mt-auto pt-2 text-xs font-medium text-[var(--muted)]">Tocá un producto para sumarlo a {t.name}.</p>
        </section>

        {/* Comanda activa */}
        <section className="card p-4 flex flex-col min-h-0" aria-label="Comanda activa">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold">Comanda · {t.name}</h2>
            <span
              className={
                "rounded-full border-2 px-2.5 text-xs font-bold " +
                (t.status === "libre" ? "border-olive text-[var(--muted)]" : "border-gold bg-gold/20")
              }
            >
              {STATUS[t.status].label}
            </span>
          </div>

          <ul className="flex-1 min-h-[70px] overflow-y-auto divide-y divide-[var(--line)] pr-1">
            {t.items.length === 0 && (
              <li className="py-4 text-sm text-[var(--muted)] font-medium">Sin ítems. Elegí productos del catálogo.</li>
            )}
            {t.items.map((i) => (
              <li key={i.id} className="py-1.5 flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{PRICE[i.id].n}</div>
                  <input
                    value={i.note || ""}
                    onChange={(e) => setItemNote(i.id, e.target.value)}
                    placeholder="Nota del ítem"
                    aria-label={"Nota de " + PRICE[i.id].n}
                    className="w-full bg-transparent border-b border-[var(--line)] text-xs font-medium py-0.5 text-[var(--muted)] focus:border-olive"
                  />
                </div>
                <button aria-label="Quitar uno" onClick={() => changeQty(i.id, -1)} className="w-7 h-7 rounded-lg border-2 border-olive font-bold">
                  −
                </button>
                <span className="w-5 text-center font-bold tabular-nums">{i.q}</span>
                <button aria-label="Sumar uno" onClick={() => changeQty(i.id, 1)} className="w-7 h-7 rounded-lg border-2 border-olive font-bold">
                  +
                </button>
                <span className="w-[84px] text-right tabular-nums font-bold">{fmt(PRICE[i.id].p * i.q)}</span>
              </li>
            ))}
          </ul>

          <label className="text-xs font-semibold text-[var(--muted)] mt-2" htmlFor="nota">
            Aclaraciones, devolución o cambio
          </label>
          <textarea
            id="nota"
            rows={2}
            value={t.note}
            onChange={(e) => upd((x) => ({ ...x, note: e.target.value }))}
            placeholder="Ej.: devuelve nachos, cambia por papas"
            className="mt-1 w-full rounded-lg border-2 border-[var(--line)] bg-[var(--soft)] p-2 text-sm font-medium resize-none"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_NOTES.map((q) => (
              <button key={q} onClick={() => appendNote(q)} className="rounded-full border-2 border-olive px-2.5 text-xs font-bold hover:bg-gold/30">
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-baseline justify-between mt-3 pt-2 border-t border-[var(--line)]">
            <span className="text-sm font-semibold text-[var(--muted)]">Total</span>
            <span className="text-3xl font-bold tabular-nums text-[var(--val)]">{fmt(tt)}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={requestBill}
              disabled={!tt || t.status === "por cobrar"}
              className="px-3 rounded-xl border-2 border-olive text-sm font-bold disabled:opacity-40"
            >
              Pedir cuenta
            </button>
            <button
              onClick={pay}
              disabled={!tt}
              className="flex-1 h-14 rounded-xl bg-pine border-2 border-gold text-white text-lg font-bold hover:bg-[#005c40] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✓ Tick de pago
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  /* ───── Pantalla: Ventas ───── */
  const Metrics = pro ? (
    <aside className="rounded-xl border-2 border-pine p-3 overflow-y-auto min-h-0">
      <h3 className="font-bold text-lg">Métricas avanzadas</h3>
      <div className="text-xs font-semibold text-[var(--muted)] mt-2">Más vendidos</div>
      {top.length === 0 && <p className="text-sm text-[var(--muted)] font-medium mt-1">Se completa con los primeros cobros.</p>}
      {top.map(([id, q]) => (
        <div key={id} className="mt-1.5">
          <div className="flex justify-between text-sm font-bold">
            <span>{PRICE[id].n}</span>
            <span>{q}</span>
          </div>
          <div className="h-2 rounded bg-[var(--line)]">
            <div className="h-2 rounded bg-olive" style={{ width: (q / top[0][1]) * 100 + "%" }} />
          </div>
        </div>
      ))}
      <div className="text-xs font-semibold text-[var(--muted)] mt-4">Ventas por mesa</div>
      {tableSales.map(([n, m]) => (
        <div key={n} className="flex justify-between text-sm font-bold mt-1">
          <span>{n}</span>
          <span className="tabular-nums text-[var(--val)]">{fmt(m)}</span>
        </div>
      ))}
    </aside>
  ) : (
    <aside className="rounded-xl border-2 border-dashed border-[var(--line)] p-4 flex flex-col items-center justify-center text-center gap-2">
      <div className="text-2xl">🔒</div>
      <div className="font-bold">Métricas avanzadas</div>
      <p className="text-sm text-[var(--muted)] font-medium">Productos más vendidos y ventas por mesa, disponibles desde el Plan PRO.</p>
      <button onClick={go("planes")} className="rounded-xl bg-pine text-white font-bold px-4 py-2">
        Ver planes
      </button>
    </aside>
  );

  const Ventas = (
    <section className="card p-4 flex flex-col h-full min-h-0" aria-label="Ventas del turno">
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          ["Total del turno", fmt(sales)],
          ["Cobros", count],
          ["Ticket promedio", count ? fmt(sales / count) : "—"],
        ].map(([a, b]) => (
          <div key={a} className="rounded-xl border-2 border-[var(--line)] p-3">
            <div className="text-xs font-semibold uppercase text-[var(--muted)]">{a}</div>
            <div className="text-3xl font-bold tabular-nums text-[var(--val)]">{b}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-4 flex-1 min-h-0">
        <div className="flex flex-col min-h-0">
          <h2 className="text-xl font-bold mb-1">Cobros del turno</h2>
          <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--line)]">
            {log.length === 0 && (
              <li className="py-4 text-[var(--muted)] font-medium">
                Todavía no hay cobros. Tocá ✓ Tick de pago en una comanda para registrar el primero.
              </li>
            )}
            {log.map((r) => (
              <li key={r.k} className="py-2.5 flex items-center gap-4">
                <span className="text-sm text-[var(--muted)] font-semibold tabular-nums">{r.h}</span>
                <span className="flex-1 min-w-0">
                  <span className="font-bold">{r.n}</span>
                  <span className="block text-xs text-[var(--muted)] truncate">{r.it}</span>
                  {r.note && <span className="block text-xs text-[var(--muted)] truncate">{r.note}</span>}
                </span>
                <span className="tabular-nums font-bold text-lg text-[var(--val)]">{fmt(r.m)}</span>
              </li>
            ))}
          </ul>
        </div>
        {Metrics}
      </div>
    </section>
  );

  /* ───── Pantalla: Planes y facturación ───── */
  const Planes = (
    <section className="card p-4 flex flex-col h-full min-h-0" aria-label="Planes y facturación">
      <h2 className="text-xl font-bold mb-3">Planes y facturación</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
        {PLANS.map(([id, n, ars, usd, features]) => (
          <div
            key={id}
            className={"rounded-2xl border-2 p-4 flex flex-col " + (plan === id ? "border-pine bg-gold/15" : "border-[var(--line)]")}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{n}</h3>
              {plan === id && <span className="rounded-full bg-pine text-white text-xs font-bold px-2.5 py-0.5">Plan actual</span>}
            </div>
            <div className="text-3xl font-bold text-[var(--val)] mt-2">
              {ars ? (cur === "ARS" ? "$" + ars.toLocaleString("es-AR") + " ARS" : "$" + usd + " USD") : "Gratis"}
            </div>
            <div className="text-xs font-semibold text-[var(--muted)]">{ars ? "al mes" : "sin costo"}</div>
            <ul className="mt-3 text-sm font-semibold flex-1 space-y-1.5">
              {features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            {ars > 0 && plan === id && (
              <button
                onClick={() => {
                  setPlan("free");
                  say("Suscripción cancelada: volvés al Plan Gratuito");
                }}
                className="mt-3 rounded-xl border-2 border-olive font-bold py-2.5 hover:bg-gold/30"
              >
                Cancelar suscripción
              </button>
            )}
            {ars > 0 && plan !== id && (
              <button onClick={() => choosePlan(id, n)} className="mt-3 rounded-xl bg-pine text-white font-bold py-2.5 hover:bg-[#005c40]">
                {payLabel}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-[var(--muted)]">
        Mercado Pago: cobros locales en ARS dentro de Argentina. Stripe / Paddle: cobros internacionales en USD. Cambiá la moneda arriba para ver cada
        opción. Es una demo: no se cobra nada.
      </p>
    </section>
  );

  const VIEWS = { inicio: Inicio, comandas: Comandas, mesas: Mesas, ventas: Ventas, planes: Planes };

  /* ───── Estructura general ───── */
  return (
    <div className="cmd min-h-screen">
      <style>{CSS}</style>
      <div className="mx-auto max-w-[1440px] p-3 flex gap-3 lg:h-[700px] lg:overflow-hidden">
        {/* Barra lateral */}
        <nav className="hidden sm:flex flex-col items-center gap-3 shrink-0 pt-1" aria-label="Principal">
          <button
            onClick={go("inicio")}
            aria-label="Inicio"
            aria-pressed={view === "inicio"}
            className={
              "w-[68px] h-[68px] rounded-full bg-gold text-ink flex items-center justify-center shadow-md " +
              (view === "inicio" ? "ring-2 ring-pine ring-offset-2 ring-offset-[var(--bg)]" : "")
            }
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden="true">
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a3 3 0 110 6 3 3 0 010-6zm0 13.2a7.2 7.2 0 01-5.6-2.7c.03-1.85 3.74-2.87 5.6-2.87s5.57 1.02 5.6 2.87A7.2 7.2 0 0112 19.2z" />
            </svg>
          </button>
          <NavButton icon="＋" label="Comandas" active={view === "comandas"} onClick={go("comandas")} />
          <NavButton icon="▦" label="Mesas" active={view === "mesas"} onClick={go("mesas")} />
          <NavButton icon="$" label="Ventas" active={view === "ventas"} onClick={go("ventas")} />
          <NavButton icon="★" label="Planes" active={view === "planes"} onClick={go("planes")} />
        </nav>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Header constante */}
          <header className="flex flex-wrap items-center gap-x-4 gap-y-2 shrink-0">
            <div className="mr-auto">
              <div className="text-xl font-bold leading-none">Highball Bar</div>
              <div className="text-xs mt-1 text-[var(--muted)] font-medium">Encargado · Barra y caja</div>
            </div>
            <div className="text-right leading-tight pr-2" aria-live="polite">
              <div className="text-[11px] font-semibold text-[var(--muted)]">Ventas del turno</div>
              <div className="text-lg font-bold tabular-nums text-[var(--val)]">{fmt(sales)}</div>
            </div>
            <label className="text-xs font-semibold text-[var(--muted)] flex items-center gap-1.5">
              TC referencial · 1 USD =
              <input
                type="number"
                min="1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-20 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-right text-[var(--text)] font-semibold tabular-nums"
              />
              ARS
            </label>
            <div role="group" aria-label="Moneda" className="flex rounded-full border-2 border-olive overflow-hidden text-sm font-bold">
              {["ARS", "USD"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCur(c)}
                  aria-pressed={cur === c}
                  className={"px-4 py-1 " + (cur === c ? "bg-gold text-ink" : "text-[var(--muted)]")}
                >
                  {c} ($)
                </button>
              ))}
            </div>
            <button
              onClick={go("planes")}
              aria-label="Ver planes y facturación"
              className={
                "rounded-full px-3 py-1 text-sm font-bold border-2 " +
                (pro ? "bg-pine text-white border-pine" : "border-olive text-[var(--val)]")
              }
            >
              {PLAN_LABEL[plan]}
            </button>
          </header>

          {/* Pantalla activa */}
          <div className="flex-1 min-h-0 flex [&>*]:flex-1 [&>*]:min-w-0">{VIEWS[view]}</div>

          {/* Aviso legal */}
          <footer className="text-center text-xs font-medium text-[var(--muted)] shrink-0">
            Herramienta para control interno y cálculo operativo de salón. No procesa pagos directamente ni constituye comprobante fiscal o factura.
          </footer>
        </div>

        {/* Modal de upgrade */}
        {modal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20" role="dialog" aria-modal="true" aria-label="Actualizar a PRO">
            <div className="card p-5 max-w-sm w-full">
              <h3 className="text-xl font-bold">Pasar a PRO</h3>
              <p className="text-sm font-medium text-[var(--muted)] mt-1">
                Mesas ilimitadas y métricas avanzadas por $45.000 ARS / $45 USD al mes. Es una demo: no se cobra nada.
              </p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setModal(false)} className="flex-1 rounded-xl border-2 border-olive py-2 font-bold">
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setPlan("pro");
                    setModal(false);
                    say("Plan PRO activado: ya podés sumar mesas");
                  }}
                  className="flex-1 rounded-xl bg-pine text-white py-2 font-bold"
                >
                  {payLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso flotante */}
        {toast && (
          <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gold text-ink rounded-full px-5 py-2.5 text-sm font-bold shadow-lg z-30">
            ✓ {toast}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Estilos: tipografía Quicksand, variables de color y modo oscuro ───────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap');
.cmd{--bg:#ffffff;--panel:#ffffff;--soft:#f6f4e6;--line:#cfcab0;--text:#212117;--muted:#6b6644;--val:#8F802F;
  background:var(--bg);color:var(--text);font-family:'Quicksand',system-ui,sans-serif}
@media (prefers-color-scheme:dark){
  .cmd{--bg:#212117;--panel:#2b2b20;--soft:#212117;--line:#4a4631;--text:#f6f3e4;--muted:#b9b390;--val:#E0C94D}
}
.cmd *,.cmd button,.cmd input,.cmd textarea{font-family:'Quicksand',system-ui,sans-serif}
.cmd .card{background:var(--panel);border:1.5px solid var(--line);border-radius:14px}
.cmd button{cursor:pointer}
.cmd button:focus-visible,.cmd textarea:focus-visible,.cmd input:focus-visible{outline:2px solid #1c8ee0;outline-offset:2px}
.cmd .kpi:hover,.cmd .kpi:focus-visible{border-color:#1c8ee0;border-width:2px}
@keyframes cmdPulse{0%,100%{box-shadow:0 0 0 0 rgba(224,201,77,.6)}50%{box-shadow:0 0 0 6px rgba(224,201,77,0)}}
.cmd .pulse{animation:cmdPulse 1.8s infinite}
@media (prefers-reduced-motion:reduce){.cmd .pulse{animation:none}}
`;
