import {
  calculatePayout,
  createRacePlan,
  getFinalStandings,
  getRaceSnapshot,
  HORSES
} from './raceEngine.js';
import {
  db,
  doc,
  firebaseReady,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc
} from './firebaseClient.js';

const PLAYER_KEY = 'keiba-player-id';
const state = {
  player: null,
  race: null,
  timer: null
};

const el = {
  setupWarning: document.querySelector('#setupWarning'),
  playerId: document.querySelector('#playerId'),
  playerName: document.querySelector('#playerName'),
  saveName: document.querySelector('#saveName'),
  balance: document.querySelector('#balance'),
  stake: document.querySelector('#stake'),
  horses: document.querySelector('#horses'),
  raceStatus: document.querySelector('#raceStatus'),
  commentary: document.querySelector('#commentary'),
  track: document.querySelector('#track'),
  standings: document.querySelector('#standings')
};

const playerId = getOrCreatePlayerId();
el.playerId.textContent = playerId;

renderHorseChoices();

if (!firebaseReady) {
  el.setupWarning.hidden = false;
} else {
  watchPlayer();
  watchRace();
}

el.saveName.addEventListener('click', async () => {
  const name = el.playerName.value.trim() || `参加者-${playerId.slice(-4)}`;
  await setDoc(doc(db, 'players', playerId), {
    id: playerId,
    name,
    balance: state.player?.balance ?? 0,
    selectedHorseId: state.player?.selectedHorseId ?? null,
    stake: state.player?.stake ?? 0,
    updatedAt: serverTimestamp()
  }, { merge: true });
});

function renderHorseChoices() {
  el.horses.innerHTML = HORSES.map((horse, index) => `
    <div class="horse-row" data-horse-id="${horse.id}">
      <span class="horse-avatar" style="--horse:${horse.color}">🐎</span>
      <span class="horse-meta">
        <strong>${index + 1}. ${horse.name}</strong>
        <small>${horse.style}</small>
      </span>
      <strong class="horse-odds">${horse.odds}x</strong>
      <input class="bet-input" inputmode="numeric" type="number" min="1" step="1" placeholder="金額" value="${el.stake.value || 10}" aria-label="${horse.name} の金額">
      <button class="bet-button" data-horse-id="${horse.id}" type="button">BET</button>
    </div>
  `).join('');

  el.horses.addEventListener('click', async (event) => {
    const button = event.target.closest('.bet-button');
    if (!button || !state.player) return;
    const horse = HORSES.find((item) => item.id === button.dataset.horseId);
    const row = button.closest('.horse-row');
    const stake = Math.floor(Number(row?.querySelector('.bet-input')?.value) || 0);
    const raceStatus = state.race?.status ?? 'waiting';

    if (raceStatus !== 'waiting') {
      alert('予想できるのはレース待機中だけです。');
      return;
    }
    if (stake <= 0) {
      alert('応援ポイントを入力してください。');
      return;
    }

    await runTransaction(db, async (transaction) => {
      const playerRef = doc(db, 'players', playerId);
      const snapshot = await transaction.get(playerRef);
      const player = snapshot.data() || { balance: 0 };
      if ((player.balance || 0) < stake) {
        throw new Error('ポイントが足りません。');
      }
      transaction.set(playerRef, {
        id: playerId,
        name: el.playerName.value.trim() || player.name || `参加者-${playerId.slice(-4)}`,
        balance: (player.balance || 0) - stake,
        selectedHorseId: horse.id,
        stake,
        lastRaceId: state.race?.raceId ?? null,
        settledRaceId: null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }).catch((error) => alert(error.message));
  });
}

function watchPlayer() {
  onSnapshot(doc(db, 'players', playerId), async (snapshot) => {
    if (!snapshot.exists()) {
      await setDoc(doc(db, 'players', playerId), {
        id: playerId,
        name: `参加者-${playerId.slice(-4)}`,
        balance: 0,
        selectedHorseId: null,
        stake: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return;
    }
    state.player = snapshot.data();
    el.playerName.value = state.player.name || '';
    el.balance.textContent = state.player.balance ?? 0;
    document.querySelectorAll('.horse-row').forEach((row) => {
      row.classList.toggle('selected', row.dataset.horseId === state.player.selectedHorseId);
    });
  });
}

function watchRace() {
  onSnapshot(doc(db, 'state', 'currentRace'), (snapshot) => {
    state.race = snapshot.exists() ? snapshot.data() : { status: 'waiting' };
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(renderRace, 250);
    renderRace();
  });
}

function renderRace() {
  const race = state.race;
  if (!race || race.status === 'waiting') {
    el.raceStatus.textContent = '次のレースを待っています';
    el.commentary.textContent = '馬を選んで応援ポイントを入れてください。';
    renderTrack(HORSES.map((horse, lane) => ({ ...horse, lane, progress: 0 })));
    renderStandings([]);
    return;
  }

  const plan = createRacePlan({ seed: race.seed, horses: race.horses || HORSES, durationMs: race.durationMs });
  const snapshot = getRaceSnapshot({ plan, startTime: race.startTime, now: Date.now() });
  const standings = race.result?.length ? race.result : getFinalStandings(plan);

  el.raceStatus.textContent = snapshot.status === 'finished' || race.status === 'finished'
    ? 'レース終了'
    : 'レース中';
  el.commentary.textContent = snapshot.status === 'finished'
    ? `1着 ${standings[0]?.name || ''}！`
    : snapshot.commentary;
  renderTrack(snapshot.runners);
  renderStandings(standings);
}

function renderTrack(runners) {
  el.track.innerHTML = runners.map((runner) => `
    <div class="lane" style="--horse:${runner.color}">
      <span class="lane-name">${runner.name}</span>
      <span class="runner" style="--horse:${runner.color}; --x:${runner.progress * 100}%">♞</span>
    </div>
  `).join('');
}

function renderStandings(standings) {
  el.standings.innerHTML = standings.slice(0, 6).map((runner, index) => {
    const payout = calculatePayout(state.player?.stake || 0, runner);
    const selected = state.player?.selectedHorseId === runner.id ? ' selected-row' : '';
    return `<li class="${selected}">${index + 1}着 ${runner.name} <span>x${runner.odds} / ${payout}pt</span></li>`;
  }).join('');
}

function getOrCreatePlayerId() {
  const existing = localStorage.getItem(PLAYER_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(PLAYER_KEY, id);
  return id;
}
