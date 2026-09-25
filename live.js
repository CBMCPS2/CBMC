'use strict';

const OUTFIT_ID = '37581967406662856';
const PAGE_SIZE = 5000;
const CACHE_KEY = 'cbmc-live-ops-roster-v1';
const CACHE_MS = 120_000;
const endpoint = new URL('https://census.daybreakgames.com/s:example/get/ps2:v2/outfit_member/');

const loadButton = document.querySelector('#load-roster');
const status = document.querySelector('#roster-status');
const updated = document.querySelector('#roster-updated');
const count = document.querySelector('#online-count');
const total = document.querySelector('#member-count');
const roster = document.querySelector('#online-roster');

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function requestUrl(start) {
  const url = new URL(endpoint);
  url.searchParams.set('outfit_id', OUTFIT_ID);
  url.searchParams.set('c:limit', String(PAGE_SIZE));
  url.searchParams.set('c:start', String(start));
  url.searchParams.set('c:show', 'character_id,rank,rank_ordinal');
  url.searchParams.set('c:join', 'characters_online_status^on:character_id^to:character_id^show:online_status');
  url.searchParams.append('c:join', 'character^on:character_id^to:character_id^show:name.first');
  return url;
}

async function fetchRoster() {
  const members = [];
  let start = 0;
  while (true) {
    const response = await fetch(requestUrl(start), {headers: {Accept: 'application/json'}});
    if (!response.ok) throw new Error(`Census returned HTTP ${response.status}.`);
    const payload = await response.json();
    const page = payload.outfit_member_list || [];
    members.push(...page);
    if (page.length < PAGE_SIZE) return members;
    start += page.length;
  }
}

function memberName(member) {
  return member.character_id_join_character?.name?.first || member.character_id || 'Unknown member';
}

function worldName(member) {
  const worldId = String(member.character_id_join_characters_online_status?.online_status || '');
  return ({'1': 'Connery', '10': 'Wainwright', '13': 'Cobalt', '17': 'Emerald', '19': 'Jaeger'})[worldId] || `World ${worldId}`;
}

function isOnline(member) {
  return String(member.character_id_join_characters_online_status?.online_status || '0') !== '0';
}

function render(data, fromCache = false) {
  const online = data.members.filter(isOnline).sort((a, b) => memberName(a).localeCompare(memberName(b)));
  count.textContent = String(online.length);
  total.textContent = String(data.members.length);
  updated.textContent = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'medium'
  }).format(new Date(data.fetchedAt));
  roster.replaceChildren();

  if (!online.length) {
    const item = document.createElement('li');
    item.className = 'roster-empty';
    item.textContent = 'No CBMC members are online right now.';
    roster.append(item);
  } else {
    for (const member of online) {
      const item = document.createElement('li');
      const name = document.createElement('strong');
      const world = document.createElement('span');
      name.textContent = memberName(member);
      world.textContent = worldName(member);
      item.append(name, world);
      roster.append(item);
    }
  }

  setStatus(fromCache
    ? 'Showing the locally cached roster. You can request fresh data when the cooldown ends.'
    : 'Live roster loaded directly from Daybreak Census.');
}

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    return cached?.fetchedAt && Array.isArray(cached.members) ? cached : null;
  } catch {
    return null;
  }
}

function updateButton(cache) {
  const remaining = cache ? CACHE_MS - (Date.now() - cache.fetchedAt) : 0;
  if (remaining > 0) {
    loadButton.disabled = true;
    loadButton.textContent = `Refresh available in ${Math.ceil(remaining / 1000)} s`;
    window.setTimeout(() => updateButton(readCache()), Math.min(remaining, 1000));
  } else {
    loadButton.disabled = false;
    loadButton.textContent = 'Load live roster';
  }
}

async function loadRoster() {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
    render(cached, true);
    updateButton(cached);
    return;
  }

  loadButton.disabled = true;
  loadButton.textContent = 'Loading roster…';
  setStatus('Requesting all roster pages from Daybreak Census. This can take a moment.');
  try {
    const members = await fetchRoster();
    const data = {fetchedAt: Date.now(), members};
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    render(data);
    updateButton(data);
  } catch (error) {
    setStatus(`Could not load the live roster. ${error.message} Please wait and try again.`, true);
    loadButton.disabled = false;
    loadButton.textContent = 'Try live roster again';
  }
}

loadButton.addEventListener('click', () => { void loadRoster(); });
const cached = readCache();
if (cached) {
  render(cached, Date.now() - cached.fetchedAt < CACHE_MS);
  updateButton(cached);
}
