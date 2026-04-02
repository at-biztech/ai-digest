import { useState, useEffect, useCallback, useMemo } from 'react'

const CL = ['#378ADD','#5DCAA5','#D85A30','#7F77DD','#D4537E','#639922','#BA7517','#888780','#E24B4A']
const CD = ['#85B7EB','#5DCAA5','#F0997B','#AFA9EC','#ED93B1','#97C459','#FAC775','#B4B2A9','#F09595']

function getSaved() { try { return JSON.parse(localStorage.getItem('ai-digest-saved') || '[]') } catch { return [] } }
function setSavedLS(items) { localStorage.setItem('ai-digest-saved', JSON.stringify(items)) }
function toggleSave(dateKey, item) {
  const saved = getSaved()
  const idx = saved.findIndex(s => s.dateKey === dateKey && s.headline === item.headline)
  if (idx >= 0) saved.splice(idx, 1); else saved.push({ dateKey, ...item })
  setSavedLS(saved); return saved
}

function DonutChart({ items, dark }) {
  const colors = dark ? CD : CL
  const cats = {}; items.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1 })
  const entries = Object.entries(cats).sort((a, b) => b[1] - a[1])
  const total = items.length, r = 60, cx = 80, cy = 80, stroke = 24; let cum = 0; const circ = 2 * Math.PI * r
  return (
    <div className="chart-box">
      <svg viewBox="0 0 160 160" width="110" height="110">
        {entries.map(([cat, count], idx) => { const f = count / total, off = circ * (1 - cum); cum += f
          return <circle key={cat} cx={cx} cy={cy} r={r} fill="none" stroke={colors[idx % colors.length]} strokeWidth={stroke}
            strokeDasharray={`${circ * f} ${circ * (1 - f)}`} strokeDashoffset={off} transform={`rotate(-90 ${cx} ${cy})`} /> })}
      </svg>
      <div className="chart-legend">{entries.map(([cat, count], idx) => (
        <div key={cat} className="leg-item"><span className="leg-dot" style={{ background: colors[idx % colors.length] }} /><span className="leg-lbl">{cat}</span><span className="leg-n">{count}</span></div>
      ))}</div>
    </div>
  )
}

function ToolBadges({ tools }) { if (!tools?.length) return null; return <div className="tools">{tools.map((t, i) => <span key={i} className="tool">{t}</span>)}</div> }
function Conf({ c }) { if (!c) return null; return <span className={`conf conf-${c}`}>{c}</span> }
function TL({ t }) { if (!t) return null; return <span className={`tl ${t.toLowerCase().includes('available now') ? 'tl-now' : ''}`}>{t}</span> }

function CopyBtn({ text, label }) {
  const [c, setC] = useState(false)
  return <button className="cbtn" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text).then(() => { setC(true); setTimeout(() => setC(false), 1500) }) }}>{c ? 'Copied' : label}</button>
}

function Star({ dateKey, item, onToggle }) {
  const [s, setS] = useState(getSaved().some(x => x.dateKey === dateKey && x.headline === item.headline))
  return <button className={`star ${s ? 'on' : ''}`} onClick={e => { e.stopPropagation(); toggleSave(dateKey, item); setS(!s); onToggle?.() }}>{s ? '\u2605' : '\u2606'}</button>
}

function CriticalCard({ item, dateKey, onSave }) {
  const act = item.action || item.useCase || ''
  return (
    <div className="card crit">
      <div className="card-row">
        <div className="score score-c">{item.score}</div>
        <div className="card-body">
          <div className="badges"><span className="tag tc">CRITICAL</span><span className="cat">{item.category}</span><TL t={item.timeline} /><Conf c={item.confidence} /></div>
          <div className="hl">{item.headline}</div>
          <div className="desc">{item.description}</div>
          <ToolBadges tools={item.tools} />
          {act && <div className="act-block"><b>Action:</b> {act}</div>}
          <div className="card-ft">
            {item.sourceUrl ? <a className="src" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceName || 'Source'}</a> : <span />}
            <CopyBtn text={`${item.headline}\n${act}`} label="Share" />
          </div>
        </div>
        <Star dateKey={dateKey} item={item} onToggle={onSave} />
      </div>
    </div>
  )
}

function WatchCard({ item, dateKey, onSave }) {
  const [open, setOpen] = useState(false)
  const pitch = item.clientPitch || item.useCase || ''
  return (
    <div className={`card watch ${open ? 'expanded' : ''}`} onClick={() => setOpen(!open)}>
      <div className="card-row">
        <div className="score">{item.score}</div>
        <div className="card-body">
          <div className="badges"><span className="tag tw">WATCH</span><span className="cat">{item.category}</span><TL t={item.timeline} /><Conf c={item.confidence} /></div>
          <div className="hl">{item.headline}</div>
          <div className="desc">{item.description}</div>
          {open && (
            <>
              <ToolBadges tools={item.tools} />
              {pitch && (
                <div className="pitch-block">
                  <div className="pitch-inner"><b>Client pitch:</b> {item.clientPitch || item.useCase}</div>
                  {item.clientPitch && <CopyBtn text={item.clientPitch} label="Forward" />}
                </div>
              )}
              <div className="card-ft">
                {item.sourceUrl ? <a className="src" href={item.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{item.sourceName || 'Source'}</a> : <span />}
              </div>
            </>
          )}
        </div>
        <Star dateKey={dateKey} item={item} onToggle={onSave} />
      </div>
    </div>
  )
}

function WeeklySummary({ digests, dates, currentDate }) {
  const idx = dates.indexOf(currentDate)
  const wd = dates.slice(idx, idx + 7).filter(Boolean)
  if (wd.length < 3) return null
  const wi = wd.flatMap(d => digests[d]?.items || [])
  const cc = wi.filter(i => i.score >= 8).length
  const tf = {}; wi.flatMap(i => i.tools || []).forEach(t => { tf[t] = (tf[t] || 0) + 1 })
  const topT = Object.entries(tf).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const cats = {}; wi.filter(i => i.score >= 6).forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1 })
  const topC = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3)
  return (
    <div className="weekly">
      <div className="wk-title">Last {wd.length} days</div>
      <div className="wk-row"><span>{cc} critical</span><span>{wi.length} total</span></div>
      {topC.length > 0 && <div className="wk-det">Top: {topC.map(([c, n]) => `${c} (${n})`).join(', ')}</div>}
      {topT.length > 0 && <div className="wk-det">Trending: {topT.map(([t, n]) => `${t} (${n}x)`).join(', ')}</div>}
    </div>
  )
}

function SearchResults({ digests, dates, query, onSelect }) {
  const results = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase(), out = []
    for (const d of dates) { const dig = digests[d]; if (!dig?.items) continue
      for (const item of dig.items) { if (item.headline?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q) || (item.tools || []).some(t => t.toLowerCase().includes(q))) { out.push({ ...item, dateKey: d }); if (out.length >= 25) return out } } }
    return out
  }, [digests, dates, query])
  if (!query || query.length < 2) return null
  return (
    <div className="sr-list">
      {results.length === 0 ? <div className="sr-empty">No results</div> :
        results.map((r, i) => (
          <div key={i} className="sr-item" onClick={() => onSelect(r.dateKey)}>
            <span className={`sr-score ${r.tag === 'CRITICAL' ? 'tc' : r.tag === 'WATCH' ? 'tw' : 'tl'}`}>{r.score}</span>
            <div className="sr-body"><div className="sr-hl">{r.headline}</div><div className="sr-date">{r.dateKey} / {r.category}</div></div>
          </div>
        ))}
    </div>
  )
}

export default function App() {
  const [digests, setDigests] = useState(null)
  const [dates, setDates] = useState([])
  const [cur, setCur] = useState(null)
  const [sidebar, setSidebar] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('ai-digest-dark') === 'true')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [filterCat, setFilterCat] = useState(null)
  const [search, setSearch] = useState('')
  const [view, setView] = useState('digest')
  const [showFilters, setShowFilters] = useState(false)
  const [, refresh] = useState(0)

  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); localStorage.setItem('ai-digest-dark', dark) }, [dark])

  const fetchData = () => {
    setLoading(true); setError(null)
    fetch(import.meta.env.BASE_URL + 'digests.json')
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json() })
      .then(data => { setDigests(data.digests || {}); const d = data.dates || []; setDates(d); setCur(d[0] || null); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }
  useEffect(fetchData, [])

  const ci = dates.indexOf(cur)
  const hasPrev = ci < dates.length - 1, hasNext = ci > 0
  const goPrev = useCallback(() => { if (hasPrev) { setCur(dates[ci + 1]); setFilterCat(null) } }, [hasPrev, dates, ci])
  const goNext = useCallback(() => { if (hasNext) { setCur(dates[ci - 1]); setFilterCat(null) } }, [hasNext, dates, ci])

  useEffect(() => {
    const h = e => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === '/' && view !== 'search') { e.preventDefault(); setView('search') }
      if (e.key === 'Escape') { setView('digest'); setSearch(''); setSidebar(false) }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [goPrev, goNext, view])

  const digest = digests && cur ? digests[cur] : null
  if (loading) return <div className="center">Loading...</div>
  if (error) return <div className="center"><p>{error}</p><button className="cbtn" onClick={fetchData}>Retry</button></div>
  if (!digest) return <div className="center">No digests yet.</div>

  const fmt = d => { const [y, m, day] = d.split('-'); return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) }
  const all = digest.items || []
  const fl = filterCat ? all.filter(i => i.category === filterCat) : all
  const crit = fl.filter(i => i.score >= 8)
  const watch = fl.filter(i => i.score >= 6 && i.score <= 7)
  const low = fl.filter(i => i.score < 6)
  const cats = [...new Set(all.map(i => i.category))].sort()
  const mins = Math.max(1, Math.ceil(all.length * 0.15))

  return (
    <>
      {sidebar && <div className="overlay" onClick={() => setSidebar(false)} />}
      <div className={`sidebar ${sidebar ? 'open' : ''}`}>
        <div className="sb-hdr"><span>Digests</span><button className="cbtn" onClick={() => setSidebar(false)}>&#x2715;</button></div>
        <div className="sb-list">{dates.map((d, i) => (
          <button key={d} className={`sb-item ${d === cur ? 'active' : ''}`}
            onClick={() => { setCur(d); setSidebar(false); setFilterCat(null); setView('digest') }}>
            {d}{i === 0 && <span className="sb-latest">latest</span>}
          </button>
        ))}</div>
      </div>

      <div className="app">
        {/* Header — always visible */}
        <div className="hdr">
          <button className="ibtn" onClick={() => setSidebar(true)}><svg width="18" height="18" viewBox="0 0 20 20"><path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
          <div className="hdr-mid">
            <div className="hdr-lbl">AI ECOSYSTEM DIGEST</div>
            <div className="hdr-nav">
              <button className="ibtn" onClick={goPrev} disabled={!hasPrev}><svg width="14" height="14" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
              <span className="hdr-date">{fmt(cur)}</span>
              <button className="ibtn" onClick={goNext} disabled={!hasNext}><svg width="14" height="14" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
            </div>
          </div>
          <div className="hdr-act">
            <button className={`ibtn ${view === 'saved' ? 'ibtn-on' : ''}`} onClick={() => setView(view === 'saved' ? 'digest' : 'saved')}>
              <svg width="16" height="16" viewBox="0 0 20 20"><path d="M10 2l2.4 4.8 5.3.8-3.85 3.7.9 5.2L10 14l-4.75 2.5.9-5.2L2.3 7.6l5.3-.8z" stroke="currentColor" strokeWidth="1.3" fill={view === 'saved' ? 'currentColor' : 'none'} strokeLinejoin="round"/></svg>
            </button>
            <button className={`ibtn ${view === 'search' ? 'ibtn-on' : ''}`} onClick={() => { setView(view === 'search' ? 'digest' : 'search'); setSearch('') }}>
              <svg width="16" height="16" viewBox="0 0 20 20"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            <button className="ibtn" onClick={() => setDark(!dark)}>
              {dark ? <svg width="16" height="16" viewBox="0 0 20 20"><circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                : <svg width="16" height="16" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.003 8.003 0 1010.586 10.586z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>}
            </button>
          </div>
        </div>

        {/* Search view */}
        {view === 'search' && (
          <div className="vw">
            <input autoFocus className="sinput" placeholder="Search all digests... (Esc to close)" value={search}
              onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setView('digest'); setSearch('') } }} />
            <SearchResults digests={digests} dates={dates} query={search} onSelect={d => { setCur(d); setView('digest'); setFilterCat(null) }} />
          </div>
        )}

        {/* Saved view */}
        {view === 'saved' && (
          <div className="vw">
            <div className="vw-title">Saved items</div>
            {getSaved().length === 0 ? <div className="center" style={{ minHeight: '20vh' }}>No saved items. Star items to save them.</div> :
              <div className="sr-list">{getSaved().map((r, i) => (
                <div key={i} className="sr-item" onClick={() => { setCur(r.dateKey); setView('digest') }}>
                  <span className={`sr-score ${r.tag === 'CRITICAL' ? 'tc' : r.tag === 'WATCH' ? 'tw' : 'tl'}`}>{r.score}</span>
                  <div className="sr-body"><div className="sr-hl">{r.headline}</div><div className="sr-date">{r.dateKey}</div></div>
                </div>
              ))}</div>}
          </div>
        )}

        {/* Digest view */}
        {view === 'digest' && (
          <>
            {/* Number cards — 5 second scanning */}
            <div className="nums">
              <div className="num nc"><div className="nv">{crit.length}</div><div className="nl">Act</div></div>
              <div className="num nw"><div className="nv">{watch.length}</div><div className="nl">Watch</div></div>
              <div className="num nb"><div className="nv">{low.length}</div><div className="nl">Context</div></div>
              <div className="num nt"><div className="nv">{mins}m</div><div className="nl">Read</div></div>
            </div>

            {/* Briefing */}
            <div className="brief">
              <div className="brief-text">{digest.summary}</div>
              <CopyBtn text={digest.summary} label="Copy" />
            </div>

            {/* Filter toggle */}
            {cats.length > 1 && (
              <div className="filter-area">
                <button className="cbtn filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? 'Hide filters' : `Filter (${cats.length} categories)`}
                </button>
                {showFilters && (
                  <div className="filters">
                    <button className={`fbtn ${!filterCat ? 'fon' : ''}`} onClick={() => setFilterCat(null)}>All</button>
                    {cats.map(c => <button key={c} className={`fbtn ${filterCat === c ? 'fon' : ''}`} onClick={() => setFilterCat(filterCat === c ? null : c)}>{c}</button>)}
                  </div>
                )}
              </div>
            )}

            <div className="div" />

            {/* Sections */}
            {all.length === 0 ? <div className="center">Nothing today.</div> : (
              <>
                {crit.length > 0 && (
                  <section className="sec">
                    <div className="sh"><h2 className="st st-c">Act on this</h2><span className="sn">{crit.length}</span></div>
                    <div className="cards">{crit.map((item, i) => <CriticalCard key={i} item={item} dateKey={cur} onSave={() => refresh(n => n + 1)} />)}</div>
                  </section>
                )}
                {watch.length > 0 && (
                  <section className="sec">
                    <div className="sh"><h2 className="st st-w">New capabilities</h2><span className="sn">{watch.length}</span><span className="sh-hint">tap to expand</span></div>
                    <div className="cards">{watch.map((item, i) => <WatchCard key={i} item={item} dateKey={cur} onSave={() => refresh(n => n + 1)} />)}</div>
                  </section>
                )}
                {low.length > 0 && (
                  <section className="sec">
                    <div className="sh sh-click" onClick={() => setCtxOpen(!ctxOpen)}>
                      <h2 className="st st-l">Market context</h2><span className="sn">{low.length}</span>
                      <span className="sh-arr">{ctxOpen ? '\u25B2' : '\u25BC'}</span>
                    </div>
                    {/* Always show first 3 */}
                    <div className="ctx-preview">
                      {low.slice(0, 3).map((item, i) => (
                        <div key={i} className="ctx-line"><span className="ctx-sc">{item.score}</span><span className="ctx-hl">{item.headline}</span></div>
                      ))}
                    </div>
                    {ctxOpen && low.length > 3 && (
                      <div className="ctx-rest">{low.slice(3).map((item, i) => (
                        <div key={i} className="ctx-line"><span className="ctx-sc">{item.score}</span><span className="ctx-hl">{item.headline}</span><span className="ctx-desc">{item.description}</span></div>
                      ))}</div>
                    )}
                    {!ctxOpen && low.length > 3 && <button className="cbtn ctx-more" onClick={() => setCtxOpen(true)}>Show {low.length - 3} more</button>}
                  </section>
                )}
                {all.length >= 5 && <DonutChart items={all} dark={dark} />}
                <WeeklySummary digests={digests} dates={dates} currentDate={cur} />
              </>
            )}

            <footer>
              {digest.footerNote && <div className="ft-note">{digest.footerNote}</div>}
              <div className="ft-info">{dates.length} digests / Left-Right = nav / / = search / Esc = close</div>
            </footer>
          </>
        )}
      </div>
    </>
  )
}
