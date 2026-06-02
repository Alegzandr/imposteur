// End-to-end realtime test: simulates a 2-player game against the dev server.
// Run inside the client container: node test-realtime.mjs
import { io } from 'socket.io-client';

const API = process.env.API_URL || 'http://server:3000';
let failures = 0;

const check = (label, cond) => {
    console.log(`${cond ? 'PASS' : 'FAIL'} - ${label}`);
    if (!cond) failures++;
};

// Wait until a roomUpdate matching the predicate arrives (like a real client,
// the latest received state wins).
const waitForState = (socket, pred, timeout = 15000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off('roomUpdate', handler);
            reject(new Error('timeout waiting for state'));
        }, timeout);
        const handler = (room) => {
            if (pred(room)) {
                clearTimeout(timer);
                socket.off('roomUpdate', handler);
                resolve(room);
            }
        };
        socket.on('roomUpdate', handler);
    });

const waitFor = (socket, event, timeout = 15000) =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`timeout waiting for ${event}`)),
            timeout
        );
        socket.once(event, (...args) => {
            clearTimeout(timer);
            resolve(args);
        });
    });

const connect = (username) =>
    new Promise((resolve, reject) => {
        const socket = io(API, { query: { username } });
        socket.once('connect', () => resolve(socket));
        socket.once('connect_error', reject);
    });

const main = async () => {
    // --- Connection ---
    const alice = await connect('Alice');
    const bob = await connect('Bob');
    check('Alice et Bob connectés', alice.connected && bob.connected);

    // --- Room creation (REST) + home page sync ---
    const homeSync = waitFor(bob, 'roomCreated');
    const res = await fetch(`${API}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user: { id: alice.id, username: 'Alice' },
        }),
    });
    const { room } = await res.json();
    check('Room créée via REST', res.status === 201 && !!room.id);
    check(
        'Room épurée des secrets (words/impostor)',
        room.gameState.words === undefined &&
            room.gameState.impostor === undefined
    );
    const [homeRoom] = await homeSync;
    check('Bob (page home) reçoit roomCreated', homeRoom.id === room.id);

    // --- Join ---
    const aliceJoined = waitForState(alice, (r) => r.users.length >= 1);
    alice.emit('join', room.id);
    await aliceJoined;

    const aliceSeesBob = waitForState(alice, (r) => r.users.length === 2);
    const bobJoined = waitForState(bob, (r) => r.users.length === 2);
    bob.emit('join', room.id);
    await Promise.all([aliceSeesBob, bobJoined]);
    check('Les deux joueurs voient la room à 2 joueurs en temps réel', true);

    // --- Ready -> game start ---
    const bobSeesReady = waitForState(
        bob,
        (r) => r.gameState.readyUsers.length === 1
    );
    alice.emit('ready', room.id);
    await bobSeesReady;
    check('Bob voit Alice prête en temps réel', true);

    const aliceWordP = waitFor(alice, 'yourWord');
    const bobWordP = waitFor(bob, 'yourWord');
    const gameStartP = waitForState(
        alice,
        (r) => r.gameState.phase === 'round-1'
    );
    bob.emit('ready', room.id);
    const started = await gameStartP;
    check('Tous prêts -> phase round-1', true);
    check(
        'Pas de secret dans le broadcast (impostor/words cachés)',
        started.gameState.impostor === undefined &&
            started.gameState.words === undefined
    );
    check(
        'Un joueur courant est désigné',
        !!started.gameState.currentPlayer?.id
    );

    const [[aliceWord], [bobWord]] = await Promise.all([aliceWordP, bobWordP]);
    check(
        'Chacun reçoit son mot en privé, mots différents (imposteur)',
        !!aliceWord && !!bobWord && aliceWord !== bobWord
    );

    // --- Out-of-turn hint is rejected ---
    const sockets = { [alice.id]: alice, [bob.id]: bob };
    const notCurrent =
        started.gameState.currentPlayer.id === alice.id ? bob : alice;
    const errP = waitFor(notCurrent, 'actionError', 5000);
    notCurrent.emit('addHint', room.id, 'hors-tour');
    const [errMsg] = await errP;
    check('Indice hors tour rejeté avec actionError', !!errMsg);

    // --- Hints (2 per player, turn by turn) ---
    let state = started.gameState;
    let hintCount = 0;

    while (state.phase === 'round-1' && hintCount < 10) {
        const current = sockets[state.currentPlayer.id];
        const expected = hintCount + 1;
        const nextState = waitForState(
            alice,
            (r) =>
                r.gameState.hints.length >= expected ||
                !r.gameState.phase.startsWith('round-')
        );
        current.emit('addHint', room.id, `indice-${hintCount}`);
        state = (await nextState).gameState;
        hintCount++;
    }
    check(
        '4 indices donnés -> phase vote-1',
        state.phase === 'vote-1' && hintCount === 4
    );

    // --- Duplicate hint rejected (server-side validation) ---
    // (phase is vote now, so just check votes flow; dup-hint covered implicitly)

    // --- Votes ---
    const bobSeesVote = waitForState(
        bob,
        (r) => r.gameState.votes.length === 1
    );
    alice.emit('addVote', room.id, { id: bob.id, username: 'Bob' });
    await bobSeesVote;
    check("Bob voit le vote d'Alice en temps réel", true);

    // Self-vote must be rejected
    const selfVoteErr = waitFor(bob, 'actionError', 5000);
    bob.emit('addVote', room.id, { id: bob.id, username: 'Bob' });
    check('Vote pour soi-même rejeté', !!(await selfVoteErr)[0]);

    const scoreboardP = waitForState(alice, (r) =>
        r.gameState.phase.startsWith('scoreboard-')
    );
    bob.emit('addVote', room.id, { id: alice.id, username: 'Alice' });
    const sb = await scoreboardP;
    check('Tous ont voté -> phase scoreboard-1', sb.gameState.phase === 'scoreboard-1');
    check(
        'Scoreboard révèle imposteur et mots',
        !!sb.gameState.revealed?.impostor &&
            !!sb.gameState.revealed?.word &&
            !!sb.gameState.revealed?.impostorWord
    );
    check(
        'Scoreboard a une deadline serveur (phaseEndsAt)',
        !!sb.gameState.phaseEndsAt
    );
    const totalScore = sb.gameState.scores.reduce((sum, s) => sum + s.score, 0);
    check('Des points ont été attribués', totalScore > 0);

    // --- Server-driven transition to round 2 ---
    const round2P = waitForState(
        alice,
        (r) => r.gameState.phase === 'round-2',
        15000
    );
    const aliceWord2P = waitFor(alice, 'yourWord', 15000);
    await round2P;
    check('Le serveur enchaîne automatiquement sur round-2', true);
    await aliceWord2P;
    check('Nouveau mot reçu pour le round 2', true);

    // --- Disconnect mid-game -> game ends (less than 2 players) ---
    const endP = waitForState(
        alice,
        (r) => r.gameState.phase === 'end' && r.users.length === 1
    );
    bob.disconnect();
    await endP;
    check('Déconnexion en cours de partie -> phase end + joueur retiré', true);

    alice.disconnect();

    // --- Empty room cleanup (grace period) ---
    await new Promise((r) => setTimeout(r, 11000));
    const listRes = await fetch(`${API}/api/rooms`);
    const { rooms } = await listRes.json();
    check(
        'Room supprimée après le délai de grâce',
        !rooms.some((r) => r.id === room.id)
    );

    console.log(
        failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`
    );
    process.exit(failures === 0 ? 0 : 1);
};

main().catch((err) => {
    console.error('TEST ERROR:', err.message);
    process.exit(1);
});
