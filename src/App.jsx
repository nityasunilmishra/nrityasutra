import { useState, useMemo, useEffect, createContext, useContext } from "react";

/* ---------- Demo auth (browser localStorage only) ----------
   Good for a college project / prototype. For real users replace these
   helpers with Supabase, Firebase Auth or your own backend. */
const Ctx = createContext(null);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
async function hash(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const BASE = "https://rythmic-india-app.lovable.app/assets/";
const STYLES = [
  { name: "Bharatanatyam", kind: "Classical", img: "bharatanatyam-BJdiHzjz.jpg" },
  { name: "Kathak", kind: "Classical", img: "kathak-B63J5PaH.jpg" },
  { name: "Odissi", kind: "Classical", img: "odissi-mBkWZGS8.jpg" },
  { name: "Kuchipudi", kind: "Classical" },
  { name: "Hip-hop", kind: "Western", img: "hiphop-dUbYFFvJ.jpg" },
  { name: "Contemporary", kind: "Western", img: "contemporary-Bn88r9fs.jpg" },
  { name: "Bollywood", kind: "Fusion" },
  { name: "Salsa", kind: "Western" },
];

// Sample data — replace with your own / an API later
const EVENTS = [
  { id: 1, title: "Bharatanatyam Foundations", type: "class", style: "Bharatanatyam", city: "Chennai", price: 600, teacher: "Meera Nair", when: "Mon 6:00 PM", mode: "Offline" },
  { id: 2, title: "Hip-hop Cypher Night", type: "workshop", style: "Hip-hop", city: "Delhi", price: 800, teacher: "Arjun Rao", when: "Wed 7:30 PM", mode: "Offline" },
  { id: 3, title: "Kathak Footwork Masterclass", type: "seminar", style: "Kathak", city: "Online", price: 299, teacher: "Meera Nair", when: "Fri 5:00 PM", mode: "Online" },
  { id: 4, title: "Inter-College Dance Fest", type: "competition", style: "Contemporary", city: "Mumbai", price: 500, teacher: "Panel of judges", when: "Sat 11:00 AM", mode: "Offline" },
  { id: 5, title: "Odissi Expressions", type: "class", style: "Odissi", city: "Bhubaneswar", price: 700, teacher: "Sanjukta Das", when: "Tue 6:30 PM", mode: "Offline" },
  { id: 6, title: "Bollywood Beats for Beginners", type: "class", style: "Bollywood", city: "Delhi", price: 450, teacher: "Riya Kapoor", when: "Thu 7:00 PM", mode: "Offline" },
  { id: 7, title: "Salsa Social Workshop", type: "workshop", style: "Salsa", city: "Pune", price: 900, teacher: "Carlos & Neha", when: "Sun 4:00 PM", mode: "Offline" },
  { id: 8, title: "Kuchipudi Abhinaya Seminar", type: "seminar", style: "Kuchipudi", city: "Online", price: 199, teacher: "Lakshmi Iyer", when: "Sat 10:00 AM", mode: "Online" },
];

const TYPES = ["class", "workshop", "competition", "seminar"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function Nav({ go }) {
  const { user, logout } = useContext(Ctx);
  return (
    <header className="nav">
      <a className="logo" onClick={() => go("home")}>NrityaSutra</a>
      <nav>
        {TYPES.map((t) => (
          <a key={t} onClick={() => go("explore", { type: t })}>{cap(t)}es</a>
        ))}
      </nav>
      <div className="auth">
        {user ? (
          <>
            <button className="ghost" onClick={() => go("dashboard")}>Hi, {user.name.split(" ")[0]}</button>
            <button onClick={() => { logout(); go("home"); }}>Log out</button>
          </>
        ) : (
          <>
            <button className="ghost" onClick={() => go("auth", { mode: "login" })}>Log in</button>
            <button onClick={() => go("auth", { mode: "signup" })}>Sign up</button>
          </>
        )}
      </div>
    </header>
  );
}

function StyleCard({ s, go }) {
  return (
    <div className="style-card" onClick={() => go("explore", { style: s.name })}>
      {s.img ? <img src={BASE + s.img} alt={s.name + " dancer"} /> : <div className="ph" />}
      <div className="label"><strong>{s.name}</strong><small>{s.kind}</small></div>
    </div>
  );
}

function EventCard({ e, go }) {
  const { user, bookings, toggleBooking } = useContext(Ctx);
  const booked = bookings.includes(e.id);
  const click = () => (user ? toggleBooking(e.id) : go("auth", { mode: "login", msg: "Please log in to book." }));
  return (
    <article className="event">
      <span className="tag">{cap(e.type)}</span>
      <h3>{e.title}</h3>
      <p>{e.style} · {e.city} · {e.mode}</p>
      <p>{e.when} · with {e.teacher}</p>
      <div className="row">
        <strong>₹{e.price}</strong>
        <button className={booked ? "ghost" : ""} onClick={click}>{booked ? "Booked ✓ (cancel)" : "Book"}</button>
      </div>
    </article>
  );
}

function AuthPage({ init, go }) {
  const { login, signup } = useContext(Ctx);
  const [mode, setMode] = useState(init.mode || "login");
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", style: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const submit = async (ev) => {
    ev.preventDefault();
    setErr("");
    const email = f.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email address.");
    if (f.password.length < 6) return setErr("Password must be at least 6 characters.");
    if (mode === "signup") {
      if (f.name.trim().length < 2) return setErr("Please enter your name.");
      if (f.password !== f.confirm) return setErr("Passwords do not match.");
    }
    setBusy(true);
    const res = mode === "signup"
      ? await signup({ name: f.name.trim(), email, password: f.password, style: f.style })
      : await login(email, f.password);
    setBusy(false);
    if (res.error) return setErr(res.error);
    go("home");
  };

  return (
    <section className="authbox">
      <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
      {init.msg && <p className="info">{init.msg}</p>}
      <form onSubmit={submit}>
        {mode === "signup" && (
          <label>Full name<input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Niharika Sarkar" /></label>
        )}
        <label>Email<input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" /></label>
        <label>Password<input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} placeholder="At least 6 characters" /></label>
        {mode === "signup" && (
          <>
            <label>Confirm password<input type="password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} /></label>
            <label>Favourite dance style (optional)
              <select value={f.style} onChange={(e) => set("style", e.target.value)}>
                <option value="">Select</option>{STYLES.map((x) => <option key={x.name}>{x.name}</option>)}
              </select>
            </label>
          </>
        )}
        {err && <p className="error">{err}</p>}
        <button type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}</button>
      </form>
      <p className="switch">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <a className="link" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setErr(""); }}>
          {mode === "login" ? "Sign up" : "Log in"}
        </a>
      </p>
    </section>
  );
}

function Dashboard({ go }) {
  const { user, bookings } = useContext(Ctx);
  if (!user) return <AuthPage init={{ mode: "login", msg: "Please log in to see your dashboard." }} go={go} />;
  const mine = EVENTS.filter((e) => bookings.includes(e.id));
  return (
    <section>
      <h2>Your dashboard</h2>
      <div className="why">
        <p><b>{user.name}</b><br />{user.email}{user.style ? <><br />Favourite style: {user.style}</> : null}</p>
      </div>
      <h3>My bookings ({mine.length})</h3>
      <div className="events">{mine.map((e) => <EventCard key={e.id} e={e} go={go} />)}</div>
      {!mine.length && <p>No bookings yet. <a className="link" onClick={() => go("explore")}>Find a class →</a></p>}
    </section>
  );
}

function Home({ go }) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Made for India · classical to hip-hop</p>
        <h1>Every body, every beat, one India.</h1>
        <p className="lead">NrityaSutra is a home for every dancer in India. Find workshops, competitions, and online or offline classes in the style you love, then meet the experts who teach them, for less.</p>
        <div className="cta">
          <button onClick={() => go("explore")}>Find a class</button>
          <button className="ghost" onClick={() => go("explore", { type: "seminar" })}>Watch a seminar →</button>
        </div>
        <div className="chips">
          <span onClick={() => go("explore", { maxPrice: 1000 })}>Budget ₹0–1000</span>
          <span onClick={() => go("explore", { city: "Delhi" })}>City · Delhi</span>
          <span onClick={() => go("explore", { style: "Hip-hop" })}>Style · Hip-hop</span>
          <span onClick={() => go("explore", { teacher: "Meera Nair" })}>Teacher · Meera Nair</span>
        </div>
      </section>

      <section>
        <p className="eyebrow">01 / the styles</p>
        <h2>Learn the form that moves you</h2>
        <div className="styles">{STYLES.map((s) => <StyleCard key={s.name} s={s} go={go} />)}</div>
      </section>

      <section className="why">
        <p className="eyebrow">02 / why you should dance</p>
        <h3>Dance is the one practice that never asks you to be still.</h3>
        <p>It steadies the breath, sharpens memory, and hands you a body you actually enjoy living in. Whether it's a riyaz at dawn or a cypher at midnight, movement keeps the mind loose and the room electric.</p>
        <div className="stats">
          <div><small>Mood</small><b>Lifts you up</b></div>
          <div><small>Focus</small><b>Sharper mind</b></div>
          <div><small>Community</small><b>Find your crew</b></div>
        </div>
      </section>

      <section>
        <p className="eyebrow">03 / get shows &amp; book studios</p>
        <ol className="steps">
          <li><b>Build your profile</b> — sign up, tag your style, get seen by organisers.</li>
          <li><b>Book a rehearsal room</b> — hourly slots across Indian cities, from ₹250/hr.</li>
          <li><b>Apply to shows</b> — enter competitions and festivals listed here.</li>
        </ol>
        <button onClick={() => go("explore", { type: "competition" })}>Find shows to apply for</button>
      </section>

      <section>
        <p className="eyebrow">04 / live this week</p>
        <div className="events">{EVENTS.slice(0, 4).map((e) => <EventCard key={e.id} e={e} go={go} />)}</div>
        <p><a className="link" onClick={() => go("explore")}>See all · IST →</a></p>
      </section>
    </>
  );
}

function Explore({ init, go }) {
  const [f, setF] = useState({ type: "", style: "", city: "", maxPrice: "", teacher: "", ...init });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const cities = useMemo(() => [...new Set(EVENTS.map((e) => e.city))], []);
  const teachers = useMemo(() => [...new Set(EVENTS.map((e) => e.teacher))], []);
  const list = EVENTS.filter((e) =>
    (!f.type || e.type === f.type) && (!f.style || e.style === f.style) &&
    (!f.city || e.city === f.city) && (!f.teacher || e.teacher === f.teacher) &&
    (!f.maxPrice || e.price <= Number(f.maxPrice)));
  return (
    <section>
      <h2>Explore</h2>
      <div className="filters">
        <select value={f.type} onChange={(e) => set("type", e.target.value)}>
          <option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
        </select>
        <select value={f.style} onChange={(e) => set("style", e.target.value)}>
          <option value="">All styles</option>{STYLES.map((s) => <option key={s.name}>{s.name}</option>)}
        </select>
        <select value={f.city} onChange={(e) => set("city", e.target.value)}>
          <option value="">All cities</option>{cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.teacher} onChange={(e) => set("teacher", e.target.value)}>
          <option value="">All teachers</option>{teachers.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={f.maxPrice} onChange={(e) => set("maxPrice", e.target.value)}>
          <option value="">Any budget</option><option value="500">Up to ₹500</option><option value="1000">Up to ₹1000</option>
        </select>
        <button className="ghost" onClick={() => setF({ type: "", style: "", city: "", maxPrice: "", teacher: "" })}>Clear</button>
      </div>
      <div className="events">{list.map((e) => <EventCard key={e.id} e={e} go={go} />)}</div>
      {!list.length && <p>No matches. Try clearing a filter.</p>}
    </section>
  );
}

export default function App() {
  const [view, setView] = useState({ page: "home", params: {} });
  const [user, setUser] = useState(() => read("ns_session", null));
  const [allBookings, setAllBookings] = useState(() => read("ns_bookings", {}));
  const go = (page, params = {}) => { setView({ page, params, k: Math.random() }); window.scrollTo(0, 0); };

  useEffect(() => write("ns_bookings", allBookings), [allBookings]);

  const signup = async ({ name, email, password, style }) => {
    const users = read("ns_users", []);
    if (users.some((u) => u.email === email)) return { error: "An account with this email already exists." };
    users.push({ name, email, style, pw: await hash(password) });
    write("ns_users", users);
    const session = { name, email, style };
    write("ns_session", session); setUser(session);
    return {};
  };
  const login = async (email, password) => {
    const u = read("ns_users", []).find((x) => x.email === email);
    if (!u || u.pw !== (await hash(password))) return { error: "Incorrect email or password." };
    const session = { name: u.name, email: u.email, style: u.style };
    write("ns_session", session); setUser(session);
    return {};
  };
  const logout = () => { localStorage.removeItem("ns_session"); setUser(null); };
  const bookings = user ? allBookings[user.email] || [] : [];
  const toggleBooking = (id) =>
    setAllBookings((p) => {
      const cur = p[user.email] || [];
      return { ...p, [user.email]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });

  let page;
  if (view.page === "home") page = <Home go={go} />;
  else if (view.page === "auth") page = <AuthPage key={view.k} init={view.params} go={go} />;
  else if (view.page === "dashboard") page = <Dashboard go={go} />;
  else page = <Explore key={view.k} init={view.params} go={go} />;

  return (
    <Ctx.Provider value={{ user, bookings, login, signup, logout, toggleBooking }}>
      <Nav go={go} />
      <main>{page}</main>
      <footer>NrityaSutra · made only for India<br />Website developed by Niharika Sarkar, Nitya Mishra &amp; Narayan Sahu</footer>
    </Ctx.Provider>
  );
}
