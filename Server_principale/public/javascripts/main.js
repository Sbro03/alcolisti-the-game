let socket = io();
let loginForm;
let images = [];
let imageContainer;

function init(){
    loginForm = document.getElementById('joinRoomForm');
    imageContainer = document.getElementById('imageContainer');
    if(loginForm){
        loginForm.onsubmit = validateLogin;
    }
    if(imageContainer){
        getImages();
    }
}

function validateLogin(event) {
    event.preventDefault();
    console.log("eja");

    // Ottieni i valori dal form
    const roomCode = document.getElementById('roomCode').value;
    const playerName = document.getElementById('playerName').value;

    // Verifica che i campi siano compilati
    if (!roomCode || !playerName) {
        alert('Entrambi i campi sono obbligatori!');
        return;
    }

    // Invia il nome e il codice della stanza al server tramite Socket.IO
    socket.emit('joinRoom', { roomCode, playerName });
}

// Gestisci la risposta del server dopo il login
socket.on('roomData', (data) => {
    if (data.success) {
        // Se il login è valido, reindirizza al gioco
        alert("letsgooski");
        window.location.href = `/room/${data.roomCode}`;
    } else {
        // Mostra un messaggio di errore
        alert(data.message);
    }
});

//Funzione che manda richieste di immagini al backend
async function getImages(){
    try{
        let response = await axios.get("http://localhost:3000/images");
    }
}