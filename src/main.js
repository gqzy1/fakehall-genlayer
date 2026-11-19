// FakeHall frontend — Forensic Workbench.
// Cold-start rule: NOTHING renders a VERIFIED badge or a payout number until
// a latest-final get_* readback has returned. Before that, every verdict and
// score shows UNCONFIRMED / "-- (未确认)" and preview seeds carry a
// PREVIEW SEED badge. Export is gated on the readback function's own
// is_finalized_readback flag (see src/chain.js); this file never sets it.
import {
  CHAIN_ID, EXPLORER_BASE, loadDeployment, contractAddress, explorerTx, explorerAddress,
  reader, readRound, readAllRounds, readLeaderboards, readGallery,
  waitFinalized, leaderPayload, leaderExecution,
  injectedProvider, connectInjected, injectedChainId,
  temporaryAccount, rotateTemporaryAccount, destroyTemporaryAccount,
  sendWrite, sha256Hex, shortAddr, sleep,
} from './chain.js';
import { I18N_53, EXTRA } from './i18n.js';
import { SEEDS } from './seeds.js';
import { EVIDENCE } from './evidence.js';
import { caseRoute, caseUrl, caseStage, httpsUrl, timeRemaining } from './archive.js';
import milestoneEvidence from '../evidence/milestone-ballots.json';
import showcaseEvidence from '../evidence/archive-showcase.json';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = {
  lang: 'en',
  view: caseRoute() ? 'workbench' : 'lobby',
  roundId: caseRoute() ?? 1,
  filter: 'all',
  mobileSide: 'A',
  voteDrafts: new Map(),
  loupe: 'all',
  staticMode: new URLSearchParams(location.search).has('static'),
  evidenceView: 'human',
  deployment: null,
  liveRounds: null,      // array from readAllRounds — null until readback
  liveBoards: null,
  liveGallery: null,
  readbackOk: false,
  readbackError: null,
  reading: false,      // true while a latest-final readback is in flight (R2: visible "reading…" state)
  creating: false,     // true while doCreate is submitting (R2: button disabled + 提交中…)
  wallet: null,          // {mode:'injected'|'temporary', address, client, signer_mode}
  chainId: null,
  writing: false,
  tx: null,              // {method, roundId, hash, phase, attempts, error}
  version: null,
};
const label = (zh, en) => state.lang === 'zh' ? zh : en;
const t = (k) => (I18N_53[k] || EXTRA[k] || [k, k])[state.lang === 'zh' ? 0 : 1];
const previewRound = (id) => SEEDS.find((r) => r.round_id === id);
const liveRound = (id) => state.liveRounds?.find((r) => r.round_id === id) || null;
// Preview rounds are synthesized from seeds.json + the evidence wallets:
// votes are shown SEALED (never their direction), verdict/flaw stay null so
// the UI renders UNCONFIRMED until a latest-final readback replaces them.
function previewAsRound(s) {
  return {
    ...s,
    status: s.expected_final_status,
    verdict: null, flaw_category: null, reveal_mode: null,
    source_quote: '', audit_summary: '', confession: '',
    supplement_verified: false, supplement_choice: null,
    forger_address: EVIDENCE.wallets.F,
    vote_count: (s.votes || []).length,
    forger_points: 0,
    investigations: (s.votes || []).map((v) => ({
      detective: v.detective === 'D1' ? EVIDENCE.wallets.D1 : EVIDENCE.wallets.D2,
      suspected_fake: 'SEALED_UNTIL_JUDGED',
      flaw_category: 'SEALED_UNTIL_JUDGED',
      detective_note: 'SEALED_UNTIL_JUDGED',
      points_awarded: 0,
    })),
  };
}
const roundData = (id) => liveRound(id) || previewAsRound(previewRound(id) || SEEDS[0]);
const isLive = (id) => !!liveRound(id);
const EVIDENCE_FORGER = (EVIDENCE.wallets.F || '').toLowerCase();

// ---------- boot ----------
async function boot() {
  document.documentElement.dataset.static = state.staticMode ? 'true' : 'false';
  renderChrome();
  renderAll();
  try {
    state.deployment = await loadDeployment();
  } catch (e) {
    state.readbackError = 'deployment.json: ' + e.message;
    renderAll();
    return;
  }
  try { state.version = await (await fetch('./version.json', { cache: 'no-store' })).json(); } catch { /* optional */ }
  // Sequential paced readbacks (Studio RPC limit 30 req/min: >=3s apart).
  // R2: mark the readback in flight so the banner shows a visible "reading…"
  // state instead of looking dead for the 1–2 minutes a FINALIZED readback
  // can take; the refresh button is disabled while reading.
  state.reading = true;
  renderAll();
  try {
    const all = await readAllRounds();
    state.liveRounds = all.rounds;
    state.readbackOk = !!all.is_finalized_readback;
    renderAll();
    await sleep(3000);
    const lb = await readLeaderboards();
    state.liveBoards = lb;
    renderAll();
    await sleep(3000);
    const gal = await readGallery();
    state.liveGallery = gal.gallery;
    renderAll();
  } catch (e) {
    state.readbackError = String(e?.shortMessage || e?.message || e);
    renderAll();
  } finally {
    state.reading = false;
    renderAll();
  }
  try { state.chainId = await injectedChainId(); } catch { /* no wallet */ }
  renderAll();
}

// ---------- chrome (header / wallet bar / tabs / banner) ----------
function renderChrome() {
  $('#langBtn').textContent = state.lang === 'zh' ? 'EN' : '中文';
  $('#motionBtn').textContent = t(state.staticMode ? 'nav.motion_toggle_off' : 'nav.motion_toggle_on');
  document.querySelectorAll('[data-nav]').forEach((b) => {
    const active = b.dataset.nav === state.view || (b.dataset.nav === 'lobby' && state.view === 'workbench');
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
    b.textContent = ({ lobby: label('案件大厅', 'Cases'), gallery: label('馆藏', 'Gallery'),
      leaderboards: label('排行榜', 'Rankings'), evidence: label('链上证据', 'Evidence') })[b.dataset.nav];
  });
  $('#studioBtn').textContent = t('nav.forger_studio');
  // #appTitle lives inside #view in index.html, and renderAll() replaces
  // #view's innerHTML on the first render — after that the element no longer
  // exists. An unguarded assignment here threw on EVERY render after the
  // first, freezing the app in preview mode (dead round tabs, dead temp
  // button, footer never showing the contract). Guard it: the title is a
  // static first-paint label; the CASE heading takes over after render.
  const appTitleEl = $('#appTitle');
  if (appTitleEl) appTitleEl.textContent = t('app.title');
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  $('#appSub').textContent = label('真假馆', 'Investigation archive');
  // Banner: cold-start STATE-1 until a FINALIZED readback lands.
  const banner = $('#banner');
  if (!state.deployment) {
    banner.className = 'banner';
    // Retry affordance: a transient deployment.json fetch failure (e.g. a
    // Pages 503) used to brick the app with no recovery except a manual
    // reload. The button re-runs boot(), which re-fetches deployment.json
    // and continues to the readbacks.
    banner.innerHTML = `<span class="grow">⏳ ${esc(t('status.PREVIEW_SEED'))} — deployment.json</span><button id="retryDeployBtn">${esc(t('ui.refresh'))}</button>`;
  } else if (!state.readbackOk) {
    banner.className = 'banner';
    // R2: while a readback is in flight show an explicit "reading…" state
    // (a FINALIZED readback can take 1–2 minutes and the page looked dead);
    // once it fails, show the error text instead of failing silently.
    const readingTxt = state.reading
      ? `⏳ ${esc(t('ui.reading_state'))}`
      : `${esc(t('status.PREVIEW_SEED'))} · ${esc(t('status.UNCONFIRMED'))}`;
    const errTxt = (!state.reading && state.readbackError)
      ? ` <span class="small">⚠ ${esc(state.readbackError.slice(0, 160))}</span>` : '';
    banner.innerHTML = `<span class="grow">${readingTxt}${errTxt}</span><button id="refreshBtn" ${state.reading ? 'disabled' : ''}>${esc(t('ui.refresh'))}</button>`;
  } else {
    banner.className = 'banner ok';
    banner.innerHTML = `<span class="grow">✓ ${esc(label('Studionet · 已同步最终状态', 'Studionet · Finalized state synced'))}</span><button id="refreshBtn">${esc(t('ui.refresh'))}</button>`;
  }
  const rb = $('#refreshBtn');
  if (rb) rb.onclick = () => refreshLive();
  const rd = $('#retryDeployBtn');
  if (rd) rd.onclick = () => { if (state._booting) return; state._booting = true; boot().finally(() => { state._booting = false; }); };
  // Wallet bar
  const wb = $('#walletBar');
  const w = state.wallet;
  let html = '';
  if (state.chainId !== null && state.chainId !== CHAIN_ID) {
    html += `<span class="notice err" style="margin:0">⚠ ${esc(t('ui.chain_mismatch'))} (chainId ${state.chainId})</span><button id="switchChainBtn">${esc(t('ui.switch_chain'))}</button>`;
  }
  if (!w) {
    html += `<span>${esc(t('ui.no_wallet'))}</span><button id="connectBtn" class="primary">${esc(t('wallet.connect_injected'))}</button><button id="tempBtn">${esc(t('ui.use_temp'))}</button>`;
  } else if (w.mode === 'temporary') {
    html += `<span>🔑 ${esc(t('wallet.burner_active_badge'))}: <span class="mono">${esc(w.address)}</span></span><span class="muted small">${esc(t('wallet.burner_honest_notice'))}</span><button id="rotateBtn">${esc(t('wallet.switch_burner'))}</button><button id="destroyTempBtn">${esc(t('ui.destroy_temp'))}</button>`;
  } else {
    html += `<span>👛 ${esc(w.address)} <span class="muted small">(OKX / EVM · chain ${CHAIN_ID})</span></span><button id="tempBtn">${esc(t('ui.use_temp'))}</button>`;
  }
  wb.innerHTML = html;
  const bind = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  bind('#connectBtn', onConnectInjected);
  bind('#tempBtn', () => { state.wallet = temporaryAccount(); renderAll(); });
  bind('#rotateBtn', () => { state.wallet = rotateTemporaryAccount(); renderAll(); });
  bind('#destroyTempBtn', () => { destroyTemporaryAccount(); state.wallet = null; renderAll(); });
  bind('#switchChainBtn', onSwitchChain);
  // Footer
  const ft = $('#footerLine');
  if (state.deployment) {
    ft.innerHTML = `Contract <a class="mono" href="${esc(explorerAddress(state.deployment.contract_address))}" target="_blank" rel="noreferrer">${esc(state.deployment.contract_address)}</a> · Studionet ${CHAIN_ID} · <a href="${esc(EXPLORER_BASE)}" target="_blank" rel="noreferrer">explorer-studio.genlayer.com</a> · source SHA-256 <span class="mono">${esc(state.deployment.source_sha256.slice(0, 16))}…</span> · byte parity ${esc(state.deployment.byte_parity)}${state.version ? ` · bundle <span class="mono">${esc(state.version.bundle_sha256.slice(0, 12))}</span>` : ''}`;
  }
}

async function refreshLive() {
  // R2: same visible "reading…" state as boot (see banner branch above).
  state.reading = true;
  renderAll();
  try {
    const all = await readAllRounds();
    state.liveRounds = all.rounds;
    state.readbackOk = !!all.is_finalized_readback;
    state.readbackError = null;
    await sleep(3000);
    state.liveBoards = await readLeaderboards();
    await sleep(3000);
    state.liveGallery = (await readGallery()).gallery;
  } catch (e) {
    state.readbackError = String(e?.shortMessage || e?.message || e);
  } finally {
    state.reading = false;
  }
  renderAll();
}

async function onConnectInjected() {
  try {
    state.wallet = await connectInjected();
    state.chainId = CHAIN_ID;
  } catch (e) {
    alert('Connect failed: ' + (e?.shortMessage || e?.message || e));
  }
  renderAll();
}
async function onSwitchChain() {
  try {
    const p = injectedProvider();
    await p.request({ method: 'wallet_addEthereumChain', params: [{ chainId: '0xf22f', chainName: 'GenLayer Studionet', nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, rpcUrls: ['https://studio.genlayer.com/api'], blockExplorerUrls: [EXPLORER_BASE] }] });
    state.chainId = CHAIN_ID;
  } catch (e) { alert('Switch failed: ' + (e?.message || e)); }
  renderAll();
}

// ---------- verdict rendering (4-branch exhaustive table) ----------
function verdictBranch(r, live) {
  if (!live || !r.verdict) return 'unconfirmed';
  if (r.verdict === 'FAKE_A' || r.verdict === 'FAKE_B') return r.verdict;
  if (r.verdict === 'VOID') return 'VOID';
  return 'unconfirmed';
}
function verdictBanner(r, live) {
  const b = verdictBranch(r, live);
  if (b === 'FAKE_A' || b === 'FAKE_B') {
    const fakeSide = b === 'FAKE_A' ? 'A' : 'B';
    return `<div class="verdict-banner fake"><h2>${esc(t('verdict.' + b))}</h2>
      <div>${esc(t('flaw.' + (r.flaw_category || 'NONE')))} · ${esc(r.flaw_category || '')}</div>
      <div class="small muted">${esc(t('anchor.source_excerpt'))}: “${esc(r.source_quote || '')}”</div>
      <div class="small">${esc(r.audit_summary || '')}</div></div>`;
  }
  if (b === 'VOID') {
    return `<div class="verdict-banner void"><h2>${esc(t('verdict.VOID'))}</h2>
      <div class="small">${esc(t('flaw.' + (r.verdict === 'VOID' && r.reveal_mode === 'COMMITMENT_CONTRADICTED' ? 'VOID_INVALID_PAIR' : 'VOID_NO_FORGERY')))} · reveal_mode ${esc(r.reveal_mode || '')} · allocation 0 PTS</div>
      <div class="small muted">${esc(r.audit_summary || '')}</div></div>`;
  }
  return `<div class="verdict-banner sealed"><h2>${esc(t('status.UNCONFIRMED'))}</h2>
    <div class="small">${esc(t('status.PREVIEW_SEED'))} — ${esc(t('ui.export_blocked'))}</div></div>`;
}
function stampFor(side, r, live) {
  const b = verdictBranch(r, live);
  if (b === 'unconfirmed') return `<span class="stamp sealed verdict-stamp">${esc(t('status.UNCONFIRMED'))}</span>`;
  if (b === 'VOID') return `<span class="stamp void verdict-stamp">VOID / ${esc(t('status.UNCONFIRMED').split(' / ')[0])}</span>`;
  const isFake = (b === 'FAKE_A' && side === 'A') || (b === 'FAKE_B' && side === 'B');
  return isFake
    ? `<span class="stamp fake verdict-stamp">${esc(t('verdict.stamp_forgery'))}</span>`
    : `<span class="stamp real verdict-stamp">${esc(t('verdict.stamp_authentic'))}</span>`;
}
const pts = (v, live) => (live ? String(v) + ' PTS' : t('ui.unconfirmed_points'));

// ---------- archive navigation ----------
const filterNames = () => ({
  all: label('全部案件', 'All cases'), join: label('可加入', 'Open'),
  reveal: label('揭示与待裁决', 'Reveal & judgment'), closed: label('已裁决', 'Judged'),
  inactive: label('已撤回', 'Withdrawn'),
});

function navigate(view, id = null) {
  if (id) {
    state.roundId = id;
    state.loupe = 'all';
    state.mobileSide = 'A';
  }
  state.view = view;
  const url = caseUrl(view === 'workbench' ? state.roundId : null);
  if (url.href !== location.href) history.pushState(null, '', url);
  renderAll();
  window.scrollTo(0, 0);
  $('#view').focus({preventScroll: true});
}

function media(url, alt = '') {
  const source = httpsUrl(url);
  return source ? `<div class="archive-media"><img src="${esc(source)}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer"></div>`
    : '<div class="archive-media"></div>';
}

function caseEvidence(round) {
  if (!round || !state.deployment) return null;
  const address = state.deployment.contract_address.toLowerCase();
  if (address === milestoneEvidence.address.toLowerCase() &&
      round.round_id === milestoneEvidence.readbacks.final.round_id) {
    return milestoneEvidence.transactions;
  }
  if (address !== showcaseEvidence.address.toLowerCase()) return null;
  const record = Object.values(showcaseEvidence.cases).find((entry) =>
    entry.id === round.round_id && entry.theme === round.theme);
  return record?.steps ?? null;
}

function demoTag(round) {
  return caseEvidence(round) ? `<span class="demo-tag">${esc(label('链上演示', 'On-chain demo'))}</span>` : '';
}

function receiptLinks(round) {
  const steps = caseEvidence(round);
  return Object.entries(steps ?? {}).filter(([, step]) => step.receipt).map(([name, step]) => ({
    label: name, hash: step.hash, explorer: explorerTx(step.hash), execution: step.receipt.execution,
  }));
}

function receiptLabel(name) {
  const labels = {
    create: label('创建案件', 'Case created'), commit: label('封存选票', 'Ballot committed'),
    commit_one: label('第一份承诺', 'First commitment'), commit_two: label('第二份承诺', 'Second commitment'),
    lock: label('锁定承诺', 'Commitments locked'), reveal: label('揭示选票', 'Ballot revealed'),
    reveal_one: label('有效揭示', 'Ballot revealed'), settle: label('完成裁决', 'Judgment'),
    archive: label('案件归档', 'Case archived'),
  };
  return labels[name] ?? (name.startsWith('judge_') ? label('共识裁决', 'Consensus judgment') : name.replaceAll('_', ' '));
}

function caseStatusLabel(round) {
  if (round.status === 'VOTING') return label('正在收票', 'Collecting ballots');
  if (round.status === 'REVEALED') return label('已归档', 'Archived');
  if (round.status === 'BALLOT_REVEAL') {
    const allRevealed = round.vote_count === Object.keys(round.ballot_commitments ?? {}).length;
    return allRevealed || timeRemaining(round.reveal_deadline) === 0
      ? label('待裁决', 'Ready for judgment') : label('等待揭示', 'Revealing');
  }
  return filterNames()[caseStage(round.status)];
}

function lobbyHtml() {
  const cases = [...(state.liveRounds ?? [])].sort((a, b) => b.round_id - a.round_id);
  const featured = cases.find((r) => r.round_id === 1) ?? cases[0];
  const names = filterNames();
  const cards = cases.filter((r) => state.filter === 'all' || caseStage(r.status) === state.filter);
  return `<section class="archive-hero">
    <div class="hero-copy">
      <h1>${esc(label('真假馆', 'FakeHall'))}<br><em>${esc(label('调查档案', 'Investigation Archive'))}</em></h1>
      <p>${esc(label('比对两件展品，查阅公开来源，提交你的密封选票。', 'Compare two exhibits, examine the public record, and cast a sealed ballot.'))}</p>
      <div class="hero-actions">
        ${featured ? `<a class="action-link primary" data-case-link href="${esc(caseUrl(featured.round_id))}">${esc(label('查看示范案件', 'Open the featured case'))} <span aria-hidden="true">↗</span></a>` : ''}
        <button id="lobbyCreate">${esc(label('创建案件', 'Create a case'))}</button>
      </div>
    </div>
    <figure class="hero-object">
      <div class="hero-frame">
        ${media(featured?.item_a?.image_url ?? SEEDS[0].item_a.image_url, featured?.item_a?.title ?? SEEDS[0].item_a.title)}
        <figcaption>${esc(featured?.item_a?.title ?? SEEDS[0].item_a.title)}</figcaption>
      </div>
    </figure>
  </section>
  <section class="case-index" aria-labelledby="caseIndexTitle">
    <div class="section-heading"><h2 id="caseIndexTitle">${esc(label('案件索引', 'Case index'))}</h2><span>${cases.length} ${esc(label('个链上案件', 'on-chain cases'))}</span></div>
    <div class="case-filters" role="group" aria-label="${esc(label('案件筛选', 'Filter cases'))}">
      ${Object.entries(names).filter(([key]) => key !== 'inactive').map(([key, name]) =>
        `<button data-filter="${key}" aria-pressed="${state.filter === key}">${esc(name)} <span class="filter-count">${key === 'all' ? cases.length : cases.filter((row) => caseStage(row.status) === key).length}</span></button>`).join('')}
    </div>
    <div class="case-cards">
      ${cards.map((r) => {
        const [title, ...qualifier] = r.theme.split(' — ');
        const subtitle = qualifier.join(' — ');
        return `<a class="case-card" data-case-link href="${esc(caseUrl(r.round_id))}">
        ${media(r.item_a.image_url)}
        <div class="card-copy"><span class="case-meta">#${r.round_id} <span data-stage="${caseStage(r.status)}">${esc(caseStatusLabel(r))}</span> ${demoTag(r)}</span>
        <h3>${esc(title)}</h3>${subtitle ? `<p class="card-subtitle">${esc(subtitle)}</p>` : ''}
          <span class="card-arrow" aria-hidden="true">↗</span></div>
        </a>`;
      }).join('')}
    </div>
    ${cards.length ? '' : `<p class="index-empty">${esc(state.reading || !state.deployment ? label('正在读取案件…', 'Reading cases…') : state.readbackError ? label('暂时无法读取案件。请重新同步。', 'Cases could not be loaded. Refresh to try again.') : label('此状态下暂无案件。', 'No cases in this category.'))}</p>`}
  </section>`;
}

function showSources() {
  const r = liveRound(state.roundId);
  if (!r) return;
  $('#sourceDialog button').setAttribute('aria-label', label('关闭', 'Close'));
  const urls = [['anchor.primary_source', r.source_url], ['anchor.backup_source', r.backup_source_url]];
  $('#sourceContent').innerHTML = `<h2 id="sourceTitle">${esc(label('来源档案', 'Source record'))}</h2>
    ${r.source_quote ? `<blockquote>${esc(r.source_quote)}</blockquote>` : `<p>${esc(label('裁决后会在这里显示验证者提取的引用。', 'The validators’ excerpt appears here after judgment.'))}</p>`}
    ${r.audit_summary ? `<p>${esc(r.audit_summary)}</p>` : ''}
    <ul>${urls.filter(([, url]) => httpsUrl(url)).map(([name, url]) =>
      `<li><a href="${esc(httpsUrl(url))}" target="_blank" rel="noreferrer">${esc(t(name))} ↗</a></li>`).join('')}</ul>`;
  $('#sourceDialog').showModal();
}

function countdown() {
  const el = $('#revealClock');
  if (!el) return;
  const seconds = timeRemaining(el.dateTime);
  if (seconds > 0) {
    el.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    return;
  }
  el.textContent = label('揭示已截止', 'Reveal closed');
  if (!state.writing && $('#revealBallotBtn')) renderAll();
  const r = liveRound(state.roundId);
  if (!state.writing && r && r.status === 'BALLOT_REVEAL') {
    if ($('#closeBtn')) $('#closeBtn').disabled = !state.wallet;
    if ($('#resolveBtn')) $('#resolveBtn').disabled = !state.wallet || !(state.wallet.address === r.forger_address || r.investigations.some((row) => row.detective === state.wallet.address));
  }
}

// ---------- workbench ----------
function exhibitHtml(side, item, r, live, loupe) {
  const dims = [
    ['date', 'compare.dim_date', item.claimed_date],
    ['material', 'compare.dim_material', item.claimed_material],
    ['provenance', 'compare.dim_provenance', item.claimed_provenance],
    ['narrative', 'compare.dim_narrative', item.narrative],
  ];
  const other = side === 'A' ? r.item_b : r.item_a;
  const rows = dims.map(([key, labelKey, val]) => {
    const otherVal = { date: other.claimed_date, material: other.claimed_material, provenance: other.claimed_provenance, narrative: other.narrative }[key];
    const diff = String(val) !== String(otherVal);
    const sel = loupe === 'all' || loupe === key;
    return `<div class="dim-row ${diff ? 'diff' : ''}" data-dimension-selected="${sel}" data-dim="${key}">
      <div class="dim-label">${esc(t(labelKey))}${diff ? ' ◈' : ''}</div>
      <div class="dim-val">${esc(val)}</div></div>`;
  }).join('');
  return `<div class="exhibit" data-side="${side}"><h3>${side === 'A' ? esc(t('ui.exhibit_a')) : esc(t('ui.exhibit_b'))} ${stampFor(side, r, live)}</h3>
    ${media(item.image_url, item.title)}
    <div class="dim-row"><div class="dim-label">Title</div><div class="dim-val"><strong>${esc(item.title)}</strong></div></div>
    ${rows}</div>`;
}

function workbenchHtml() {
  const id = state.roundId;
  if (!liveRound(id)) {
    const message = state.reading || !state.deployment ? label('正在读取案件…', 'Reading case…')
      : state.readbackError ? label('暂时无法读回案件。', 'Could not read the case.')
      : label('没有找到这个链上案件。', 'This on-chain case was not found.');
    return `<section class="panel empty-case"><h1>${esc(message)}</h1><button id="allCases">${esc(label('返回案件大厅', 'Back to cases'))}</button></section>`;
  }
  const r = roundData(id);
  const live = isLive(id);
  const seed = previewRound(id);
  const w = state.wallet;
  const isForger = w && w.address === (r.forger_address || '').toLowerCase();
  const voted = w ? (r.investigations || []).some((i) => (i.detective || '').toLowerCase() === w.address) : false;
  const sealedBallots = live && !!r.ballot_commitments;
  const commitments = r.ballot_commitments || {};
  const commitCount = Object.keys(commitments).length;
  const committed = w && Object.hasOwn(commitments, w.address);
  const deadlinePassed = Date.now() >= Date.parse(r.reveal_deadline);
  const draft = state.voteDrafts.get(id);
  let ballotSaved = false;
  if (w && sealedBallots) {
    try { ballotSaved = !!localStorage.getItem(ballotKey(id, w.address)); } catch { /* unavailable */ }
  }
  const canLock = w && (isForger || commitCount === r.max_detectives);
  const canJudge = w && (r.vote_count === commitCount || deadlinePassed);
  const canClose = r.status === 'VOTING' && (r.vote_count || 0) >= 1 && (isForger || (r.vote_count || 0) >= (r.max_detectives || 3));
  const loupe = state.loupe;
  const loupeBtns = [['all', 'compare.loupe_all'], ['date', 'compare.dim_date'], ['material', 'compare.dim_material'], ['provenance', 'compare.dim_provenance'], ['narrative', 'compare.dim_narrative']]
    .map(([k, lk]) => `<button data-loupe="${k}" class="${loupe === k ? 'active' : ''}">${esc(t(lk))}</button>`).join('');

  // Sealed board
  const board = sealedBallots && commitCount > 0
    ? Object.entries(commitments).map(([address, digest]) => {
        const ballot = r.investigations.find((row) => row.detective === address);
        const phase = ballot ? (r.status === 'BALLOT_REVEAL' ? label('已揭示', 'Revealed') : `${ballot.suspected_fake} · ${ballot.points_awarded} PTS`)
          : (r.status === 'JUDGED' || r.status === 'REVEALED' || deadlinePassed ? label('未揭示', 'Unrevealed') : label('已承诺', 'Committed'));
        return `<div class="board-row"><span class="mono" title="${esc(address)}">${esc(shortAddr(address))}</span><span title="${esc(digest)}">${esc(phase)}</span></div>`;
      }).join('')
    : (r.investigations || []).length === 0
    ? `<p class="muted">${esc(t('ui.empty_round'))}</p>`
    : (r.investigations || []).map((inv, i) => {
        const sealed = inv.suspected_fake === 'SEALED_UNTIL_JUDGED';
        return `<div class="board-row"><span>#${i + 1} <span class="mono">${esc(shortAddr(inv.detective))}</span></span>
          <span>${sealed ? `<span class="sealed-tag">${esc(t('board.sealed_badge'))}</span>` : `${esc(inv.suspected_fake)} · ${esc(inv.flaw_category)} · ${esc(inv.points_awarded)} PTS`}</span></div>`;
      }).join('');

  // R2 key-loss note (live demo path)
  const r2note = (live && !sealedBallots && id === 2 && r.status === 'VOTING')
    ? `<div class="notice">${esc(t('ui.r2_note'))}</div>` : '';

  // Actions per state machine + permissions
  let actions = '';
  if (live && w && !isForger && !committed && !voted && (r.status === 'OPEN' || r.status === 'VOTING')) {
    const voteDisabled = !live || !w || isForger || (sealedBallots ? committed || commitCount >= r.max_detectives
      : voted || r.vote_count >= r.max_detectives);
    const voteLabel = sealedBallots ? label('提交投票承诺', 'Commit ballot') : t('action.submit_judgment');
    actions += `<h3>1 · ${esc(voteLabel)}</h3>
      <label><input type="radio" name="voteChoice" value="FAKE_A" ${draft?.choice === 'FAKE_A' ? 'checked' : ''}> ${esc(t('action.vote_fake_a'))}</label>
      <label><input type="radio" name="voteChoice" value="FAKE_B" ${draft?.choice === 'FAKE_B' ? 'checked' : ''}> ${esc(t('action.vote_fake_b'))}</label>
      <label>${esc(t('ui.flaw_label'))}</label>
      <select id="voteFlaw">${['DATE_MISMATCH', 'MATERIAL_MISMATCH', 'PROVENANCE_MISMATCH', 'FACT_FABRICATION'].map((flaw) => `<option value="${flaw}" ${draft?.flaw === flaw ? 'selected' : ''}>${esc(t('flaw.'+flaw))}</option>`).join('')}</select>
      <label>${esc(t('ui.note_label'))}</label>
      <textarea id="voteNote" maxlength="280" rows="3" placeholder="${esc(label('记录你发现的证据', 'Write the evidence you found'))}">${esc(draft?.note ?? '')}</textarea>
      <p><button id="voteBtn" class="primary" ${voteDisabled ? 'disabled' : ''}>${esc(voteLabel)}</button>
      ${!w ? `<span class="muted small"> — ${esc(t('ui.no_wallet'))}</span>` : ''}</p>`;
  }
  if (sealedBallots && r.status === 'VOTING') {
    actions += `<p><button id="lockBallotsBtn" class="amber" ${canLock ? '' : 'disabled'}>${esc(label('锁定承诺并开放揭示', 'Lock commitments and open reveal'))}</button>
      <span class="muted"> ${commitCount}/${r.max_detectives}</span></p>`;
  }
  if (sealedBallots && r.status === 'BALLOT_REVEAL') {
    actions += `<h3>${esc(label('揭示选票', 'Reveal ballots'))}</h3>
      <p>${esc(label('已揭示', 'Revealed'))} ${r.vote_count}/${commitCount} ·
      <time id="revealClock" datetime="${esc(r.reveal_deadline)}" title="${esc(new Date(r.reveal_deadline).toLocaleString())}"></time></p>
      ${committed && !voted && !deadlinePassed ? `<p><button id="revealBallotBtn" class="primary" ${ballotSaved ? '' : 'disabled'}>${esc(label('揭示我的选票', 'Reveal my ballot'))}</button></p>` : ''}
      <p><button id="closeBtn" class="amber" ${canJudge ? '' : 'disabled'}>${esc(t('action.close_and_judge'))}</button>
      <button id="resolveBtn" ${canJudge && (voted || isForger) ? '' : 'disabled'}>${esc(t('ui.resolve_unreachable'))}</button></p>
      <p class="muted small">${esc(label('全部揭示后即可裁决。到期未揭示的选票不计分。', 'Judging opens after all ballots are revealed or the deadline passes. Unrevealed ballots do not score.'))}</p>`;
  }
  if (live && !sealedBallots && r.status === 'VOTING') {
    actions += `<h3>2 · close_and_judge</h3>${r2note}
      <p><button id="closeBtn" class="amber" ${!canClose ? 'disabled' : ''}>${esc(t('action.close_and_judge'))}</button>
      <span class="small muted"> ${esc(r.vote_count || 0)}/${esc(r.max_detectives || 3)} ${esc(t('ui.votes'))}${isForger ? ' · forger' : ''}${(r.vote_count || 0) >= (r.max_detectives || 3) ? ' · full house — anyone may close' : ''}</span></p>
      <p><button id="resolveBtn" ${!w ? 'disabled' : ''}>${esc(t('ui.resolve_unreachable'))}</button>
      <span class="small muted"> — ${esc(t('ui.fail_closed').split('。')[0])}</span></p>`;
  }
  if (live && r.status === 'JUDGED') {
    actions += `<h3>2 · ${esc(t('action.reveal_forgery'))} / ${esc(t('action.archive_judged_round'))}</h3>`;
    if (isForger) {
      actions += `<label>secret_fake_choice</label><select id="revealChoice"><option>FAKE_A</option><option>FAKE_B</option></select>
        <label>salt</label><input id="revealSalt" placeholder="salt used at creation">
        <div id="revealHashCheck" class="small muted"></div>
        <label>${esc(t('ui.confession'))}</label><input id="revealConfession" maxlength="500">
        <p><button id="revealBtn" class="primary">${esc(t('action.reveal_forgery'))}</button>
        <button id="restoreSaltBtn">${esc(t('ui.salt_restore'))}</button></p>`;
    } else {
      actions += `<p class="muted small">reveal_forgery: forger only.</p>`;
    }
    actions += `<p><button id="archiveBtn" ${!w ? 'disabled' : ''}>${esc(t('action.archive_judged_round'))}</button></p>`;
  }
  if (live && r.status === 'OPEN' && isForger) {
    actions += `<p><button id="cancelBtn" class="danger">${esc(t('action.cancel_open_round'))}</button></p>`;
  }
  if (live && r.status === 'REVEALED' && r.reveal_mode && ['VOID_ARCHIVED', 'CONSENSUS_ARCHIVED'].includes(r.reveal_mode) && isForger) {
    actions += `<h3>${esc(t('ui.supplement'))}</h3><p class="small muted">${esc(t('ui.supplement_note'))}</p>
      <label>secret_fake_choice</label><select id="suppChoice"><option>FAKE_A</option><option>FAKE_B</option></select>
      <label>salt</label><input id="suppSalt" placeholder="salt used at creation">
      <p><button id="suppBtn">${esc(t('ui.supplement'))}</button></p>`;
  }
  if (r.status === 'REVEALED' && r.supplement_verified) {
    actions += `<p class="small">supplement_verified: true · supplement_choice ${esc(r.supplement_choice || '')}</p>`;
  }

  if (sealedBallots && w && !voted && !isForger && (committed || r.status === 'OPEN' || r.status === 'VOTING')) {
    actions += `${committed ? `<p class="ballot-slip">${esc(ballotSaved ? label('已封存 · 本机可以恢复选票', 'Sealed · Ballot available on this device') : label('已封存 · 请导入本局选票备份', 'Sealed · Restore this ballot from backup'))}</p>` : ''}
      <p><button id="backupBallotBtn" ${ballotSaved ? '' : 'disabled'}>${esc(label('下载选票备份', 'Download ballot backup'))}</button>
      <label>${esc(label('从文件恢复选票', 'Restore ballot from file'))}<input id="importBallot" type="file" accept=".json,application/json"></label></p>
      <p class="muted small">${esc(label('请在揭示前保密备份文件，并用原投票钱包揭示。', 'Keep the backup private until reveal and reveal using the original signer.'))}</p>`;
  }

  // Export gate: enabled ONLY on a readback snapshot that carries the flag
  // set by readRound itself. Preview seeds never carry it.
  const snap = liveRound(id);
  const exportOk = !!(snap && snap.is_finalized_readback && ['JUDGED', 'REVEALED'].includes(snap.status));
  const txHtml = state.tx?.roundId === id ? txPipelineHtml() : '';

  return `
  <div class="case-toolbar"><button id="allCases">← ${esc(label('全部案件', 'All cases'))}</button>
    <div><button id="openSources">${esc(label('来源档案', 'Source record'))}</button>
    <button id="shareCase">${esc(label('分享案件', 'Share case'))} ↗</button></div>
    <output id="shareStatus" role="status"></output></div>
  <section class="case-heading">
    <p class="case-meta">#${String(id).padStart(2, '0')} <span data-stage="${caseStage(r.status)}">${esc(caseStatusLabel(r))}</span> ${demoTag(r)}</p>
    <h1>${esc(r.theme || seed?.theme)}</h1>
    <ol class="case-steps">${[label('提交承诺', 'Commit'), label('揭示选票', 'Reveal'), label('共识裁决', 'Judge'), label('结案归档', 'Archive')].map((step, i) => {
      const current = ({ OPEN: 0, VOTING: 0, BALLOT_REVEAL: 1, JUDGED: 2, REVEALED: 3 })[r.status];
      return `<li ${i === current ? 'aria-current="step"' : ''} data-complete="${i < current || r.status === 'REVEALED'}"><span aria-hidden="true">${i + 1}</span>${esc(step)}</li>`;
    }).join('')}</ol>
  </section>
  ${verdictBanner(r, live)}
  <div class="workbench">
    <div>
      <div class="panel">
        <div class="compare-bar" role="group" aria-label="loupe">${loupeBtns}</div>
        <div class="side-toggle" role="group" aria-label="${esc(label('切换展品', 'Switch exhibit'))}">
          ${['A','B'].map((side) => `<button data-side-toggle="${side}" aria-pressed="${side === state.mobileSide}">${esc(t(side === 'A' ? 'ui.exhibit_a' : 'ui.exhibit_b'))}</button>`).join('')}</div>
        <div class="comparison-grid" data-loupe-active="${loupe !== 'all'}" data-mobile-side="${state.mobileSide}" id="compareGrid">
          ${exhibitHtml('A', r.item_a, r, live, loupe)}
          ${exhibitHtml('B', r.item_b, r, live, loupe)}
        </div>

      </div>
      ${txHtml}
    </div>
    <div class="case-sidebar">
      <div class="panel ballot-board"><h3> ${esc(t('ui.detectives'))} — ${esc(r.vote_count || 0)}/${esc(r.max_detectives || 3)}</h3>${board}
        <dl class="kv"><dt>${esc(t('ui.forger'))}</dt><dd class="score">${pts(r.forger_points, live)}</dd></dl>
      </div>
      <div class="panel action-panel" id="caseActions">
        <h3>${esc(isForger ? label('造假者工作台', 'Forger desk') : w ? label('侦探工作台', 'Detective desk') : label('旁观者视图', 'Observer view'))}</h3>
        ${!w && !exportOk ? `<p class="muted">${esc(label('连接钱包后可以参与该案。', 'Connect a wallet to participate.'))}</p><button id="caseConnect">${esc(label('连接钱包', 'Connect wallet'))}</button>` : ''}
        ${actions}
        <hr style="border-color:var(--border-hairline)">
        <p><button id="exportBtn" ${exportOk ? '' : 'disabled'}>${esc(t('action.export_dossier'))}</button>
        ${exportOk ? '' : `<span class="small muted"> ${esc(t('ui.export_blocked'))}</span>`}</p>
        <p class="small muted">${esc(sealedBallots ? label('承诺 → 锁定 → 揭示 → 裁决', 'Commit → Lock → Reveal → Judge') : t('ui.full_loop_hint'))}</p>
      </div>
    </div>
  </div>
  ${caseEvidence(r) ? `<details class="panel case-receipts"><summary>${esc(exportOk ? label('结案交易证据', 'Case transaction evidence') : label('已确认的演示交易', 'Finalized demo transactions'))}</summary>
    ${receiptLinks(r).map((step) =>
      `<a href="${esc(step.explorer)}" target="_blank" rel="noreferrer">${esc(receiptLabel(step.label))}${step.execution === 'SUCCESS' ? '' : ' · ' + esc(label('未通过', 'Failed'))} ↗</a>`).join('')}</details>` : ''}`;
}

function txPipelineHtml() {
  const tx = state.tx;
  const steps = [label('等待签名', 'Awaiting signature'), label('已广播', 'Broadcast'), label('收据已最终确认', 'Receipt finalized'), label('已读回链上状态', 'State read back')];
  const lis = steps.map((s, i) => {
    const cls = i < tx.phase || (i === 3 && tx.phase === 3) ? 'done' : (i === tx.phase ? 'active' : '');
    return `<li class="${cls}">${esc(s)}</li>`;
  }).join('');
  let extra = '';
  if (tx.error === 'FAIL_CLOSED') {
    extra = `<div class="notice">${esc(t('ui.fail_closed'))}</div>
      <p><button id="retryCloseBtn" class="amber">${esc(t('ui.retry_close'))}</button>
      <a href="${esc(roundData(tx.roundId).source_url)}" target="_blank" rel="noreferrer"><button>${esc(t('ui.check_source'))}</button></a></p>`;
  }
  if (tx.error && tx.error !== 'FAIL_CLOSED') {
    extra = `<div class="notice err">${esc(tx.error)}</div>`;
    // R2: a failure BEFORE broadcast (no tx hash yet) gets a visible retry
    // button; after broadcast the resume-hash control below is the retry.
    if (!tx.hash && tx.retry) extra += `<p><button id="retryWriteBtn" class="amber">${esc(t('ui.retry_write'))}</button></p>`;
  }
  return `<div class="panel"><h3>${esc(t('ui.close_steps'))} — ${esc(tx.method)} (attempt ${tx.attempts})</h3>
    <ul class="pipeline">${lis}</ul>
    ${tx.hash ? `<p class="hash">tx <a href="${esc(explorerTx(tx.hash))}" target="_blank" rel="noreferrer">${esc(tx.hash)}</a></p>
    <p><a href="${esc(explorerTx(tx.hash))}" target="_blank" rel="noreferrer">${esc(t('ui.view_tx'))} ↗</a></p>` : `<p class="muted small">${esc(t('ui.tx_pending'))}</p>`}
    <p><label>tx hash</label><input id="resumeHash" value="${esc(tx.hash || '')}" placeholder="0x…">
    <button id="resumeBtn" style="margin-top:.4rem">${esc(t('ui.resume_poll'))}</button></p>${extra}</div>`;
}

// ---------- gallery / leaderboards / evidence ----------
function galleryHtml() {
  const live = state.liveGallery;
  const items = live || SEEDS.filter((s) => s.expected_final_status === 'REVEALED' && s.expected_verdict && s.expected_verdict !== 'VOID');
  if (live && live.length === 0) return `<div class="panel"><p>${esc(t('ui.empty_gallery'))}</p></div>`;
  const cards = (live ? items : items.map((s) => ({
    round_id: s.round_id, theme: s.theme, verdict: s.expected_verdict, flaw_category: s.expected_flaw,
    source_quote: s.source_quote_candidate, audit_summary: '', forger_address: EVIDENCE.wallets.F,
    reveal_mode: s.expected_reveal_mode, confession: '', fake_item: s.expected_verdict === 'FAKE_A' ? s.item_a : s.item_b,
  }))).map((g) => `<div class="gallery-card">
    <div style="display:flex;gap:.6rem;align-items:baseline;flex-wrap:wrap"><span class="stamp fake">${esc(t('verdict.stamp_forgery'))} · ${esc(g.verdict)}</span>
    <strong>Round #${String(g.round_id).padStart(2, '0')} · ${esc(g.theme)}</strong>${live ? '' : ` <span class="sealed-tag">${esc(t('status.PREVIEW_SEED'))}</span>`}</div>
    <p class="small">${esc(t('flaw.' + (g.flaw_category || 'NONE')))} · reveal_mode ${esc(g.reveal_mode || '')}</p>
    <p class="small muted">“${esc(g.source_quote || '')}”</p>
    ${g.fake_item?.image_url ? `<img src="${esc(g.fake_item.image_url)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=img-fallback>${esc(t('ui.img_unreachable'))}</div>'">` : ''}
    <p class="small">${esc(g.fake_item?.title || '')} — ${esc(g.fake_item?.claimed_provenance || '')}</p>
    <p><button data-goto-round="${g.round_id}">回看本局完整勘验台</button></p></div>`).join('');
  return `<div class="panel"><h2>${esc(t('nav.gallery'))}</h2>
    <p class="small muted">Rounds ${esc(items.map((row) => row.round_id).join(', '))} · ${esc(t('status.REVEALED'))} + verdict ≠ VOID · ${live ? esc(t('ui.readback_ok')) : esc(t('status.PREVIEW_SEED'))}</p></div>${cards}`;
}

function leaderboardsHtml() {
  const lb = state.liveBoards;
  if (!lb) return `<div class="panel"><h2>${esc(t('nav.leaderboards'))}</h2><p>${esc(t('status.UNCONFIRMED'))} — ${esc(t('ui.readback_fail'))}</p></div>`;
  const forg = (lb.forgers || []).map((f, i) => `<tr><td>#${i + 1}</td><td class="mono">${esc(shortAddr(f.address))}</td><td class="num">${esc(f.total_points)} PTS</td><td class="num">${(f.deception_rate_bps / 100).toFixed(2)}% (${esc(f.deception_rate_bps)} bps)</td><td class="num">${esc(f.total_fooled)}/${esc(f.total_challenged)} · ${esc(f.revealed_rounds_count)} rounds</td></tr>`).join('');
  const det = (lb.detectives || []).map((d, i) => `<tr><td>#${i + 1}</td><td class="mono">${esc(shortAddr(d.address))}</td><td class="num">${esc(d.total_points)} PTS</td><td class="num">${(d.accuracy_bps / 100).toFixed(2)}% (${esc(d.accuracy_bps)} bps)</td><td class="num">${esc(d.correct_cases)}/${esc(d.valid_cases)}</td></tr>`).join('');
  return `<div class="panel"><h2>${esc(t('rank.forger_title'))}</h2>
    <table><thead><tr><th>#</th><th>Forger</th><th class="num">Points</th><th class="num">Deception</th><th class="num">Fooled / Challenged</th></tr></thead><tbody>${forg || '<tr><td colspan="5">—</td></tr>'}</tbody></table></div>
  <div class="panel"><h2>${esc(t('rank.detective_title'))}</h2>
    <table><thead><tr><th>#</th><th>Detective</th><th class="num">Points</th><th class="num">Accuracy</th><th class="num">Correct / Valid</th></tr></thead><tbody>${det || '<tr><td colspan="5">—</td></tr>'}</tbody></table>
    <p class="small muted">get_leaderboards() · latest-final · ${esc(t('ui.readback_ok'))}</p></div>`;
}

const ADV = [
  ['ADV-1', 'Both-fake → VOID', 'R3', 'VOID / NONE, all 0 PTS', 'VOID / NONE, all 0 PTS'],
  ['ADV-2', 'Clone gate + both-true → VOID', 'clone-gate tx + R6', 'revert ITEMS_IDENTICAL_NO_LLM_NEEDED; R6 VOID', 'revert observed; R6 VOID / NONE'],
  ['ADV-3', 'Irrelevant source → VOID', 'R7', 'VOID / NONE, all 0 PTS', 'VOID / NONE, all 0 PTS'],
  ['ADV-4', 'Commitment swap / wrong salt → revert', 'R5', 'revert COMMITMENT_HASH_MISMATCH, then correct reveal', 'revert observed, then REVEALED FORGER_VERIFIED'],
  ['ADV-5', 'Forger self-vote → revert', 'R2', 'revert FORGER_CANNOT_VOTE_OWN_ROUND', 'revert observed'],
  ['ADV-6', 'Dead link → fail-closed revert, stays VOTING', 'R8', 'revert SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED', 'revert observed, round stayed VOTING'],
  ['ADV-7', 'Duplicate vote → revert', 'R2', 'revert DETECTIVE_ALREADY_VOTED', 'revert observed'],
  ['ADV-8', 'Lost-salt archive exit (detective archives)', 'R6', 'REVEALED VOID_ARCHIVED, forger 0', 'REVEALED VOID_ARCHIVED, forger 0'],
  ['ADV-9', 'resolve_unreachable_round → VOID via consensus', 'R8', 'VOID / JUDGED, then REVEALED', 'VOID / JUDGED → REVEALED VOID_ARCHIVED'],
  ['ADV-10', 'Replay: second reveal / archive after REVEALED → revert', 'R1', 'revert ROUND_ALREADY_FINALIZED', 'revert observed (×2)'],
];

function evidenceHtml() {
  const milestone = state.deployment?.ballot_protocol === 2;
  const rounds = EVIDENCE.rounds;
  const human = `
  ${milestone ? `<div class="panel"><h2>${esc(label('侦探盲投 Milestone', 'Sealed Ballots Milestone'))}</h2>
    <p><a href="https://github.com/gqzy1/fakehall-genlayer/blob/main/MILESTONE.md">${esc(label('查看新合约验收记录', 'Review the new contract evidence'))}</a></p></div>` : ''}
  <div class="panel"><h2>${milestone ? 'Original deployment evidence' : 'Reviewer Evidence — FakeHall'}</h2>
    <p><button id="evHuman" class="${state.evidenceView === 'human' ? 'active' : ''}">${esc(t('nav.view_human'))}</button>
    <button id="evMachine" class="${state.evidenceView === 'machine' ? 'active' : ''}">${esc(t('nav.view_machine'))}</button></p>
    <dl class="kv">
      <dt>CONTRACT_ADDRESS</dt><dd class="mono"><a href="${esc(explorerAddress(EVIDENCE.contract_address))}" target="_blank" rel="noreferrer">${esc(EVIDENCE.contract_address)}</a></dd>
      <dt>DEPLOY_TX</dt><dd class="mono"><a href="${esc(explorerTx(EVIDENCE.deploy_tx))}" target="_blank" rel="noreferrer">${esc(EVIDENCE.deploy_tx)}</a></dd>
      <dt>NETWORK / CHAIN_ID</dt><dd>Stable Studionet / 61999 · RPC https://studio.genlayer.com/api</dd>
      <dt>REPO_CONTRACT_SHA256</dt><dd class="mono">${esc(EVIDENCE.source_sha256)}</dd>
      <dt>BYTE_PARITY</dt><dd>${esc(EVIDENCE.byte_parity)} — python3 scripts/verify_byte_parity.py --address ${esc(EVIDENCE.contract_address)}</dd>
      <dt>TX_HASHES_TOTAL</dt><dd>${esc(EVIDENCE.tx_total_hashes_all_runs)} — ${esc(EVIDENCE.tx_totals_note)}</dd>
    </dl></div>
  <div class="panel"><h3>Adversarial cases (ADV-1..10) — expected vs actual</h3>
    <table><thead><tr><th>ID</th><th>Case</th><th>Round</th><th>Expected</th><th>Actual (on-chain)</th></tr></thead><tbody>
    ${ADV.map((a) => `<tr><td>${a[0]}</td><td>${esc(a[1])}</td><td>${esc(a[2])}</td><td>${esc(a[3])}</td><td>${esc(a[4])}</td></tr>`).join('')}
    </tbody></table>
    <p class="small muted">Retry honesty: R6 took 3 fail-closed close attempts and R7 took 5 (transient fetch failures, SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED) before succeeding; R3 took 1 MAJORITY_DISAGREE attempt. Failed-attempt hashes are listed per round below.</p></div>
  ${Object.entries(rounds).map(([n, r]) => {
    return `<div class="panel"><h3>Round #${esc(n)} — ${esc(r.theme || '')}</h3>
    <p class="small">expected ${esc(r.expected?.verdict || '—')} / ${esc(r.expected?.flaw || '—')} / ${esc(r.expected?.final_status || '')} · salt <span class="mono">${esc(r.salt)}</span> · commitment <span class="mono">${esc(r.commitment_hash.slice(0, 20))}…</span></p>
    <table><thead><tr><th>Step</th><th>Outcome</th><th>Tx hash</th></tr></thead><tbody>
    ${(r.steps || []).map((s) => `<tr><td>${esc(s.label)}</td><td>${esc(s.outcome)}</td><td>${s.hash ? `<a class="mono" href="${esc(explorerTx(s.hash))}" target="_blank" rel="noreferrer">${esc(s.hash.slice(0, 18))}…</a>` : '—'}</td></tr>`).join('')}
    ${(r.failed_attempts || []).map((a) => `<tr><td>failed attempt: ${esc(a.label || '')}</td><td>fail-closed${a.result_name ? ' · ' + esc(a.result_name) : ''}</td><td>${a.hash ? `<a class="mono" href="${esc(explorerTx(a.hash))}" target="_blank" rel="noreferrer">${esc(a.hash.slice(0, 18))}…</a>` : 'no hash (transient RPC error)'}</td></tr>`).join('')}
    </tbody></table></div>`;
  }).join('')}
  <div class="panel"><h3>Negative (error-observed) transactions</h3>
    <table><thead><tr><th>ID</th><th>Action</th><th>Expected error</th><th>Tx hash</th></tr></thead><tbody>
    ${EVIDENCE.negatives.map((n) => `<tr><td>${esc(n.id)}</td><td>${esc(n.action)}</td><td class="mono">${esc(n.expected_error)}</td><td><a class="mono" href="${esc(explorerTx(n.hash))}" target="_blank" rel="noreferrer">${esc(n.hash.slice(0, 18))}…</a></td></tr>`).join('')}
    </tbody></table></div>
  <div class="panel"><h3>What this project does not prove</h3>
    <p class="small">Does not perform physical spectroscopy on museum objects. Proves only which exhibit conflicts with the specified public source. Relies on public authoritative records as ground-truth anchors. SHA-256 commit-reveal hides choices until reveal; losing the salt forfeits the forger bonus (the round still settles via consensus). Sealed votes are masked in get_* reads before JUDGED, but raw calldata is visible to nodes that parse transactions directly.</p></div>`;
  if (state.evidenceView === 'machine') {
    const lines = [
      'PROJECT_NAME ................. FakeHall',
      'CATEGORY ..................... Games (Artifact Forgery & Provenance Investigation Game)',
      'NETWORK_CHAIN_ID ............. 61999 (GenLayer Stable Studionet)',
      'RPC_ENDPOINT ................. https://studio.genlayer.com/api',
      'EXPLORER_BASE_URL ............ https://explorer-studio.genlayer.com',
      'CONTRACT_ADDRESS ............. ' + EVIDENCE.contract_address,
      'REPO_CONTRACT_SHA256 ......... ' + EVIDENCE.source_sha256,
      'BYTE_PARITY .................. ' + EVIDENCE.byte_parity,
      'ONCHAIN_CODE_PARITY_CMD ...... python3 scripts/verify_byte_parity.py --address ' + EVIDENCE.contract_address,
      'TX_DEPLOY_CONTRACT ........... ' + explorerTx(EVIDENCE.deploy_tx),
      ...ADV.map((a) => `${a[0]}_${a[1].replace(/[^A-Z0-9]+/gi, '_').toUpperCase().slice(0, 28)} .. ${a[4]}`),
      ...Object.entries(rounds).flatMap(([n, r]) => [
        `ROUND_${n}_FINAL .............. ${(EVIDENCE.final_rounds || []).find((x) => x.round_id === Number(n))?.status || '?'} / ${(EVIDENCE.final_rounds || []).find((x) => x.round_id === Number(n))?.verdict || '—'}`,
        ...(r.steps || []).filter((s) => s.hash).map((s) => `ROUND_${n}_${s.label.replace(/[^A-Z0-9]+/gi, '_').toUpperCase().slice(0, 24)} .. ${explorerTx(s.hash)}`),
      ]),
      ...EVIDENCE.negatives.map((x) => `${x.id} .. ${x.expected_error} .. ${explorerTx(x.hash)}`),
      'LIMITATION_1 ................. Does not perform physical spectroscopy on museum objects.',
      'LIMITATION_2 ................. Relies on public authoritative records as ground-truth anchors.',
      'LIMITATION_3 ................. SHA-256 commit-reveal hides choices until reveal; losing salt forfeits forger bonus (round still settles via consensus exit).',
    ];
    return human + `<div class="panel"><pre class="machine">${esc(lines.join('\n'))}</pre>
      <p><button id="copyMachineBtn">Copy machine manifest</button></p></div>`;
  }
  return human;
}

// ---------- render dispatch + action bindings ----------
function renderAll() {
  renderChrome();
  const v = $('#view');
  if (state.view === 'lobby') v.innerHTML = lobbyHtml();
  else if (state.view === 'workbench') v.innerHTML = workbenchHtml();
  else if (state.view === 'gallery') v.innerHTML = galleryHtml();
  else if (state.view === 'leaderboards') v.innerHTML = leaderboardsHtml();
  else v.innerHTML = evidenceHtml();
  bindViewActions();
  countdown();
  bindDrawerActions();
  if (state.writing) v.querySelectorAll('button, input, select').forEach((el) => { el.disabled = true; });
}

function bindViewActions() {
  document.querySelectorAll('[data-loupe]').forEach((b) => { b.onclick = () => {
    state.loupe = b.dataset.loupe;
    renderAll();
    document.querySelector(`[data-loupe="${state.loupe}"]`)?.focus();
  }; });
  document.querySelectorAll('[data-side-toggle]').forEach((b) => { b.onclick = () => {
    state.mobileSide = b.dataset.sideToggle;
    $('#compareGrid').dataset.mobileSide = state.mobileSide;
    document.querySelectorAll('[data-side-toggle]').forEach((button) => button.setAttribute('aria-pressed', button === b));
  }; });
  document.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => {
    state.filter = b.dataset.filter;
    renderAll();
    document.querySelector(`[data-filter="${state.filter}"]`)?.focus();
  }; });
  document.querySelectorAll('[data-goto-round]').forEach((b) => { b.onclick = () => navigate('workbench', Number(b.dataset.gotoRound)); });
  document.querySelectorAll('[data-case-link]').forEach((link) => { link.onclick = (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate('workbench', caseRoute(link.href));
  }; });
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('#allCases', () => navigate('lobby'));
  on('#caseConnect', () => $('#connectBtn')?.click());
  on('#openSources', showSources);
  on('#lobbyCreate', () => $('#studioBtn').click());
  on('#shareCase', async () => {
    const url = caseUrl(state.roundId).href;
    const output = $('#shareStatus');
    try {
      await navigator.clipboard.writeText(url);
      output.textContent = label('案件链接已复制', 'Case link copied');
    } catch {
      output.textContent = url;
    }
  });
  const recordDraft = () => state.voteDrafts.set(state.roundId, {
    choice: document.querySelector('[name="voteChoice"]:checked')?.value,
    flaw: $('#voteFlaw')?.value, note: $('#voteNote')?.value,
  });
  document.querySelectorAll('[name="voteChoice"], #voteFlaw, #voteNote').forEach((el) => { el.oninput = recordDraft; });
  on('#voteBtn', doVote);
  on('#lockBallotsBtn', () => doSimple('open_ballot_reveal', [state.roundId]));
  on('#revealBallotBtn', revealBallot);
  on('#backupBallotBtn', backupBallot);
  if ($('#importBallot')) $('#importBallot').onchange = importBallot;
  on('#closeBtn', () => doClose(state.roundId));
  on('#resolveBtn', () => doResolve(state.roundId));
  on('#revealBtn', doReveal);
  on('#archiveBtn', () => doSimple('archive_judged_round', [state.roundId]));
  on('#cancelBtn', () => doSimple('cancel_open_round', [state.roundId]));
  on('#suppBtn', doSupplement);
  on('#exportBtn', doExport);
  on('#retryCloseBtn', () => doClose(state.roundId, true));
  on('#retryWriteBtn', () => { const r = state.tx?.retry; if (r) r(); });
  on('#resumeBtn', doResume);
  on('#restoreSaltBtn', restoreSalt);
  on('#evHuman', () => { state.evidenceView = 'human'; renderAll(); });
  on('#evMachine', () => { state.evidenceView = 'machine'; renderAll(); });
  on('#copyMachineBtn', () => { const pre = document.querySelector('.machine'); if (pre) navigator.clipboard?.writeText(pre.textContent); });
  const rs = $('#revealSalt');
  if (rs) rs.oninput = updateRevealHashCheck;
  const rc = $('#revealChoice');
  if (rc) rc.onchange = updateRevealHashCheck;
  updateRevealHashCheck();
}
async function updateRevealHashCheck() {
  const el = $('#revealHashCheck');
  const saltEl = $('#revealSalt');
  const choiceEl = $('#revealChoice');
  if (!el || !saltEl || !choiceEl) return;
  const r = roundData(state.roundId);
  const salt = saltEl.value.trim();
  const btn = $('#revealBtn');
  // R2: with no salt the reveal button must be disabled (it used to stay
  // enabled and doReveal() silently returned — a dead button, same class
  // of failure as the create flow).
  if (!salt) { el.textContent = ''; if (btn) btn.disabled = true; return; }
  const h = await sha256Hex(`${state.roundId}:${choiceEl.value}:${salt}`);
  const ok = h === (r.commitment_hash || '').toLowerCase();
  el.innerHTML = `on-chain: <span class="hash">${esc(r.commitment_hash || '')}</span><br>computed: <span class="hash">${esc(h)}</span> — ${ok ? esc(t('ui.salt_match')) : esc(t('ui.salt_mismatch'))}`;
  el.style.color = ok ? 'var(--accent-provenance)' : 'var(--verdict-fake)';
  if (btn) btn.disabled = !ok;
}
function restoreSalt() {
  try {
    const cache = JSON.parse(localStorage.getItem('fakehall-salts') || '{}');
    const rec = cache[state.roundId];
    if (rec) {
      const s = $('#revealSalt'); if (s) s.value = rec.salt;
      const c = $('#revealChoice'); if (c) c.value = rec.choice;
      updateRevealHashCheck();
    } else alert('No salt cached in this browser for this round.');
  } catch { alert('No salt cached in this browser for this round.'); }
}
function rememberSalt(roundId, choice, salt) {
  try {
    const cache = JSON.parse(localStorage.getItem('fakehall-salts') || '{}');
    cache[roundId] = { choice, salt };
    localStorage.setItem('fakehall-salts', JSON.stringify(cache));
  } catch { /* storage unavailable */ }
}

// Generic write with the STATE-2 pipeline + STATE-4 fail-closed handling.
// After FINALIZED, the round is re-read via readRound (which sets the
// is_finalized_readback flag itself) and the UI refreshes from that snapshot.
async function runWrite(method, args, roundId, { after } = {}) {
  const w = state.wallet;
  if (!w) { alert(t('ui.no_wallet')); return; }
  if (state.writing) return;
  state.writing = true;
  state.tx = { method, roundId, hash: null, phase: 0, attempts: (state.tx?.method === method && state.tx?.roundId === roundId ? state.tx.attempts + 1 : 1), error: null,
    // R2: pre-broadcast failures are retryable by re-sending the same call.
    // The retry closure is stored on the tx record (never re-created by the
    // render path); when a hash already exists the retry button is NOT
    // shown — a broadcast tx is resumed via the resume-hash control instead,
    // so a retry can never double-send.
    retry: () => runWrite(method, args, roundId, { after }) };
  renderAll();
  try {
    if (w.mode === 'injected') {
      const accounts = await w.provider.request({ method: 'eth_accounts' });
      if (accounts[0]?.toLowerCase() !== w.address || Number(await w.provider.request({ method: 'eth_chainId' })) !== CHAIN_ID) {
        throw new Error(label('请重新连接原钱包并切换至 Studionet。', 'Reconnect the original signer on Studionet.'));
      }
    }
    const hash = await w.client.writeContract({ address: contractAddress(), functionName: method, args, value: 0n, leaderOnly: false });
    state.tx.hash = hash; state.tx.phase = 1; renderAll();
    const receipt = await waitFinalized(hash);
    state.tx.phase = 2; renderAll();
    const exec = leaderExecution(receipt);
    const payload = leaderPayload(receipt);
    if (exec !== 'SUCCESS' || ![6, 'MAJORITY_AGREE'].includes(receipt.result)) {
      if (payload.includes('SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED')) { state.tx.error = 'FAIL_CLOSED'; }
      else state.tx.error = 'Leader ERROR: ' + payload.slice(0, 200);
      renderAll();
      return;
    }
    if (after) after();
    const snap = await readRound(roundId);
    state.liveRounds = [...(state.liveRounds ?? []).filter((row) => row.round_id !== roundId), snap];
    state.tx.phase = 3;
    await refreshLive();
  } catch (e) {
    if (state.tx) state.tx.error = String(e?.shortMessage || e?.message || e).slice(0, 300);
  } finally {
    state.writing = false;
    renderAll();
  }
}

// R2: pre-write validation failures in the workbench are shown in the
// same pipeline panel as write errors (visible text, never a native alert
// and never a silent return — the create flow failed exactly that way).
function writeError(method, roundId, msg) {
  state.tx = { method, roundId, hash: null, phase: 0, attempts: 1, error: msg, retry: null };
  renderAll();
}

async function doVote() {
  const choice = document.querySelector('input[name="voteChoice"]:checked')?.value;
  if (!choice) { writeError('submit_investigation', state.roundId, 'Pick FAKE_A or FAKE_B first. / 请先选择 FAKE_A 或 FAKE_B。'); return; }
  const flaw = $('#voteFlaw')?.value || 'DATE_MISMATCH';
  const note = ($('#voteNote')?.value || '').trim();
  if (note.length < 1) { writeError('submit_investigation', state.roundId, 'A one-line investigation note is required (1–280 chars). / 需要填写一行调查笔记（1–280 字）。'); return; }
  if (liveRound(state.roundId)?.ballot_commitments) {
    await commitBallot(choice, flaw, note);
    return;
  }
  await runWrite('submit_investigation', [state.roundId, choice, flaw, note], state.roundId);
}
function ballotKey(roundId, address) {
  return ['fakehall-ballot-v2', CHAIN_ID, contractAddress().toLowerCase(), roundId, address].join(':');
}

function ballotDigest(roundId, address, { choice, flaw, note, salt }) {
  return sha256Hex(['fakehall-v2', contractAddress().toLowerCase(), roundId, address, choice, flaw, salt, note].join(':'));
}

async function commitBallot(choice, flaw, note) {
  const roundId = state.roundId;
  const address = state.wallet.address;
  const key = ballotKey(roundId, address);
  try {
    const existing = localStorage.getItem(key);
    const ballot = existing ? JSON.parse(existing) : {
      choice, flaw, note,
      salt: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join(''),
    };
    if (ballot.choice !== choice || ballot.flaw !== flaw || ballot.note !== note) {
      throw new Error(label('此轮已有本地选票。请用下载的备份恢复原选项和笔记。', 'A local ballot already exists. Use the downloaded backup to recover the original choice and note.'));
    }
    localStorage.setItem(key, JSON.stringify(ballot));
    const digest = await ballotDigest(roundId, address, ballot);
    await runWrite('commit_investigation', [roundId, digest], roundId);
  } catch (e) {
    writeError('commit_investigation', roundId, e.message);
  }
}

async function revealBallot() {
  const roundId = state.roundId;
  const address = state.wallet.address;
  try {
    const ballot = JSON.parse(localStorage.getItem(ballotKey(roundId, address)));
    const expected = liveRound(roundId)?.ballot_commitments?.[address];
    if (!ballot || !expected || await ballotDigest(roundId, address, ballot) !== expected) {
      throw new Error(label('请导入与链上承诺匹配的选票备份。', 'Restore a ballot backup that matches the on-chain commitment.'));
    }
    await runWrite('reveal_investigation', [roundId, ballot.choice, ballot.flaw, ballot.note, ballot.salt], roundId);
  } catch (e) {
    writeError('reveal_investigation', roundId, e.message);
  }
}

function backupBallot() {
  const roundId = state.roundId;
  const address = state.wallet.address;
  try {
    const key = ballotKey(roundId, address);
    const ballot = JSON.parse(localStorage.getItem(key));
    if (!ballot) throw new Error(label('本浏览器没有保存选票。', 'No ballot stored in this browser.'));
    const url = URL.createObjectURL(new Blob([JSON.stringify({ key, ballot })], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `fakehall-ballot-${roundId}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    writeError('ballot_backup', roundId, e.message);
  }
}

async function importBallot(event) {
  const roundId = state.roundId;
  const address = state.wallet.address;
  try {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 4096) throw new Error(label('选票备份文件过大。', 'Ballot backup is too large.'));
    const key = ballotKey(roundId, address);
    const record = JSON.parse(await file.text());
    const ballot = record.ballot;
    const expected = liveRound(roundId)?.ballot_commitments?.[address];
    if (record.key !== key || !expected || !ballot || await ballotDigest(roundId, address, ballot) !== expected) {
      throw new Error(label('备份与本轮钱包的承诺不匹配。', 'Backup does not match this wallet’s commitment in this round.'));
    }
    localStorage.setItem(key, JSON.stringify(ballot));
    renderAll();
  } catch (e) {
    writeError('ballot_backup', roundId, e.message);
  }
}

async function doClose(roundId, isRetry = false) {
  await runWrite('close_and_judge', [roundId], roundId);
}
async function doResolve(roundId) {
  await runWrite('resolve_unreachable_round', [roundId], roundId);
}
async function doReveal() {
  const choice = $('#revealChoice')?.value;
  const salt = $('#revealSalt')?.value.trim();
  const confession = $('#revealConfession')?.value || '';
  if (!salt) { writeError('reveal_forgery', state.roundId, 'Salt is required to reveal. / 揭晓需要输入盐值。'); return; }
  await runWrite('reveal_forgery', [state.roundId, choice, salt, confession], state.roundId);
}
async function doSupplement() {
  const choice = $('#suppChoice')?.value;
  const salt = $('#suppSalt')?.value.trim();
  if (!salt) { writeError('supplement_forger_reveal', state.roundId, 'Salt is required to supplement. / 补验需要输入盐值。'); return; }
  await runWrite('supplement_forger_reveal', [state.roundId, choice, salt], state.roundId);
}
async function doSimple(method, args) {
  await runWrite(method, args, state.roundId);
}
async function doResume() {
  const hash = $('#resumeHash')?.value.trim();
  if (!/^0x[0-9a-f]{64}$/i.test(hash ?? '') || state.writing) return;
  state.writing = true;
  state.tx = { method: 'resume', roundId: state.roundId, hash, phase: 1, attempts: 1, error: null };
  renderAll();
  try {
    const receipt = await waitFinalized(hash);
    const exec = leaderExecution(receipt);
    state.tx.phase = 2;
    const tx = await reader.getTransaction({ hash });
    if (tx.to_address?.toLowerCase() !== contractAddress().toLowerCase()) {
      throw new Error(label('该交易不属于本合约。', 'This transaction is for a different contract.'));
    }
    if (exec !== 'SUCCESS' || ![6, 'MAJORITY_AGREE'].includes(receipt.result)) {
      const payload = leaderPayload(receipt);
      state.tx.error = payload.includes('SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED') ? 'FAIL_CLOSED' : payload || label('交易未成功', 'Transaction failed');
      renderAll();
      return;
    }
    const snap = await readRound(state.tx.roundId);
    state.liveRounds = [...(state.liveRounds ?? []).filter((row) => row.round_id !== snap.round_id), snap];
    state.tx.phase = 3;
    await refreshLive();
  } catch (e) {
    state.tx.error = String(e?.shortMessage || e?.message || e).slice(0, 300);
  } finally {
    state.writing = false;
    renderAll();
  }
}

// Export dossier — guard reads the flag; it never sets it.
function doExport() {
  const snap = liveRound(state.roundId);
  if (!snap || !snap.is_finalized_readback || !['JUDGED', 'REVEALED'].includes(snap.status)) {
    alert(t('ui.export_blocked'));
    return;
  }
  const ev = snap.ballot_commitments ? null : EVIDENCE.rounds[state.roundId];
  const milestoneTx = receiptLinks(snap);
  const dossier = {
    project: 'FakeHall',
    network: 'Stable Studionet',
    chain_id: CHAIN_ID,
    contract_address: contractAddress(),
    explorer: explorerAddress(contractAddress()),
    round_id: state.roundId,
    is_finalized_readback: snap.is_finalized_readback,
    share_url: caseUrl(snap.round_id).href,
    status: snap.status,
    verdict: snap.verdict,
    flaw_category: snap.flaw_category,
    reveal_mode: snap.reveal_mode,
    allocation_points: snap.verdict === 'VOID' ? 0 : snap.forger_points,
    forger_points_awarded: snap.forger_points,
    votes: snap.investigations,
    unrevealed: Object.keys(snap.ballot_commitments ?? {}).filter((address) => !snap.investigations.some((row) => row.detective === address)),
    source_quote: snap.source_quote,
    audit_summary: snap.audit_summary,
    readback: snap,
    evidence_tx_hashes: ev ? ev.steps.filter((s) => s.hash).map((s) => ({ label: s.label, hash: s.hash, explorer: explorerTx(s.hash) })) : milestoneTx,
    signer_mode: state.wallet ? state.wallet.signer_mode : 'READ_ONLY',
    tx_sender: state.wallet ? state.wallet.address : null,
    exported_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fakehall-round-${state.roundId}-dossier.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Forger Studio drawer ----------
function studioHtml() {
  return `<div class="drawer" id="studioDrawer" hidden role="dialog" aria-label="Forger Studio">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><h2>${esc(t('nav.forger_studio'))}</h2><button id="studioClose">✕</button></div>
    <p class="small muted">${esc(state.deployment?.ballot_protocol === 2 ? label('承诺 → 锁定 → 揭示 → 裁决', 'Commit → Lock → Reveal → Judge') : t('ui.full_loop_hint'))}</p>
    <label>${esc(t('ui.theme'))}</label><input id="fTheme" maxlength="120" placeholder="The Rosetta Stone">
    <div class="two-col">
      <div><label>${esc(t('anchor.primary_source'))} *</label><input id="fSrc" placeholder="https://en.wikipedia.org/wiki/...">
      <label>${esc(t('anchor.backup_source'))}</label><input id="fBackup" placeholder="https://www.britishmuseum.org/..."></div>
      <div><label>${esc(t('ui.max_detectives'))}</label><input id="fMax" type="number" min="1" max="10" value="3"></div>
    </div>
    <div class="two-col">
      <div><h3>${esc(t('ui.exhibit_a'))}</h3>${itemFields('a')}</div>
      <div><h3>${esc(t('ui.exhibit_b'))}</h3>${itemFields('b')}</div>
    </div>
    <h3>Commit-Reveal — ${esc(t('anchor.commitment_hash'))}</h3>
    <label><input type="radio" name="fakeChoice" value="FAKE_A"> FAKE_A</label>
    <label><input type="radio" name="fakeChoice" value="FAKE_B" checked style="width:auto"> FAKE_B</label>
    <label>Salt *</label><input id="fSalt" placeholder="e.g. rosetta_bouchard_1799_salt">
    <p><button id="fGenSalt">${esc(t('ui.salt_random'))}</button> <button id="fDlSalt">${esc(t('ui.salt_download'))}</button></p>
    <p class="hash" id="fHashPreview">SHA-256: —</p>
    <div class="notice">${esc(t('ui.create_hint'))}</div>
    <p id="fCreateError" class="notice err" hidden></p>
    <p><button id="fCreate" class="primary">create_round — 提交创建新回合上链 / Submit create_round</button></p>
    <p class="small muted">create_round(theme, item_a_json, item_b_json, source_url, backup_source_url, commitment_hash, max_detectives)</p>
  </div>`;
}
function itemFields(side) {
  const p = side === 'a' ? 'A' : 'B';
  return `<label>Title * (3–120)</label><input id="f${p}Title">
  <label>Image URL (HTTPS, ≤300)</label><input id="f${p}Img" placeholder="https://upload.wikimedia.org/...">
  <label>Date (2–80)</label><input id="f${p}Date">
  <label>Material (5–200)</label><input id="f${p}Mat">
  <label>Provenance (20–500)</label><input id="f${p}Prov">
  <label>Narrative (20–600)</label><textarea id="f${p}Narr" rows="3"></textarea>`;
}
function nextRoundId() {
  const ids = (state.liveRounds || SEEDS).map((r) => r.round_id);
  return Math.max(0, ...ids) + 1;
}
function bindDrawerActions() {
  const drawer = $('#studioDrawer');
  if (!drawer) return;
  $('#studioClose').onclick = () => { drawer.hidden = true; };
  // R2: the create button reflects state.creating (disabled + 提交中…) so
  // the 1–2 minute pre-write re-read no longer looks dead; bindDrawerActions
  // runs on every renderAll, so the state survives re-renders.
  const cb = $('#fCreate');
  if (cb) {
    cb.disabled = state.creating || state.writing;
    cb.textContent = state.creating ? t('ui.submitting') : 'create_round — 提交创建新回合上链 / Submit create_round';
  }
  $('#fGenSalt').onclick = () => {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    $('#fSalt').value = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    updateStudioHash();
  };
  $('#fDlSalt').onclick = () => {
    const salt = $('#fSalt').value || '';
    const choice = document.querySelector('input[name="fakeChoice"]:checked')?.value || 'FAKE_B';
    const blob = new Blob([`FakeHall salt backup\nround_id (expected next): ${nextRoundId()}\nsecret_fake_choice: ${choice}\nsalt: ${salt}\nKeep this file — without the salt you cannot call reveal_forgery.\n`], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'fakehall-salt-backup.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  ['fSalt', 'fTheme'].forEach((id) => { const el = document.getElementById(id); if (el) el.oninput = updateStudioHash; });
  document.querySelectorAll('input[name="fakeChoice"]').forEach((r) => { r.onchange = updateStudioHash; });
  $('#fCreate').onclick = doCreate;
  updateStudioHash();
}
async function updateStudioHash() {
  const el = $('#fHashPreview');
  if (!el) return;
  const salt = $('#fSalt')?.value.trim() || '';
  const choice = document.querySelector('input[name="fakeChoice"]:checked')?.value || 'FAKE_B';
  if (!salt) { el.textContent = 'SHA-256: — (enter a salt)'; return; }
  const h = await sha256Hex(`${nextRoundId()}:${choice}:${salt}`);
  el.textContent = `SHA-256(${nextRoundId()}:${choice}:salt): ${h}`;
}
function normKey(s) { return String(s || '').trim().replace(/\s+/g, ' ').toLowerCase(); }
// R2: create failures are shown INLINE in the drawer (never a native
// alert — the 04:15 re-check proved an alert leaves the user with a
// dead-looking dialog and no record of what failed). Every failure names
// the exact field; any unexpected throw is caught and shown the same way.
function showCreateError(lines) {
  const el = $('#fCreateError');
  const msg = Array.isArray(lines) ? lines : [String(lines)];
  if (!el) { alert(msg.join('\n')); return; }
  el.innerHTML = msg.map((m) => esc(m)).join('<br>');
  el.hidden = false;
  el.scrollIntoView?.({ block: 'nearest' });
}
function clearCreateError() {
  const el = $('#fCreateError');
  if (el) { el.hidden = true; el.textContent = ''; }
}
function validateItem(side, it) {
  const sideLabel = side === 'A' ? t('ui.exhibit_a') : t('ui.exhibit_b');
  const len = (a, b) => t('ui.val_chars').replace('{a}', String(a)).replace('{b}', String(b));
  const problems = [];
  const check = (label, ok, detail) => { if (!ok) problems.push(`${sideLabel} · ${label}: ${detail}`); };
  check('Title', it.title.length >= 3 && it.title.length <= 120, len(3, 120));
  check(t('ui.image_url'), it.image_url.startsWith('https://') && it.image_url.length <= 300, `${t('ui.val_https')} (≤300)`);
  check(t('compare.dim_date'), it.claimed_date.length >= 2 && it.claimed_date.length <= 80, len(2, 80));
  check(t('compare.dim_material'), it.claimed_material.length >= 5 && it.claimed_material.length <= 200, len(5, 200));
  check(t('compare.dim_provenance'), it.claimed_provenance.length >= 20 && it.claimed_provenance.length <= 500, len(20, 500));
  check(t('compare.dim_narrative'), it.narrative.length >= 20 && it.narrative.length <= 600, len(20, 600));
  return problems;
}
async function doCreate() {
  clearCreateError();
  const w = state.wallet;
  if (!w) { showCreateError(t('ui.no_wallet')); return; }
  if (state.creating) return; // double-click guard: one submission at a time
  try {
    const item = (p) => ({
      title: document.getElementById('f' + p + 'Title').value.trim(),
      image_url: document.getElementById('f' + p + 'Img').value.trim(),
      claimed_date: document.getElementById('f' + p + 'Date').value.trim(),
      claimed_material: document.getElementById('f' + p + 'Mat').value.trim(),
      claimed_provenance: document.getElementById('f' + p + 'Prov').value.trim(),
      narrative: document.getElementById('f' + p + 'Narr').value.trim(),
    });
    const a = item('A'), b = item('B');
    const problems = [...validateItem('A', a), ...validateItem('B', b)];
    if (problems.length) { showCreateError([t('ui.create_error_title'), ...problems]); return; }
    const keyA = [a.claimed_date, a.claimed_material, a.claimed_provenance, a.narrative].map(normKey).join('|');
    const keyB = [b.claimed_date, b.claimed_material, b.claimed_provenance, b.narrative].map(normKey).join('|');
    if (keyA === keyB) { showCreateError(t('ui.identical_items')); return; }
    const theme = $('#fTheme').value.trim();
    const src = $('#fSrc').value.trim();
    const backup = $('#fBackup').value.trim() || src;
    const maxDet = Math.min(10, Math.max(1, Number($('#fMax').value) || 3));
    const choice = document.querySelector('input[name="fakeChoice"]:checked')?.value || 'FAKE_B';
    const salt = $('#fSalt').value.trim();
    if (!theme || !src.startsWith('https://') || !salt) { showCreateError(t('ui.missing_create_fields')); return; }
    // Pending state from here on: button disabled + 提交中… until runWrite
    // resolves or throws (covers the pre-write readAllRounds re-read).
    state.creating = true;
    renderAll();
    // Re-read live rounds at submit time so the commitment uses the true next id.
    let rid = nextRoundId();
    try { const all = await readAllRounds(); if (all.rounds?.length) rid = Math.max(...all.rounds.map((r) => r.round_id)) + 1; } catch { /* keep estimate */ }
    const hash = await sha256Hex(`${rid}:${choice}:${salt}`);
    rememberSalt(rid, choice, salt);
    $('#studioDrawer').hidden = true;
    state.view = 'workbench';
    await runWrite('create_round', [theme, JSON.stringify(a), JSON.stringify(b), src, backup, hash, maxDet], rid, {
      after: () => navigate('workbench', rid),
    });
    state.roundId = rid;
    renderAll();
  } catch (e) {
    // Any unexpected throw (missing element, crypto failure, RPC surprise)
    // is shown in the drawer instead of dying as an unhandled rejection.
    showCreateError(`${t('ui.unexpected_create_error')}: ${String(e?.shortMessage || e?.message || e).slice(0, 300)}`);
  } finally {
    state.creating = false;
    renderAll();
  }
}

// ---------- static wiring ----------
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', studioHtml());
  try { if (localStorage.getItem('fakehall-language') === 'zh') state.lang = 'zh'; } catch { /* unavailable */ }
  $('#langBtn').onclick = () => {
    state.lang = state.lang === 'zh' ? 'en' : 'zh';
    try { localStorage.setItem('fakehall-language', state.lang); } catch { /* unavailable */ }
    renderAll();
  };
  $('#motionBtn').onclick = () => {
    state.staticMode = !state.staticMode;
    document.documentElement.dataset.static = state.staticMode ? 'true' : 'false';
    const u = new URL(location.href);
    if (state.staticMode) u.searchParams.set('static', '');
    else u.searchParams.delete('static');
    history.replaceState(null, '', u);
    renderChrome();
  };
  document.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => navigate(b.dataset.nav); });
  $('#brandHome').onclick = (event) => { event.preventDefault(); navigate('lobby'); };
  window.addEventListener('popstate', () => {
    state.roundId = caseRoute() ?? 1;
    state.view = caseRoute() ? 'workbench' : 'lobby';
    renderAll();
  });
  setInterval(countdown, 1000);
  $('#studioBtn').onclick = () => { const d = $('#studioDrawer'); d.hidden = false; bindDrawerActions(); };
  boot();
});
