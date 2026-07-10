const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const NUM_COMPETITORS = 100;
const VALID_REFS = ['referee1', 'referee2', 'referee3'];

const ratings = {};
for (let i = 1; i <= NUM_COMPETITORS; i++) {
  ratings[i] = { referee1: null, referee2: null, referee3: null };
}

io.on('connection', (socket) => {
  socket.emit('state', { ratings, numCompetitors: NUM_COMPETITORS });

  socket.on('rate', ({ competitorId, refereeId, score }) => {
    const id = parseInt(competitorId);
    const validScore = score === null ||
      (typeof score === 'number' && !isNaN(score) && score >= 0 && score <= 100);

    if (id >= 1 && id <= NUM_COMPETITORS && VALID_REFS.includes(refereeId) && validScore) {
      ratings[id][refereeId] = score;
      io.emit('rated', { competitorId: id, refereeId, score });
    }
  });

  socket.on('reset', () => {
    for (let i = 1; i <= NUM_COMPETITORS; i++) {
      ratings[i] = { referee1: null, referee2: null, referee3: null };
    }
    io.emit('state', { ratings, numCompetitors: NUM_COMPETITORS });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Tanzwertung läuft auf http://localhost:${PORT}`);
});
