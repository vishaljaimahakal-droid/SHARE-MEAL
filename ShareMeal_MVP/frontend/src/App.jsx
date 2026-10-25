import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Leaf, MapPin, Clock3, Users, PackageCheck, Plus, Search, Utensils, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

function prettyDate(value) {
  if (!value) return "Not specified";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function App() {
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ total: 0, available: 0, claimed: 0, collected: 0, servings_listed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [claimName, setClaimName] = useState("Community NGO");
  const [form, setForm] = useState({
    food_name: "", quantity: "20", unit: "servings", donor_name: "",
    pickup_location: "", expiry_time: "", notes: ""
  });

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || data.error || `Request failed (${response.status})`);
    }
    return data;
  }

  async function refresh() {
    setError("");
    try {
      const params = new URLSearchParams();
      if (filter !== "All") params.set("status", filter);
      if (search.trim()) params.set("search", search.trim());
      const [list, summary] = await Promise.all([
        request(`/donations?${params.toString()}`),
        request("/stats"),
      ]);
      setDonations(list);
      setStats(summary);
    } catch (e) {
      setError(`Can't connect to ShareMeal API. Make sure the backend is running. ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [filter, search]);

  const allGood = !error;
  const visibleDonations = useMemo(() => donations, [donations]);

  async function submitDonation(event) {
    event.preventDefault();
    setNotice("");
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        expiry_time: form.expiry_time || null,
        notes: form.notes.trim() || null,
      };
      await request("/donations", { method: "POST", body: JSON.stringify(payload) });
      setForm({ food_name: "", quantity: "20", unit: "servings", donor_name: "", pickup_location: "", expiry_time: "", notes: "" });
      setShowForm(false);
      setNotice("Donation added successfully. Thank you for sharing food!");
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function claimDonation(id) {
    setNotice("");
    try {
      await request(`/donations/${id}/claim`, {
        method: "PATCH", body: JSON.stringify({ claimed_by: claimName.trim() || "Community NGO" })
      });
      setNotice("Donation claimed. Coordinate pickup directly with the donor.");
      await refresh();
    } catch (e) { setError(e.message); }
  }

  async function collectDonation(id) {
    setNotice("");
    try {
      await request(`/donations/${id}/collect`, { method: "PATCH" });
      setNotice("Donation marked as collected.");
      await refresh();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="ShareMeal home">
          <span className="brand-icon"><HeartHandshake size={24} /></span>
          <span>ShareMeal<small>Food, shared with care</small></span>
        </a>
        <nav><a href="#donations">Find food</a><a href="#how">How it works</a></nav>
        <button className="button button-primary top-cta" onClick={() => setShowForm(v => !v)}><Plus size={17}/> Donate food</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><Leaf size={15}/> LESS WASTE. MORE CARE.</div>
            <h1>Good food deserves<br/><em>a second chance.</em></h1>
            <p>Share surplus food with the people who need it. Connect donors, community NGOs, and volunteers in one simple place.</p>
            <div className="hero-actions">
              <button className="button button-light" onClick={() => document.getElementById("donations").scrollIntoView({ behavior: "smooth" })}>Explore donations <span>→</span></button>
              <button className="button button-outline" onClick={() => setShowForm(v => !v)}><Plus size={17}/> Share surplus food</button>
            </div>
            <div className="trust-note"><span className="avatar-stack"><i>D</i><i>N</i><i>V</i></span><span>Small acts can make a big difference.</span></div>
          </div>
          <div className="hero-art" role="img" aria-label="Illustration of a basket of fresh food">
            <div className="sun"></div><div className="leaf leaf-one"></div><div className="leaf leaf-two"></div>
            <div className="food-card"><div className="food-emoji">🥬 🍅 🥖</div><div className="food-card-title">Fresh food, shared locally</div><div className="food-card-sub">A little extra can mean a lot.</div></div>
            <div className="floating-note"><HeartHandshake size={18}/><span><b>Share kindness</b><small>One meal at a time</small></span></div>
          </div>
        </section>

        <section className="stats-grid" aria-label="Donation statistics">
          <Stat icon={<PackageCheck/>} label="Total donations" value={stats.total}/>
          <Stat icon={<Leaf/>} label="Available now" value={stats.available}/>
          <Stat icon={<Users/>} label="Claimed by NGOs" value={stats.claimed}/>
          <Stat icon={<Utensils/>} label="Servings listed" value={stats.servings_listed}/>
        </section>

        {showForm && <section className="form-panel" id="donate-form">
          <div className="section-heading"><div><div className="eyebrow">MAKE A DIFFERENCE</div><h2>Share a food donation</h2><p>Enter accurate details so the receiving organization can arrange pickup.</p></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close form">✕</button></div>
          <form onSubmit={submitDonation} className="donation-form">
            <Field label="Food name" required><input required minLength="2" maxLength="120" placeholder="e.g. Vegetable rice meals" value={form.food_name} onChange={e => setForm({...form, food_name:e.target.value})}/></Field>
            <div className="form-row">
              <Field label="Quantity" required><input type="number" min="1" max="100000" required value={form.quantity} onChange={e => setForm({...form, quantity:e.target.value})}/></Field>
              <Field label="Unit"><select value={form.unit} onChange={e => setForm({...form, unit:e.target.value})}><option>servings</option><option>meal boxes</option><option>kg</option><option>packets</option><option>loaves</option></select></Field>
            </div>
            <Field label="Donor / restaurant name" required><input required minLength="2" placeholder="e.g. Green Leaf Cafe" value={form.donor_name} onChange={e => setForm({...form, donor_name:e.target.value})}/></Field>
            <Field label="Pickup location" required><input required minLength="3" placeholder="Street, area, city" value={form.pickup_location} onChange={e => setForm({...form, pickup_location:e.target.value})}/></Field>
            <Field label="Use-by / pickup deadline"><input type="datetime-local" value={form.expiry_time} onChange={e => setForm({...form, expiry_time:e.target.value})}/></Field>
            <Field label="Notes (allergens, packaging, pickup instructions)"><textarea rows="3" maxLength="1000" placeholder="Add important handling information..." value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}/></Field>
            <p className="safety-note">Please only list food handled and stored safely. This app does not verify food safety.</p>
            <button className="button button-primary" type="submit"><Plus size={17}/> Publish donation</button>
          </form>
        </section>}

        {notice && <div className="notice"><CheckCircle2 size={18}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {error && <div className="error-banner"><b>Connection / action issue</b><span>{error}</span><button className="button button-small" onClick={refresh}><RefreshCw size={14}/> Retry</button></div>}

        <section className="donations-section" id="donations">
          <div className="section-heading donations-heading"><div><div className="eyebrow">COMMUNITY FOOD BOARD</div><h2>Available to share</h2><p>Browse donations and help get good food to local communities.</p></div><button className="button button-secondary" onClick={() => setShowForm(true)}><Plus size={17}/> Add donation</button></div>
          <div className="toolbar">
            <label className="search-box"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search food, donor, location..." aria-label="Search donations"/></label>
            <div className="filter-tabs">{["All","Available","Claimed","Collected"].map(s => <button key={s} className={filter===s?"active":""} onClick={() => setFilter(s)}>{s}</button>)}</div>
          </div>
          {loading ? <div className="empty-state">Loading donations…</div> :
            visibleDonations.length === 0 ? <div className="empty-state"><div className="empty-icon"><Utensils size={25}/></div><h3>No donations found yet</h3><p>Be the first to share surplus food, or try a different search.</p><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17}/> Add the first donation</button></div> :
            <div className="donation-grid">{visibleDonations.map(d => <article className="donation-card" key={d.id}>
              <div className="card-illustration"><span className="food-symbol">{foodEmoji(d.food_name)}</span><span className={`status status-${d.status.toLowerCase()}`}>{d.status}</span><span className="quantity-pill">{d.quantity} {d.unit}</span></div>
              <div className="card-body"><div className="card-kicker">DONATION #{String(d.id).padStart(3,"0")}</div><h3>{d.food_name}</h3><p className="donor-name">Shared by {d.donor_name}</p>
                <div className="detail-line"><MapPin size={16}/><span>{d.pickup_location}</span></div>
                <div className="detail-line"><Clock3 size={16}/><span>Deadline: {prettyDate(d.expiry_time)}</span></div>
                {d.notes && <p className="card-notes">{d.notes}</p>}
                {d.claimed_by && <div className="claimed-line"><Users size={15}/> Claimed by {d.claimed_by}</div>}
                <div className="card-footer">
                  {d.status === "Available" ? <button className="button button-primary full-button" onClick={() => claimDonation(d.id)}>Claim donation <span>→</span></button> :
                   d.status === "Claimed" ? <button className="button button-secondary full-button" onClick={() => collectDonation(d.id)}>Mark collected <CheckCircle2 size={16}/></button> :
                   <div className="completed-label"><CheckCircle2 size={17}/> Collection completed</div>}
                </div>
              </div>
            </article>)}</div>
          }
        </section>

        <section className="how-section" id="how"><div className="eyebrow">SIMPLE BY DESIGN</div><h2>Good things happen in three steps.</h2><div className="steps-grid"><Step n="01" title="List surplus food" text="Donors share food details, quantity, location, and pickup deadline."/><Step n="02" title="An NGO claims it" text="A community organization finds an available donation and claims it."/><Step n="03" title="Coordinate pickup" text="The donor and recipient coordinate collection and update the status."/></div></section>

        <section className="ai-banner"><div className="ai-icon"><Sparkles size={24}/></div><div><h3>Built for a smarter food-sharing future</h3><p>Future versions can add location matching, notifications, image uploads, and AI-assisted image checks. AI cannot reliably certify that food is safe to eat.</p></div><span className="ai-tag">AI-ready roadmap</span></section>
      </main>

      <footer><a className="brand footer-brand" href="#"><span className="brand-icon"><HeartHandshake size={21}/></span><span>ShareMeal<small>Food, shared with care</small></span></a><p>Reducing waste. Sharing hope. <span>Built as an educational MVP.</span></p><a href={`${API}/docs`} target="_blank" rel="noreferrer">API documentation ↗</a></footer>
    </div>
  );
}

function Stat({icon,label,value}) {
  return <div className="stat-card"><div className="stat-icon">{icon}</div><div><div className="stat-value">{Number(value || 0).toLocaleString()}</div><div className="stat-label">{label}</div></div></div>;
}
function Field({label,required,children}) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}</label>;
}
function Step({n,title,text}) {
  return <article className="step-card"><div className="step-number">{n}</div><h3>{title}</h3><p>{text}</p></article>;
}
function foodEmoji(name="") {
  const s=name.toLowerCase();
  if (s.includes("fruit") || s.includes("apple")) return "🍎";
  if (s.includes("bread") || s.includes("loaf")) return "🥖";
  if (s.includes("rice")) return "🍚";
  if (s.includes("vegetable") || s.includes("salad")) return "🥗";
  if (s.includes("milk")) return "🥛";
  if (s.includes("pizza")) return "🍕";
  if (s.includes("sandwich")) return "🥪";
  if (s.includes("meal") || s.includes("food")) return "🍱";
  return "🥘";
}
