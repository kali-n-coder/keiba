import {
  createRacePlan,
  getFinalStandings,
  HORSES,
  makeSeed
} from './raceEngine.js';
import {
  collection,
  db,
  doc,
  firebaseReady,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from './firebaseClient.js';

const el = {
  setupWarning: document.querySelector('#setupWarning'),
  status: document.querySelector('#status'),
  players: document.querySelector('#players'),
  startRace: document.querySelector('#startRace'),
  finishRace: document.querySelector('#finishRace'),
  resetRace: document.querySelector('#resetRace'),
  grantPlayerId: document.querySelector('#grantPlayerId'),
  grantAmount: document.querySelector('#grantAmount'),
  grantPoints: document.querySelector('#grantPoints')
};

let currentRace = null;
let players = [];

if (!firebaseReady) {
  el.setupWarning.hidden = false;
} else {
  watchRace();
  watchPlayers();
}

el.startRace.addEventListener('click', async () => {
  const seed = makeSeed();
  const raceId = `race-${Date.now()}`;
  const durationMs = 30_000;
  const batch = writeBatch(db);
  const playerSnapshots = await getDocs(query(collection(db, 'players')));

  playerSnapshots.forEach((snapshot) => {
    const player = snapshot.data();
    if (!player.selectedHorseId || !player.stake) return;
    batch.set(doc(db, 'players', snapshot.id), {
      lastRaceId: raceId,
      settledRaceId: null,
      lastResult: null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  batch.set(doc(db, 'state', 'currentRace'), {
    raceId,
    status: 'running',
    seed,
    startTime: Date.now() + 5000,
    durationMs,
    horses: HORSES,
    result: [],
    createdAt: serverTimestamp()
  });
  await batch.commit();
});

el.finishRace.addEventListener('click', async () => {
  if (!currentRace?.raceId) return;
  const plan = createRacePlan({
    seed: currentRace.seed,
    horses: currentRace.horses || HORSES,
    durationMs: currentRace.durationMs
  });
  const result = getFinalStandings(plan);
  const winner = result[0];
  const batch = writeBatch(db);
  const playerSnapshots = await getDocs(query(collection(db, 'players')));

  playerSnapshots.forEach((snapshot) => {
    const player = snapshot.data();
    if (player.settledRaceId === currentRace.raceId) return;
    if (player.lastRaceId !== currentRace.raceId) return;
    const pickedWinner = player.selectedHorseId === winner.id;
    const payout = pickedWinner ? Math.floor((player.stake || 0) * (winner.odds || 0)) : 0;
    batch.set(doc(db, 'players', snapshot.id), {
      balance: increment(payout),
      settledRaceId: currentRace.raceId,
      lastResult: pickedWinner ? 'win' : 'lose',
      updatedAt: serverTimestamp()
    }, { merge: true });
  });

  batch.set(doc(db, 'state', 'currentRace'), {
    ...currentRace,
    status: 'finished',
    result,
    finishedAt: serverTimestamp()
  }, { merge: true });
  await batch.commit();
});

el.resetRace.addEventListener('click', async () => {
  await setDoc(doc(db, 'state', 'currentRace'), {
    status: 'waiting',
    updatedAt: serverTimestamp()
  }, { merge: true });
});

el.grantPoints.addEventListener('click', async () => {
  const id = el.grantPlayerId.value.trim();
  const amount = Math.floor(Number(el.grantAmount.value) || 0);
  if (!id || amount === 0) return;
  await updateDoc(doc(db, 'players', id), {
    balance: increment(amount),
    updatedAt: serverTimestamp()
  });
  el.grantAmount.value = '';
});

function watchRace() {
  onSnapshot(doc(db, 'state', 'currentRace'), (snapshot) => {
    currentRace = snapshot.exists() ? snapshot.data() : { status: 'waiting' };
    el.status.textContent = currentRace.status || 'waiting';
  });
}

function watchPlayers() {
  onSnapshot(query(collection(db, 'players')), (snapshot) => {
    players = snapshot.docs.map((item) => item.data()).sort((a, b) => (b.balance || 0) - (a.balance || 0));
    renderPlayers();
  });
}

function renderPlayers() {
  el.players.innerHTML = players.map((player) => `
    <tr>
      <td><button type="button" data-copy-id="${player.id}">${player.id.slice(0, 8)}</button></td>
      <td>${player.name || ''}</td>
      <td>${player.balance || 0}</td>
      <td>${HORSES.find((horse) => horse.id === player.selectedHorseId)?.name || '-'}</td>
      <td>${player.stake || 0}</td>
      <td>${player.lastResult || '-'}</td>
    </tr>
  `).join('');
}

el.players.addEventListener('click', (event) => {
  const button = event.target.closest('[data-copy-id]');
  if (!button) return;
  el.grantPlayerId.value = players.find((player) => player.id.startsWith(button.dataset.copyId))?.id || '';
});
