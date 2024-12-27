let rooms = {};

exports.init = function(io) {

    io.on('connection', (socket) => {
        console.log(`Nuovo client connesso: ${socket.id}`);

        socket.on('reconnectToRoom', (playerId, roomCode) => {
            const room = rooms[roomCode];
            if (!room) {
                socket.emit('reconnectFailed', 'Room does not exist');
                return;
            }

            const player = room.players.find((p) => p.id === playerId);
            if (player) {
                player.id = socket.id; // Update socket ID for the reconnected player
                socket.join(roomCode);
                console.log(`Player ${player.name} reconnected to room ${roomCode}`);

                // Send updated room data to the reconnected player
                socket.emit('roomData', {
                    roomCode,
                    playerName: player.name,
                    roomData: room,
                    playerData: player,
                    success: "reconnected",
                    players: room.players,
                    phrase: room.phrase,
                    images: room.images,
                });

                // Notify all players in the room about the reconnection
                io.to(roomCode).emit('updatePlayers', room.players);
            } else {
                socket.emit('reconnectFailed', 'Player not found in the room');
            }
        });


        // Un giocatore si unisce a una stanza
        socket.on('joinRoom', (roomCode, playerName) => {
            if (!rooms[roomCode]) {
                // Se la stanza non esiste, la creiamo
                rooms[roomCode] = {
                    players: [],
                    phrase: "Esempio di frase divertente", // Puoi aggiornare dinamicamente
                    images: [], // Popoleremo con le immagini caricate dal server secondario
                    selectedCards: [],
                    votes: {},
                };
            }

            // Aggiungiamo il giocatore alla stanza
            //Each player will have this data
            rooms[roomCode].players.push({ id: socket.id, name: playerName, drawedImages: [], score: 0 });
            try{
                socket.join(roomCode);
            }catch (e) {
                console.log(e);
            }

            console.log(`Giocatore ${playerName} si è unito alla stanza ${roomCode}`);

            // Inviamo i dati della stanza al giocatore appena entrato
            socket.emit('roomData', {
                roomCode,
                playerName,
                roomData: rooms[roomCode],
                playerData: rooms[roomCode].players.find((p) => p.id === socket.id),
                success: "ok",
                players: rooms[roomCode].players,
                phrase: rooms[roomCode].phrase,
                images: rooms[roomCode].images,
            });

            // Aggiorniamo tutti i giocatori della stanza
            io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
        });

        //This event is used to update room data through socket.io
        socket.on("roomData", (roomCode, roomData) => {
            rooms[roomCode] = roomData;
        })

        //Event called if a player select any card
        socket.on('cardSelected', (roomCode, image) => {
            const room = rooms[roomCode];
            if (!room) return;

            // Aggiungiamo la carta selezionata alla lista delle carte scelte
            room.selectedCards.push({ playerId: socket.id,  image});

            console.log(`Carta selezionata in stanza ${roomCode}: ${image}`);

            // Se tutti i giocatori hanno selezionato una carta, mostriamo le carte
            if (room.selectedCards.length === room.players.length) {
                io.to(roomCode).emit('showSelectedCards', room.selectedCards);
            }
        });

        //Once a player selected a card, it's time to vote the most and least funny card
        socket.on('vote', ({ roomCode, image }) => {
            const room = rooms[roomCode];
            if (!room) return;

            // Assegniamo un voto alla carta
            if (!room.votes[image]) {
                room.votes[image] = 0;
            }
            room.votes[image]++;

            console.log(`Voto ricevuto per immagine ${image} nella stanza ${roomCode}`);

            // Se tutti i giocatori hanno votato, calcoliamo il vincitore
            if (Object.keys(room.votes).length === room.players.length) {
                const winner = calculateWinner(room);
                io.to(roomCode).emit('roundEnded', { winner });

                // Resettiamo i dati della stanza per il prossimo round
                room.selectedCards = [];
                room.votes = {};
            }
        });

        // Un giocatore inizia il prossimo round
        socket.on('nextRound', (roomCode) => {
            const room = rooms[roomCode];
            if (!room) return;

            // Aggiorniamo la frase e svuotiamo i dati del round precedente
            room.phrase = "Nuova frase divertente"; // Può essere generata casualmente
            room.selectedCards = [];
            room.votes = {};

            console.log(`Nuovo round iniziato nella stanza ${roomCode}`);

            // Inviamo i nuovi dati ai giocatori
            io.to(roomCode).emit('newRound', {
                phrase: room.phrase,
                images: room.images, // Le immagini rimangono invariate
            });
        });

        //TODO: We have to do something about refreshing/changing page because it disconnects players
        // Gestione disconnessione del giocatore
        socket.on('disconnect', () => {
            console.log(`Client disconnesso: ${socket.id}`);

            // Rimuoviamo il giocatore da tutte le stanze
            for (const roomCode in rooms) {
                const room = rooms[roomCode];
                const playerIndex = room.players.findIndex((p) => p.id === socket.id);

                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                    console.log(`Giocatore rimosso dalla stanza ${roomCode}`);

                    // Aggiorniamo i giocatori rimasti nella stanza
                    io.to(roomCode).emit('updatePlayers', room.players);

                    // Se non ci sono più giocatori, eliminiamo la stanza
                    if (room.players.length === 0) {
                        delete rooms[roomCode];
                        console.log(`Stanza ${roomCode} eliminata`);
                    }
                }
            }
        });
    });

// Funzione per calcolare il vincitore del round
    function calculateWinner(room) {
        let maxVotes = 0;
        let winner = null;

        for (const image in room.votes) {
            if (room.votes[image] > maxVotes) {
                maxVotes = room.votes[image];
                winner = room.players.find((p) => p.id === room.selectedCards.find((c) => c.image === image).playerId);
            }
        }

        if (winner) {
            winner.score++; // Incrementiamo il punteggio del vincitore
            console.log(`Vincitore del round: ${winner.name} con ${maxVotes} voti`);
            return winner.name;
        }

        return "Nessun vincitore";
    }
}
