// FakeHall frontend — Forensic Workbench.
// Cold-start rule: NOTHING renders a VERIFIED badge or a payout number until
// a latest-final get_* readback has returned. Before that, every verdict and
// score shows UNCONFIRMED / "-- (未确认)" and preview seeds carry a
// PREVIEW SEED badge. Export is gated on the readback function's own
// is_finalized_readback flag (see src/chain.js); this file never sets it.
import {
  CHAIN_ID, EXPLORER_BASE, loadDeployment, contractAddress, explorerTx, explorerAddress,
  readRound, readAllRounds, readLeaderboards, readGallery,
  waitFinalized, leaderPayload, leaderExecution,
  injectedProvider, connectInjected, injectedChainId,
  temporaryAccount, rotateTemporaryAccount, destroyTemporaryAccount,
  sendWrite, sha256Hex, shortAddr, sleep,
} from './chain.js';
import { I18N_53, EXTRA } from './i18n.js';
import { SEEDS } from './seeds.js';
import { EVIDENCE } from './evidence.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = {
  lang: 'zh',
  view: 'workbench',
  roundId: 2, // live demo round: VOTING 2/3
  loupe: 'all',
  staticMode: new URLSearchParams(location.search).has('static'),
  evidenceView: 'human',
  deployment: null,
  liveRounds: null,      // array from readAllRounds — null until readback
  liveBoards: null,
  liveGallery: null,
  readbackOk: false,
  readbackError: null,
  wallet: null,          // {mode:'injected'|'temporary', address, client, signer_mode}
  chainId: null,
  tx: null,              // {method, roundId, hash, phase, attempts, error}
  version: null,
};
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
const roundData = (id) => liveRound(id) || previewAsRound(previewRound(id));
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
  }
  try { state.chainId = await injectedChainId(); } catch { /* no wallet */ }
  renderAll();
}

// ---------- chrome (header / wallet bar / tabs / banner) ----------
function renderChrome() {
  $('#langBtn').textContent = state.lang === 'zh' ? 'EN' : '中文';
  $('#motionBtn').textContent = t(state.staticMode ? 'nav.motion_toggle_off' : 'nav.motion_toggle_on');
  document.querySelectorAll('[data-nav]').forEach((b) => {
    b.classList.toggle('active', b.dataset.nav === state.view);
    b.textContent = t('nav.' + b.dataset.nav);
  });
  $('#studioBtn').textContent = t('nav.forger_studio');
  $('#appTitle').textContent = t('app.title');
  $('#appSub').textContent = t('app.subtitle');
  // Round tabs
  $('#roundTabs').innerHTML = SEEDS.map((s) => {
    const live = liveRound(s.round_id);
    const st = live ? live.status : s.expected_final_status + '*';
    return `<button data-round="${s.round_id}" class="${state.roundId === s.round_id ? 'active' : ''}">#${String(s.round_id).padStart(2, '0')} <span class="st">${esc(st)}</span></button>`;
  }).join('');
  document.querySelectorAll('#roundTabs button').forEach((b) => {
    b.onclick = () => { state.roundId = Number(b.dataset.round); state.tx = null; renderAll(); };
  });
  // Banner: cold-start STATE-1 until a FINALIZED readback lands.
  const banner = $('#banner');
  if (!state.deployment) {
    banner.className = 'banner';
    banner.innerHTML = `<span class="grow">⏳ ${esc(t('status.PREVIEW_SEED'))} — deployment.json</span>`;
  } else if (!state.readbackOk) {
    banner.className = 'banner';
    banner.innerHTML = `<span class="grow">${esc(t('status.PREVIEW_SEED'))} · ${esc(t('status.UNCONFIRMED'))}</span><button id="refreshBtn">${esc(t('ui.refresh'))}</button>`;
  } else {
    banner.className = 'banner ok';
    banner.innerHTML = `<span class="grow">✓ ${esc(t('ui.readback_ok'))} — get_all_rounds / get_leaderboards / get_revealed_gallery (latest-final)</span><button id="refreshBtn">${esc(t('ui.refresh'))}</button>`;
  }
  const rb = $('#refreshBtn');
  if (rb) rb.onclick = () => refreshLive();
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
  return `<div class="exhibit"><h3>${side === 'A' ? esc(t('ui.exhibit_a')) : esc(t('ui.exhibit_b'))} ${stampFor(side, r, live)}</h3>
    <div class="imgbox"><img src="${esc(item.image_url)}" alt="${esc(item.title)}" loading="lazy" onerror="this.outerHTML='<div class=img-fallback>${esc(t('ui.img_unreachable'))}<br><span class=hash>${esc(item.image_url)}</span></div>'"></div>
    <div class="dim-row"><div class="dim-label">Title</div><div class="dim-val"><strong>${esc(item.title)}</strong></div></div>
    ${rows}</div>`;
}

function workbenchHtml() {
  const id = state.roundId;
  const r = roundData(id);
  const live = isLive(id);
  const seed = previewRound(id);
  const w = state.wallet;
  const isForger = w && w.address === (r.forger_address || '').toLowerCase();
  const voted = w ? (r.investigations || []).some((i) => (i.detective || '').toLowerCase() === w.address) : false;
  const canClose = r.status === 'VOTING' && (r.vote_count || 0) >= 1 && (isForger || (r.vote_count || 0) >= (r.max_detectives || 3));
  const loupe = state.loupe;
  const loupeBtns = [['all', 'compare.loupe_all'], ['date', 'compare.dim_date'], ['material', 'compare.dim_material'], ['provenance', 'compare.dim_provenance'], ['narrative', 'compare.dim_narrative']]
    .map(([k, lk]) => `<button data-loupe="${k}" class="${loupe === k ? 'active' : ''}">${esc(t(lk))}</button>`).join('');

  // Sealed board
  const board = (r.investigations || []).length === 0
    ? `<p class="muted">${esc(t('ui.empty_round'))}</p>`
    : (r.investigations || []).map((inv, i) => {
        const sealed = inv.suspected_fake === 'SEALED_UNTIL_JUDGED';
        return `<div class="board-row"><span>#${i + 1} <span class="mono">${esc(shortAddr(inv.detective))}</span></span>
          <span>${sealed ? `<span class="sealed-tag">${esc(t('board.sealed_badge'))}</span>` : `${esc(inv.suspected_fake)} · ${esc(inv.flaw_category)} · ${esc(inv.points_awarded)} PTS`}</span></div>`;
      }).join('');

  // R2 key-loss note (live demo path)
  const r2note = (id === 2 && r.status === 'VOTING')
    ? `<div class="notice">${esc(t('ui.r2_note'))}</div>` : '';

  // Actions per state machine + permissions
  let actions = '';
  if (r.status === 'OPEN' || r.status === 'VOTING') {
    const voteDisabled = !w || isForger || voted || (r.vote_count >= (r.max_detectives || 3));
    actions += `<h3>1 · ${esc(t('action.submit_judgment'))}</h3>
      ${isForger ? `<div class="notice">${esc(t('ui.self_vote_block'))}</div>` : ''}
      ${voted ? `<div class="notice">${esc(t('ui.already_voted'))}</div>` : ''}
      <label><input type="radio" name="voteChoice" value="FAKE_A" style="width:auto"> ${esc(t('action.vote_fake_a'))}</label>
      <label><input type="radio" name="voteChoice" value="FAKE_B" style="width:auto"> ${esc(t('action.vote_fake_b'))}</label>
      <label>${esc(t('ui.flaw_label'))}</label>
      <select id="voteFlaw"><option>DATE_MISMATCH</option><option>MATERIAL_MISMATCH</option><option>PROVENANCE_MISMATCH</option><option>FACT_FABRICATION</option></select>
      <label>${esc(t('ui.note_label'))}</label>
      <input id="voteNote" maxlength="280" placeholder="e.g. Source says Bouchard found it in Rosetta in 1799">
      <p><button id="voteBtn" class="primary" ${voteDisabled ? 'disabled' : ''}>${esc(t('action.submit_judgment'))}</button>
      ${!w ? `<span class="muted small"> — ${esc(t('ui.no_wallet'))}</span>` : ''}</p>`;
  }
  if (r.status === 'VOTING') {
    actions += `<h3>2 · close_and_judge</h3>${r2note}
      <p><button id="closeBtn" class="amber" ${!canClose ? 'disabled' : ''}>${esc(t('action.close_and_judge'))}</button>
      <span class="small muted"> ${esc(r.vote_count || 0)}/${esc(r.max_detectives || 3)} ${esc(t('ui.votes'))}${isForger ? ' · forger' : ''}${(r.vote_count || 0) >= (r.max_detectives || 3) ? ' · full house — anyone may close' : ''}</span></p>
      <p><button id="resolveBtn" ${!w ? 'disabled' : ''}>${esc(t('ui.resolve_unreachable'))}</button>
      <span class="small muted"> — ${esc(t('ui.fail_closed').split('。')[0])}</span></p>`;
  }
  if (r.status === 'JUDGED') {
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
  if (r.status === 'OPEN' && isForger) {
    actions += `<p><button id="cancelBtn" class="danger">${esc(t('action.cancel_open_round'))}</button></p>`;
  }
  if (r.status === 'REVEALED' && r.reveal_mode && ['VOID_ARCHIVED', 'CONSENSUS_ARCHIVED'].includes(r.reveal_mode) && isForger) {
    actions += `<h3>${esc(t('ui.supplement'))}</h3><p class="small muted">${esc(t('ui.supplement_note'))}</p>
      <label>secret_fake_choice</label><select id="suppChoice"><option>FAKE_A</option><option>FAKE_B</option></select>
      <label>salt</label><input id="suppSalt" placeholder="salt used at creation">
      <p><button id="suppBtn">${esc(t('ui.supplement'))}</button></p>`;
  }
  if (r.status === 'REVEALED' && r.supplement_verified) {
    actions += `<p class="small">supplement_verified: true · supplement_choice ${esc(r.supplement_choice || '')}</p>`;
  }

  // Export gate: enabled ONLY on a readback snapshot that carries the flag
  // set by readRound itself. Preview seeds never carry it.
  const snap = liveRound(id);
  const exportOk = !!(snap && snap.is_finalized_readback && ['JUDGED', 'REVEALED'].includes(snap.status));
  const txHtml = state.tx ? txPipelineHtml() : '';

  return `
  <div class="panel"><div style="display:flex;flex-wrap:wrap;gap:.5rem 1rem;align-items:baseline">
    <h2 style="margin:0">CASE #${String(id).padStart(2, '0')} · ${esc(r.theme || seed.theme)}</h2>
    <span class="stamp ${r.status === 'REVEALED' || r.status === 'JUDGED' ? 'real' : 'sealed'}">${esc(live ? t('status.' + r.status) : t('status.PREVIEW_SEED'))}</span>
    ${live ? '' : `<span class="sealed-tag">${esc(t('status.PREVIEW_SEED'))}</span>`}
  </div>
  <dl class="kv" style="margin-top:.6rem">
    <dt>${esc(t('anchor.primary_source'))}</dt><dd><a href="${esc(r.source_url)}" target="_blank" rel="noreferrer">${esc(r.source_url)}</a></dd>
    <dt>${esc(t('anchor.backup_source'))}</dt><dd><a href="${esc(r.backup_source_url)}" target="_blank" rel="noreferrer">${esc(r.backup_source_url)}</a></dd>
    <dt>${esc(t('ui.forger'))}</dt><dd class="mono">${esc(r.forger_address || '')}</dd>
    <dt>${esc(t('anchor.commitment_hash'))}</dt><dd class="hash">${esc(r.commitment_hash || '')}</dd>
    <dt>max_detectives</dt><dd>${esc(r.max_detectives)} · ${esc(r.vote_count || 0)} ${esc(t('ui.votes'))}</dd>
  </dl></div>
  ${verdictBanner(r, live)}
  <div class="workbench">
    <div>
      <div class="panel">
        <div class="compare-bar" role="group" aria-label="loupe">${loupeBtns}</div>
        <div class="comparison-grid" data-loupe-active="${loupe !== 'all'}" id="compareGrid">
          ${exhibitHtml('A', r.item_a, r, live, loupe)}
          ${exhibitHtml('B', r.item_b, r, live, loupe)}
        </div>
        <p class="small muted">${esc(t('anchor.source_excerpt'))}: ${live ? `“${esc(r.source_quote || '')}”` : esc(t('status.UNCONFIRMED'))}</p>
      </div>
      ${txHtml}
    </div>
    <div>
      <div class="panel"><h3>🕵️ ${esc(t('ui.detectives'))} — ${esc(r.vote_count || 0)}/${esc(r.max_detectives || 3)}</h3>${board}
        <dl class="kv"><dt>${esc(t('ui.forger'))}</dt><dd class="score">${pts(r.forger_points, live)}</dd></dl>
      </div>
      <div class="panel">${actions}
        <hr style="border-color:var(--border-hairline)">
        <p><button id="exportBtn" ${exportOk ? '' : 'disabled'}>${esc(t('action.export_dossier'))}</button>
        ${exportOk ? '' : `<span class="small muted"> ${esc(t('ui.export_blocked'))}</span>`}</p>
        <p class="small muted">${esc(t('ui.full_loop_hint'))}</p>
      </div>
    </div>
  </div>`;
}

function txPipelineHtml() {
  const tx = state.tx;
  const steps = [t('ui.step_broadcast'), t('ui.step_fetch'), t('ui.step_compare'), t('ui.step_finalized')];
  const lis = steps.map((s, i) => {
    const cls = i < tx.phase ? 'done' : (i === tx.phase ? 'active' : '');
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
    <p class="small muted">Rounds ${esc((EVIDENCE.gallery_round_ids || []).join(', '))} · ${esc(t('status.REVEALED'))} + verdict ≠ VOID · ${live ? esc(t('ui.readback_ok')) : esc(t('status.PREVIEW_SEED'))}</p></div>${cards}`;
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
  const d = state.deployment || EVIDENCE;
  const rounds = EVIDENCE.rounds;
  const human = `
  <div class="panel"><h2>Reviewer Evidence — FakeHall</h2>
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
  if (state.view === 'workbench') v.innerHTML = workbenchHtml();
  else if (state.view === 'gallery') v.innerHTML = galleryHtml();
  else if (state.view === 'leaderboards') v.innerHTML = leaderboardsHtml();
  else v.innerHTML = evidenceHtml();
  bindViewActions();
  bindDrawerActions();
}

function bindViewActions() {
  document.querySelectorAll('[data-loupe]').forEach((b) => { b.onclick = () => { state.loupe = b.dataset.loupe; renderAll(); }; });
  document.querySelectorAll('[data-goto-round]').forEach((b) => {
    b.onclick = () => { state.roundId = Number(b.dataset.gotoRound); state.view = 'workbench'; renderAll(); window.scrollTo(0, 0); };
  });
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('#voteBtn', doVote);
  on('#closeBtn', () => doClose(state.roundId));
  on('#resolveBtn', () => doResolve(state.roundId));
  on('#revealBtn', doReveal);
  on('#archiveBtn', () => doSimple('archive_judged_round', [state.roundId]));
  on('#cancelBtn', () => doSimple('cancel_open_round', [state.roundId]));
  on('#suppBtn', doSupplement);
  on('#exportBtn', doExport);
  on('#retryCloseBtn', () => doClose(state.roundId, true));
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
  if (!salt) { el.textContent = ''; return; }
  const h = await sha256Hex(`${state.roundId}:${choiceEl.value}:${salt}`);
  const ok = h === (r.commitment_hash || '').toLowerCase();
  el.innerHTML = `on-chain: <span class="hash">${esc(r.commitment_hash || '')}</span><br>computed: <span class="hash">${esc(h)}</span> — ${ok ? esc(t('ui.salt_match')) : esc(t('ui.salt_mismatch'))}`;
  el.style.color = ok ? 'var(--accent-provenance)' : 'var(--verdict-fake)';
  const btn = $('#revealBtn');
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
  state.tx = { method, roundId, hash: null, phase: 0, attempts: (state.tx?.method === method && state.tx?.roundId === roundId ? state.tx.attempts + 1 : 1), error: null };
  renderAll();
  try {
    const hash = await w.client.writeContract({ address: contractAddress(), functionName: method, args, value: 0n, leaderOnly: false });
    state.tx.hash = hash; state.tx.phase = 1; renderAll();
    const tick = setInterval(() => { if (state.tx && state.tx.phase < 3) { state.tx.phase += 1; const el = document.querySelector('.pipeline'); if (el) renderAll(); } }, 20000);
    let receipt;
    try { receipt = await waitFinalized(hash); } finally { clearInterval(tick); }
    state.tx.phase = 3; renderAll();
    const exec = leaderExecution(receipt);
    const payload = leaderPayload(receipt);
    if (exec === 'ERROR') {
      if (payload.includes('SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED')) { state.tx.error = 'FAIL_CLOSED'; }
      else state.tx.error = 'Leader ERROR: ' + payload.slice(0, 200);
      renderAll();
      return;
    }
    state.tx = null;
    if (after) after();
    await refreshLive();
  } catch (e) {
    state.tx.error = String(e?.shortMessage || e?.message || e).slice(0, 300);
    renderAll();
  }
}

async function doVote() {
  const choice = document.querySelector('input[name="voteChoice"]:checked')?.value;
  if (!choice) { alert('Pick FAKE_A or FAKE_B first.'); return; }
  const flaw = $('#voteFlaw')?.value || 'DATE_MISMATCH';
  const note = $('#voteNote')?.value || '';
  if (note.length < 1) { alert('A one-line investigation note is required (1–280 chars).'); return; }
  await runWrite('submit_investigation', [state.roundId, choice, flaw, note], state.roundId);
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
  if (!salt) return;
  await runWrite('reveal_forgery', [state.roundId, choice, salt, confession], state.roundId);
}
async function doSupplement() {
  const choice = $('#suppChoice')?.value;
  const salt = $('#suppSalt')?.value.trim();
  if (!salt) return;
  await runWrite('supplement_forger_reveal', [state.roundId, choice, salt], state.roundId);
}
async function doSimple(method, args) {
  await runWrite(method, args, state.roundId);
}
async function doResume() {
  const hash = $('#resumeHash')?.value.trim();
  if (!hash) return;
  state.tx = { method: 'resume', roundId: state.roundId, hash, phase: 3, attempts: 1, error: null };
  renderAll();
  try {
    const receipt = await waitFinalized(hash);
    const exec = leaderExecution(receipt);
    if (exec === 'ERROR' && leaderPayload(receipt).includes('SOURCE_OR_IMAGE_UNREACHABLE_FAIL_CLOSED')) {
      state.tx.error = 'FAIL_CLOSED'; renderAll(); return;
    }
    state.tx = null;
    await refreshLive();
  } catch (e) {
    state.tx.error = String(e?.shortMessage || e?.message || e).slice(0, 300);
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
  const ev = EVIDENCE.rounds[state.roundId];
  const dossier = {
    project: 'FakeHall',
    network: 'Stable Studionet',
    chain_id: CHAIN_ID,
    contract_address: contractAddress(),
    explorer: explorerAddress(contractAddress()),
    round_id: state.roundId,
    is_finalized_readback: snap.is_finalized_readback,
    status: snap.status,
    verdict: snap.verdict,
    flaw_category: snap.flaw_category,
    reveal_mode: snap.reveal_mode,
    allocation_points: snap.verdict === 'VOID' ? 0 : snap.forger_points,
    forger_points_awarded: snap.forger_points,
    votes: snap.investigations,
    source_quote: snap.source_quote,
    audit_summary: snap.audit_summary,
    readback: snap,
    evidence_tx_hashes: ev ? ev.steps.filter((s) => s.hash).map((s) => ({ label: s.label, hash: s.hash, explorer: explorerTx(s.hash) })) : [],
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
    <p class="small muted">${esc(t('ui.full_loop_hint'))}</p>
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
    <label><input type="radio" name="fakeChoice" value="FAKE_A" style="width:auto"> FAKE_A</label>
    <label><input type="radio" name="fakeChoice" value="FAKE_B" checked style="width:auto"> FAKE_B</label>
    <label>Salt *</label><input id="fSalt" placeholder="e.g. rosetta_bouchard_1799_salt">
    <p><button id="fGenSalt">${esc(t('ui.salt_random'))}</button> <button id="fDlSalt">${esc(t('ui.salt_download'))}</button></p>
    <p class="hash" id="fHashPreview">SHA-256: —</p>
    <div class="notice">${esc(t('ui.create_hint'))}</div>
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
  return Math.max(...ids) + 1;
}
function bindDrawerActions() {
  const drawer = $('#studioDrawer');
  if (!drawer) return;
  $('#studioClose').onclick = () => { drawer.hidden = true; };
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
async function doCreate() {
  const w = state.wallet;
  if (!w) { alert(t('ui.no_wallet')); return; }
  const item = (p) => ({
    title: document.getElementById('f' + p + 'Title').value.trim(),
    image_url: document.getElementById('f' + p + 'Img').value.trim(),
    claimed_date: document.getElementById('f' + p + 'Date').value.trim(),
    claimed_material: document.getElementById('f' + p + 'Mat').value.trim(),
    claimed_provenance: document.getElementById('f' + p + 'Prov').value.trim(),
    narrative: document.getElementById('f' + p + 'Narr').value.trim(),
  });
  const a = item('A'), b = item('B');
  const bad = (it) => !(it.title.length >= 3 && it.title.length <= 120 && it.image_url.startsWith('https://') && it.image_url.length <= 300
    && it.claimed_date.length >= 2 && it.claimed_date.length <= 80 && it.claimed_material.length >= 5 && it.claimed_material.length <= 200
    && it.claimed_provenance.length >= 20 && it.claimed_provenance.length <= 500 && it.narrative.length >= 20 && it.narrative.length <= 600);
  if (bad(a) || bad(b)) { alert('Check item field lengths / HTTPS image URLs (see contract bounds).'); return; }
  const keyA = [a.claimed_date, a.claimed_material, a.claimed_provenance, a.narrative].map(normKey).join('|');
  const keyB = [b.claimed_date, b.claimed_material, b.claimed_provenance, b.narrative].map(normKey).join('|');
  if (keyA === keyB) { alert('ITEMS_IDENTICAL_NO_LLM_NEEDED — A and B must differ in at least one dimension.'); return; }
  const theme = $('#fTheme').value.trim();
  const src = $('#fSrc').value.trim();
  const backup = $('#fBackup').value.trim() || src;
  const maxDet = Math.min(10, Math.max(1, Number($('#fMax').value) || 3));
  const choice = document.querySelector('input[name="fakeChoice"]:checked')?.value || 'FAKE_B';
  const salt = $('#fSalt').value.trim();
  if (!theme || !src.startsWith('https://') || !salt) { alert('Theme, HTTPS source URL and salt are required.'); return; }
  // Re-read live rounds at submit time so the commitment uses the true next id.
  let rid = nextRoundId();
  try { const all = await readAllRounds(); if (all.rounds?.length) rid = Math.max(...all.rounds.map((r) => r.round_id)) + 1; } catch { /* keep estimate */ }
  const hash = await sha256Hex(`${rid}:${choice}:${salt}`);
  rememberSalt(rid, choice, salt);
  $('#studioDrawer').hidden = true;
  state.view = 'workbench';
  await runWrite('create_round', [theme, JSON.stringify(a), JSON.stringify(b), src, backup, hash, maxDet], rid, {
    after: () => { state.roundId = rid; },
  });
  state.roundId = rid;
  renderAll();
}

// ---------- static wiring ----------
document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('beforeend', studioHtml());
  $('#langBtn').onclick = () => { state.lang = state.lang === 'zh' ? 'en' : 'zh'; renderAll(); };
  $('#motionBtn').onclick = () => {
    state.staticMode = !state.staticMode;
    document.documentElement.dataset.static = state.staticMode ? 'true' : 'false';
    const u = new URL(location.href);
    if (state.staticMode) u.searchParams.set('static', '');
    else u.searchParams.delete('static');
    history.replaceState(null, '', u);
    renderChrome();
  };
  document.querySelectorAll('[data-nav]').forEach((b) => { b.onclick = () => { state.view = b.dataset.nav; renderAll(); window.scrollTo(0, 0); }; });
  $('#studioBtn').onclick = () => { const d = $('#studioDrawer'); d.hidden = false; bindDrawerActions(); };
  boot();
});
