let socket = io();
let loginForm;
let images = [];
let imageContainer;
let selectBtns;
let roomCode;
let gameData;
let phrase;

async function init(){
    console.log(window.roomCode);
    loginForm = document.getElementById('joinRoomForm');
    imageContainer = document.getElementById('imageContainer');
    phrase = document.getElementById('phrase');
    if(loginForm){
        loginForm.onsubmit = validateLogin;
    }
    if(imageContainer){
        showPhrase();
        await getImages();
        selectBtns = document.querySelectorAll(".select-card");
        console.log(selectBtns);
        selectBtns.forEach(btn => {
            btn.onclick = imageSelected;
        })
    }
}

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

// Gestisci la risposta del server dopo il login
socket.on('roomData', (data) => {
    if (data.success) {
        // Se il login è valido, reindirizza al gioco
        window.location.href = `/room/${data.roomCode}`;
    } else {
        // Mostra un messaggio di errore
        alert(data.message);
    }
});

function showPhrase(){
    phrase.innerHTML = "UAAAAAA";
}

function addImage(image,name, index){
    return `
            <div class="col-lg-3 col-md-4 col-sm-6 col-12 mb-4">
                <div class="card bg-dark text-light shadow-sm">
                    <img src="data:image/jpeg;base64,${image}" class="card-img-top" alt="Immagine ${index + 1}">
                    <div class="card-body text-center">
                        <button class="btn btn-outline-primary w-100 select-card" data-image="${name}">
                            Seleziona
                        </button>
                    </div>
                </div>
            </div>
        `;
}

function generateImages(list){
    list.forEach((blob,index) => {
        const cardHtml = addImage(blob.fileContent, blob.fileName, index);
        // Append the generated card to the container
        imageContainer.insertAdjacentHTML('beforeend', cardHtml);
    })
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
    console.log(element.dataset.image);
    socket.emit('cardSelected', window.roomCode, element.dataset.image);
}
