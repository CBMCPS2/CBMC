'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class FakeElement {
  constructor() {
    this.children = [];
    this.className = '';
    this.textContent = '';
    this.disabled = false;
    this.listeners = new Map();
    this.classList = {
      toggle: () => {},
    };
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }
}

const elements = new Map([
  ['#load-roster', new FakeElement()],
  ['#roster-status', new FakeElement()],
  ['#roster-updated', new FakeElement()],
  ['#online-count', new FakeElement()],
  ['#member-count', new FakeElement()],
  ['#online-roster', new FakeElement()],
]);
const store = new Map();
let requestedUrl = null;

const context = {
  URL,
  Intl,
  Date,
  console,
  document: {
    createElement: () => new FakeElement(),
    querySelector: (selector) => elements.get(selector),
  },
  localStorage: {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  },
  window: {
    setTimeout: () => 0,
  },
  fetch: async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => ({
        outfit_member_list: [
          {
            character_id: '100',
            rank: 'Squad Leader',
            rank_ordinal: '4',
            character_id_join_character: {name: {first: 'Alpha'}},
            character_id_join_characters_online_status: {online_status: '17'},
          },
          {
            character_id: '200',
            character_id_join_character: {name: {first: 'Bravo'}},
            character_id_join_characters_online_status: {online_status: '13'},
          },
        ],
      }),
    };
  },
};

vm.runInNewContext(fs.readFileSync('live.js', 'utf8'), context, {filename: 'live.js'});

(async () => {
  const clickHandler = elements.get('#load-roster').listeners.get('click');
  assert.equal(typeof clickHandler, 'function', 'The Live Ops button must have a click handler.');
  clickHandler();
  for (let turn = 0; turn < 2; turn += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }

  assert.equal(requestedUrl.searchParams.get('outfit_id'), '37581967406662856');
  assert.equal(requestedUrl.searchParams.get('c:show'), 'character_id,rank,rank_ordinal');
  assert.equal(elements.get('#online-count').textContent, '2');

  const cards = elements.get('#online-roster').children;
  assert.equal(cards.length, 2);
  assert.deepEqual(
    cards.map((card) => card.children.map((child) => [child.textContent, child.className])),
    [
      [['Alpha', ''], ['Squad Leader', 'roster-rank'], ['Emerald', 'roster-world']],
      [['Bravo', ''], ['Unranked', 'roster-rank'], ['Cobalt', 'roster-world']],
    ],
  );
  console.log('live-roster behavior: ok');
})();
