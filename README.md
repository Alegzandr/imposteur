# Imposteur

Jeu multijoueur en temps réel : tous les joueurs reçoivent le même mot, sauf l'imposteur qui reçoit son antonyme. À tour de rôle, chacun donne des indices pour prouver qu'il n'est pas l'imposteur, puis tout le monde vote.

## Stack

- **client/** — React 18 + Vite + TypeScript + Tailwind CSS + socket.io-client
- **server/** — Express + Socket.IO + TypeScript (état en mémoire, serveur autoritaire)

## Développement avec Docker (recommandé)

```bash
docker compose up --build
```

- Client : http://localhost:5173
- API / WebSocket : http://localhost:3001

Le hot reload fonctionne dans les deux conteneurs (volumes montés, polling activé).

Les ports hôtes sont configurables : `SERVER_PORT=4000 CLIENT_PORT=8080 docker compose up`.

## Développement sans Docker

```bash
# Serveur
cd server
cp .env.example .env   # PORT=3000, CLIENT_URL=http://localhost:5173
npm install
npm run dev

# Client
cd client
cp .env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

## Architecture temps réel

Le serveur est la **source de vérité unique** :

- Toute mutation de l'état d'une room passe par `server/src/services/game.ts`, qui diffuse ensuite l'état complet (épuré des secrets : liste de mots, identité de l'imposteur) via l'événement `roomUpdate`.
- Le mot de chaque joueur est envoyé en privé via `yourWord`.
- Les transitions de phase (fin de manche, scoreboard → manche suivante) sont pilotées par des timers **côté serveur**, jamais côté client.
- Le client ne fait que rendre l'état reçu ; les états dérivés (prêt, a voté, à qui le tour) sont calculés depuis `roomUpdate`.

### Test de bout en bout

Une partie complète à 2 joueurs (connexion, lobby, indices, votes, scoreboard, déconnexion) est simulée par `client/test-realtime.mjs` :

```bash
docker compose up -d
docker compose exec client npm run test:e2e
```

### Événements socket

| Événement (client → serveur) | Description |
| --- | --- |
| `join` / `leave` | Rejoindre / quitter une room |
| `ready` / `notReady` | Se déclarer prêt dans le lobby |
| `addHint` | Donner un indice (à son tour) |
| `addVote` | Voter contre un joueur |

| Événement (serveur → client) | Description |
| --- | --- |
| `roomUpdate` | État complet de la room (diffusé à chaque changement) |
| `yourWord` | Mot privé du joueur pour la manche en cours |
| `joinError` / `actionError` | Erreurs (room pleine, pas votre tour, …) |
| `roomCreated` / `roomUpdated` / `roomRemoved` | Synchro de la liste des parties (page d'accueil) |
