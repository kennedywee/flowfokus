import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, Search, MapPin, RotateCcw, CircleCheck, CircleX, AlertCircle, ChevronRight } from 'lucide-react'
import { Stage, type LookTokens } from '../../../.agents/skills/stageshow/kit/stage'
import { Window } from '../../../.agents/skills/stageshow/kit/window'
import { Row } from '../../../.agents/skills/stageshow/kit/parts/Row'
import { Avatar } from '../../../.agents/skills/stageshow/kit/parts/Avatar'
import { Check } from '../../../.agents/skills/stageshow/kit/parts/Check'
import { Collapse } from '../../../.agents/skills/stageshow/kit/motion/Collapse'
import { States } from '../../../.agents/skills/stageshow/kit/motion/States'
import type { Act } from '../../../.agents/skills/stageshow/kit/act'
import StaticCard from './gold'
import './lab.css'

type Mode = 'ready' | 'pending' | 'granted' | 'denied' | 'error'
type Scene = { query: string; selected: boolean; mode: Mode }
const initial: Scene = { query: '', selected: false, mode: 'ready' }
const poster: Scene = { query: 'Ada', selected: true, mode: 'granted' }
const directions = [
  { id: 'grove', name: 'Grove', subtitle: 'Warm. Open. Personal.', note: 'A member-first layout with soft groups and a broad action. Best when the desk should feel welcoming.', theme: 'light', accent: '#23604b', surface: '#fffefb', canvas: '#f4f2eb', ink: '#20342b', muted: '#58665e', line: '#d4d9cf', radius: '14px' },
  { id: 'studio', name: 'Studio', subtitle: 'Precise. Compact. Direct.', note: 'A working list beside a compact record. Best for frequent searches and quick repeated tasks.', theme: 'light', accent: '#2358cc', surface: '#ffffff', canvas: '#f2f5fa', ink: '#1c2a40', muted: '#53627a', line: '#ced7e5', radius: '6px' },
  { id: 'night', name: 'Night desk', subtitle: 'Focused. Bold. After hours.', note: 'A navy workspace with a clear action and a strong result band. Best if a dark desk experience is preferred.', theme: 'dark', accent: '#f4c66c', surface: '#17283b', canvas: '#102033', ink: '#eff4fa', muted: '#b5c5d8', line: '#40536c', radius: '10px' },
] as const
async function script(a: Act<Scene>) {
  await a.wait(650)
  a.mark('search')
  await a.click('search')
  await a.type('query', 'Ada', { interval: 160 })
  await a.wait(900)
  a.mark('select')
  await a.click('person')
  await a.set({ selected: true })
  await a.wait(1100)
  a.mark('check')
  await a.click('check')
  await a.set({ mode: 'pending' })
  await a.wait(1100)
  a.mark('granted')
  await a.set({ mode: 'granted' })
  await a.move({ at: 'search', x: .7, y: .5 })
  await a.wait(2800)
}
function App() {
  const [look, setLook] = useState(() => Math.max(0, Math.min(2, Number(new URLSearchParams(location.search).get('look')) || 0)))
  const [mode, setMode] = useState<Mode>('ready')
  const [query, setQuery] = useState('Ada')
  const [selected, setSelected] = useState('Ada Tan')
  const [run, setRun] = useState(new URLSearchParams(location.search).get('demo') === '1')
  const [replay, setReplay] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const d = directions[look]
  const tokens: LookTokens = {
    '--ss-accent': d.accent, '--ss-accent-text': d.accent, '--ss-surface': d.surface,
    '--ss-canvas': d.canvas, '--ss-well': d.canvas, '--ss-chrome': d.surface,
    '--ss-text-strong': d.ink, '--ss-text': d.muted, '--ss-text-faint': d.muted,
    '--ss-icon': d.muted, '--ss-line': d.line, '--ss-radius-md': d.radius,
    '--ss-font': 'Geist, system-ui, sans-serif', '--ss-accent-soft': look === 2 ? '#35435a' : look === 1 ? '#eaf0fd' : '#eaf1e9',
  }
  function reset(next: Mode = 'ready') { clearTimeout(timer.current); setRun(false); setMode(next); setReplay(v => v + 1) }
  function check() { if (run) return; reset('pending'); timer.current = setTimeout(() => { setMode('granted'); setReplay(v => v + 1) }, 1100) }
  const capture = new URLSearchParams(location.search).get('capture')
  if (capture === 'gold') return <div id="gold"><StaticCard /></div>
  return <main className="lab" data-look={d.id}>
    <div className="direction-tabs" role="tablist" aria-label="Design direction" onKeyDown={e => {
      const next = e.key === 'ArrowRight' ? (look + 1) % 3 : e.key === 'ArrowLeft' ? (look + 2) % 3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : null
      if (next !== null) { e.preventDefault(); reset(); setLook(next); document.getElementById(`tab-${directions[next].id}`)?.focus() }
    }}>
      {directions.map((item, i) => <button key={item.id} role="tab" tabIndex={look === i ? 0 : -1} aria-selected={look === i} aria-controls="concept" id={`tab-${item.id}`} onClick={() => { reset(); setLook(i); setQuery('Ada'); setSelected('Ada Tan') }}>{item.name}</button>)}
    </div>
    <section id="concept" role="tabpanel" aria-labelledby={`tab-${d.id}`}>
      <div className="concept-caption"><div><strong>{d.subtitle}</strong><p>{d.note}</p></div><span className="proposal">Concept {look + 1} / 3</span></div>
      <div id="demo">
        <Stage key={`${look}-${mode}-${replay}`} width={688} height={490} compact={{ below: 600, width: 358, height: 700 }} initial={run ? initial : { query, selected: true, mode }} poster={run ? poster : { query, selected: true, mode }} script={run ? script : undefined} play="once" fidelity="realistic" theme={d.theme} tokens={tokens} cursor={run ? { at: { x: 300, y: 350 }, style: 'real' } : undefined} className={`explore explore--${d.id}`}>
          {(s, _rect, layout) => {
            const currentQuery = run ? s.query : query
            const name = run ? 'Ada Tan' : selected
            const people = ['Ada Tan', 'Adam Lim', 'Ava Lee'].filter(p => p.toLowerCase().includes(currentQuery.toLowerCase()))
            const active = run ? s.selected : !!selected
            const compact = layout === 'compact'
            const Frame = compact ? 'div' : Window
            return <Frame {...(compact ? {} : { url: 'portal.flowfokus.com' })} className="explore-window">
              <div className="scene">
                <div className="scene-top"><span className="scene-title">Check-in</span><span className="location"><MapPin size={14} /> Bangsar</span></div>
                <div className="workspace">
                  <div className="search-pane">
                    <label className="label" htmlFor="find-member">Find a member</label>
                    <div className="search-control" data-target="search" data-cursor="ibeam"><Search size={16} /><input id="find-member" value={currentQuery} placeholder="Name or phone" onChange={e => { if (run) return; setQuery(e.target.value); if (mode !== 'ready') reset() }} autoComplete="off" disabled={run} /></div>
                    <div className="search-meta">{people.length ? `${people.length} matching member${people.length === 1 ? '' : 's'}` : 'No matching members'}</div>
                    <div className="member-list">
                      {['Ada Tan', 'Adam Lim', 'Ava Lee'].map((person, i) => <Collapse key={person} open={people.includes(person)}><Row pad={12} selected={person === name && active} lead={<Avatar name={person} size={30} />} title={person} subtitle={person === 'Ada Tan' ? 'Membership · 0428' : person === 'Adam Lim' ? 'Membership · 0196' : 'Membership · 0813'}><button className="select-person" data-target={i === 0 ? 'person' : undefined} data-cursor="pointer" aria-label={`Select ${person}`} onClick={() => { if (!run) { reset(); setSelected(person) } }} disabled={run}><ChevronRight size={16} /></button></Row></Collapse>)}
                      {!people.length && <div className="no-results"><Search size={22} /><strong>No member found</strong><p>Try a name or phone number.</p><button onClick={() => setQuery('')}>Clear search</button></div>}
                    </div>
                    {!compact && <div className="desk-note">One member. One clear result.</div>}
                  </div>
                  <section className="detail-pane" aria-label="Selected member" data-selected={active || undefined}>
                    <div className="member-heading"><Avatar name={name} size={40} /><div><div className="member-name">{name || 'Choose a member'}</div><div className="member-id">Member · {name === 'Ada Tan' ? '0428' : name === 'Adam Lim' ? '0196' : '0813'}</div></div></div>
                    <div className="membership"><span className="label">Membership</span><strong>{s.mode === 'denied' ? '10-visit membership' : '30-day membership'}</strong><div className="membership-facts"><span>Bangsar access</span><span>{s.mode === 'denied' ? '0 visits left' : 'Unlimited visits'}</span></div></div>
                    <div className="result-lane" role="status" aria-live="polite" data-mode={s.mode}>
                      <States value={s.mode} align="start" states={{
                        ready: <div className="result"><span className="result-icon"><MapPin size={18} /></span><div><strong>Ready at Bangsar</strong><p>Record a visit to check access.</p></div></div>,
                        pending: <div className="result"><Check on={false} pending size={18} /><div><strong>Checking access…</strong><p>Waiting for the recorded result.</p></div></div>,
                        granted: <div className="result"><CircleCheck size={20} /><div><strong>Check-in granted</strong><p>Visit recorded at Bangsar.</p></div></div>,
                        denied: <div className="result"><CircleX size={20} /><div><strong>Check-in denied</strong><p>No visits left. Renew at the desk.</p></div></div>,
                        error: <div className="result"><AlertCircle size={20} /><div><strong>Could not record visit</strong><p>Connection failed. Please try again.</p></div></div>,
                      }} />
                    </div>
                    <button className="primary" data-target="check" data-cursor="pointer" disabled={s.mode === 'pending' || s.mode === 'granted' || !active || !people.length || run} onClick={check}><States value={s.mode === 'pending' ? 'pending' : s.mode === 'granted' ? 'done' : 'idle'} states={{ idle: <span>Check in <ArrowRight size={16} /></span>, pending: <span>Checking…</span>, done: <span><CircleCheck size={16} /> Visit recorded</span> }} /></button>
                    <button className="secondary" disabled={run} onClick={() => { reset(); setQuery(''); setSelected('') }}>Next member</button>
                  </section>
                </div>
              </div>
            </Frame>
          }}
        </Stage>
      </div>
      <div className="playback"><button className="replay" onClick={() => { clearTimeout(timer.current); setMode('ready'); setReplay(v => v + 1); setRun(true) }}><RotateCcw size={15} /> Play check-in demo</button><span>Simulated data · no records are changed</span></div>
      <div className="state-controls" role="group" aria-label="Inspect a component state"><span>Inspect state</span>{(['ready', 'pending', 'granted', 'denied', 'error'] as Mode[]).map(item => <button key={item} aria-pressed={!run && mode === item} onClick={() => reset(item)}>{item === 'ready' ? 'Ready' : item === 'pending' ? 'Pending' : item === 'granted' ? 'Granted' : item === 'denied' ? 'Denied' : 'Error'}</button>)}<button onClick={() => { reset(); setQuery('Nobody') }}>No results</button></div>
      <div className="specimens">
        <div><span className="spec-label">Actions</span><div className="spec-actions"><button className="sample-primary" onClick={check}>Check in <ArrowRight size={15} /></button><button className="sample-secondary" onClick={() => reset()}>Cancel</button><button disabled>Disabled</button></div></div>
        <div><span className="spec-label">Status language</span><div className="statuses"><span className="status granted"><CircleCheck size={14} /> Granted</span><span className="status due"><AlertCircle size={14} /> Payment due</span><span className="status denied"><CircleX size={14} /> Denied</span></div></div>
      </div>
    </section>
  </main>
}
createRoot(document.getElementById('root')!).render(<App />)
