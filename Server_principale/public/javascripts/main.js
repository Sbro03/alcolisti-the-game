let socket = io();
let loginForm;
let images = [];
let imageContainer;
let selectBtns;
let roomCode;
let roomData;
let playerData;
let selectedImages; //Images selected by all the players
let phrase;
let loginValidationFlag = false;

//This function load every global variable and the content (if needed)
async function init(){
    loginForm = document.getElementById('joinRoomForm');
    imageContainer = document.getElementById('imageContainer');
    phraseElement = document.getElementById('phrase');
    if(loginForm){
        loginForm.onsubmit = validateLogin;
    }
    if(imageContainer){
        loginValidationFlag = localStorage.getItem('loginValidationFlag');
        roomCode = JSON.parse(localStorage.getItem("roomCode"));
        roomData = JSON.parse(localStorage.getItem("roomData"));
        socket.emit("roomData", roomCode, roomData);
        playerData = JSON.parse(localStorage.getItem("playerData"));
        phrase = JSON.parse(localStorage.getItem("phrase"));
        if (playerData.id && roomCode && playerData.name) {
            // Attempt to reconnect to the room
            socket.emit('reconnectToRoom', playerData.id, roomCode);
        }
        showPhrase();
        await getImages();
        selectBtns = document.querySelectorAll(".select-card");
        selectBtns.forEach(btn => {
            btn.onclick = imageSelected;
        })
    }
}

//SOCKET EVENTS

// Gestisci la risposta del server dopo il login
socket.on('roomData', (data) => {
    if (data.success) {
        console.log(data);
        localStorage.setItem("roomData", JSON.stringify(data.roomData));
        localStorage.setItem("roomCode", JSON.stringify(data.roomCode));
        localStorage.setItem("playerName", JSON.stringify(data.playerName));
        localStorage.setItem("playerData", JSON.stringify(data.playerData));
        localStorage.setItem("phrase", JSON.stringify(data.phrase));
        if(!loginValidationFlag){
            loginValidationFlag = data.success;
            localStorage.setItem("loginValidationFlag", JSON.stringify(loginValidationFlag));
            window.location.href = `/room/${data.roomCode}`;
        }
    } else {
        // Mostra un messaggio di errore
        alert(data.message);
    }
});

socket.on("showSelectedCards", (data) => {
    alert("Tutti i giocatori hanno fatto la loro scelta");
    selectedImages = data.map(obj => obj.image);
    console.log(data, selectedImages);
    showSelected();
})

//CLIENT-SIDE FUNCTIONS

function validateLogin(event) {
    event.preventDefault();
    // Ottieni i valori dal form
    const roomCode = document.getElementById('roomCode').value;
    const playerName = document.getElementById('playerName').value;

    // Verifica che i campi siano compilati
    if (!roomCode || !playerName) {
        alert('Entrambi i campi sono obbligatori!');
        return;
    }

    // Invia il nome e il codice della stanza al server tramite Socket.IO
    socket.emit('joinRoom', roomCode, playerName);
}


function showPhrase(){
    phraseElement.innerHTML = phrase;
}

function addImage(image,name, index){
    return `
            <div class="col-lg-3 col-md-4 col-sm-6 col-12 mb-4">
                <div class="card bg-dark text-light shadow-sm">
                    <img src="data:image/jpeg;base64,${image}" class="card-img-top" alt="Immagine ${index + 1}">
                    <div class="card-body text-center">
                        <button class="btn btn-outline-primary w-100 select-card" data-file-name="${name}" data-file-content="${image}">
                            Seleziona
                        </button>
                    </div>
                </div>
            </div>
        `;
}

function addVote(image,name, index){
    return `
            <div class="col-lg-3 col-md-4 col-sm-6 col-12 mb-4">
                <div class="card bg-dark text-light shadow-sm">
                <img src="data:image/jpeg;base64,${image}" class="card-img-top" alt="Immagine ${index + 1}">
                    <div class="card-body text-center">
                        <!-- Primo pulsante: verde, testo "Seleziona vincitore" -->
                        <button class="btn btn-outline-success w-100 select-card"
                                data-file-name="${name}" data-file-content="${image}">
                            Seleziona vincitore
                        </button>
                        <!-- Secondo pulsante: rosso, testo "Seleziona perdente" -->
                        <button class="btn btn-outline-danger w-100 mt-2 select-card"
                                data-file-name="${name}" data-file-content="${image}">
                            Seleziona perdente
                        </button>
                    </div>
                </div>
            </div>
        `;
}

function generateImages(list, mode){
    list.forEach((blob,index) => {
        let cardHtml;
        if(!mode || mode === "default"){
            cardHtml = addImage(blob.fileContent, blob.fileName, index);
        }else if(mode === "vote"){
            cardHtml = addVote(blob.fileContent, blob.fileName, index);
        }
        playerData.drawedImages.push(blob.fileName);
        // Append the generated card to the container
        imageContainer.insertAdjacentHTML('beforeend', cardHtml);
    })

    //Updating roomData
    let playerIndex = roomData.players.findIndex((p) => p.id === playerData.id);
    roomData.players[playerIndex] = playerData;
    socket.emit("roomData", roomCode, roomData);
}

//Funzione che manda richieste di immagini al backend
async function getImages(){
    try{
        let response = await axios.get("http://localhost:3000/images");
        let blobList = response.data.images;
        generateImages(blobList);
    }catch (e) {
        console.log(e);
    }
}

function imageSelected(event){
    let element = event.target;
    socket.emit('cardSelected', roomCode, playerData, element.dataset);
}

function showSelected(){
    imageContainer.replaceChildren();
    generateImages(selectedImages, "vote");
}
