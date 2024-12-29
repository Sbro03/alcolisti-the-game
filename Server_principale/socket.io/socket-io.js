let rooms = {};

exports.init = function(io) {

    io.on('connection', (socket) => {
        console.log(`Nuovo client connesso: ${socket.id}`);

        socket.on('reconnectToRoom', (playerId, roomCode) => {
            //IDK once the client disconnects from the server (cleaning rooms data properly),
            // rooms has the previous data. Check with debugger
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
                    state: "reconnected",
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
                    //idk if images can be useful, suggested by chatGPT
                    selectedCards: [],
                    votes: {},
                };
            }else{
                if(rooms[roomCode].selectedCards.length > 0){
                    socket.emit("roomData", {message: "This room is full"});
                }
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
            io.to(roomCode).emit('roomData', {
                roomCode,
                playerName,
                roomData: rooms[roomCode],
                playerData: rooms[roomCode].players.find((p) => p.id === socket.id),
                state: "ok",
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
        socket.on('cardSelected', (roomCode, player, image) => {
            const room = rooms[roomCode];
            if (!room) return;
            // Aggiungiamo la carta selezionata alla lista delle carte scelte
            room.selectedCards.push({ playerId: socket.id, playerName: player.name,  image});

            console.log(`Carta selezionata in stanza ${roomCode} da ${player.name}: ${image}`);
            // Se tutti i giocatori hanno selezionato una carta, mostriamo le carte

            if (room.selectedCards.length === room.players.length) {
                console.log("tutti i giocatori hanno scelto");
                io.to(roomCode).emit('roomData', {
                    roomCode,
                    playerName: player.name,
                    roomData: room,
                    playerData: player,
                    state: "cards selected",
                    players: room.players,
                    phrase: room.phrase,
                    images: room.images,
                    selectedCards: room.selectedCards
                });
                io.to(roomCode).emit('showSelectedCards', room.selectedCards);
            }
        });

        //Once a player selected a card, it's time to vote the most and least funny card
        socket.on('vote', (roomCode, image, type) => {
            const room = rooms[roomCode];
            if (!room) return;

            // Controlliamo se il tipo di voto è "winner" o "loser"
            if (type !== 'winner' && type !== 'loser') return;

            // Inizializziamo i conteggi dei voti se non esistono
            if (!room.votes[type]) {
                room.votes[type] = {};
            }
            if (!room.votes[type][image.fileName]) {
                room.votes[type][image.fileName] = 0;
            }

            // Incrementiamo il voto per l'immagine
            room.votes[type][image.fileName]++;

            console.log(`Voto ricevuto per ${type} immagine ${image} nella stanza ${roomCode}`);

            // Controlliamo se tutti i giocatori hanno votato sia per il vincitore che per il perdente
            const totalVotes = Object.keys(room.votes.winner || {}).length + Object.keys(room.votes.loser || {}).length;
            if (totalVotes === room.players.length * 2) {
                //TODO: Controllare con il debugger questa parte del voto
                const winnerImage = calculateWinner(room.votes.winner);
                const loserImage = calculateLoser(room.votes.loser);

                const winner = room.selectedCards.find((card) => card.image.fileName === winnerImage);
                const loser = room.selectedCards.find((card) => card.image.fileName === loserImage);
                console.log(winner, loser);

                io.to(roomCode).emit('roundEnded', { winner, loser });

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

        //TODO: rimuovere dati di gioco con la disconnessione
        // Gestione disconnessione del giocatore
        socket.on('disconnecting', () => {
            // Rimuoviamo il giocatore da tutte le stanze
            for (const roomCode in rooms) {
                console.log(rooms);
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
                //Updating room data anyway
                io.to(roomCode).emit('roomData', {
                    roomCode,
                    roomData: room,
                    state: "disconnecting",
                    players: room.players,
                    phrase: room.phrase,
                    images: room.images,
                });
            }
        });
        socket.on("disconnect", () => {
            console.log(`Client disconnesso: ${socket.id}`);
        })
    });

    //This function calculates the winner
    function calculateWinner(winnerVotes) {
        // Trova l'immagine con il maggior numero di voti per il vincitore
        return Object.keys(winnerVotes).reduce((a, b) => (winnerVotes[a] > winnerVotes[b] ? a : b));
    }

    //This function calculates the loser
    function calculateLoser(loserVotes) {
        // Trova l'immagine con il maggior numero di voti per il perdente
        return Object.keys(loserVotes).reduce((a, b) => (loserVotes[a] > loserVotes[b] ? a : b));
    }
}
