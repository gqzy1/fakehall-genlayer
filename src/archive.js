export function caseRoute(url = location.href) {
  const value = new URL(url).searchParams.get('case');
  const id = Number(value);
  return /^[1-9]\d*$/.test(value ?? '') && Number.isSafeInteger(id) ? id : null;
}

export function caseUrl(id, base = location.href) {
  const url = new URL(base);
  if (id) url.searchParams.set('case', String(id));
  else url.searchParams.delete('case');
  url.hash = '';
  return url;
}

export function caseStage(status) {
  if (status === 'OPEN' || status === 'VOTING') return 'join';
  if (status === 'BALLOT_REVEAL') return 'reveal';
  if (status === 'JUDGED' || status === 'REVEALED') return 'closed';
  return 'inactive';
}

export function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export function timeRemaining(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
}
