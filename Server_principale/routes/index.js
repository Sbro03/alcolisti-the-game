var express = require('express');
var router = express.Router();
const axios = require("axios");
/**
 * @swagger
 * /:
 *   get:
 *     summary: Reindirizza alla pagina con il form per entrare in una stanza
 *     tags:
 *       - Navigazione
 *     responses:
 *       302:
 *         description: Redirect alla pagina con il form (route /rooms)
 *       500:
 *         description: Errore interno del server
 */
router.get('/', (req, res) => {
  try {
    // Reindirizza alla route "/rooms"
    res.redirect('/rooms');
  } catch (error) {
    // Risponde con un errore 500 in caso di problemi
    res.status(500).send('Errore interno del server');
  }
});
/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: Mostra la pagina con il form per entrare in una stanza
 *     tags:
 *       - Rooms
 *     responses:
 *       200:
 *         description: Pagina HTML con il form per entrare o creare una stanza
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<html>...</html>"
 *       500:
 *         description: Errore interno del server
 */
router.get('/rooms', (req, res) => {
  try {
    // Renderizza il template Handlebars "rooms"
    res.render('rooms');
  } catch (error) {
    // Risponde con un errore 500 in caso di problemi
    res.status(500).send('Errore interno del server');
  }
});
/**
 * @swagger
 * /room/{roomCode}:
 *   get:
 *     summary: Ottieni informazioni sulla stanza di gioco
 *     description: Restituisce i dettagli della stanza di gioco, inclusi i giocatori e lo stato del gioco.
 *     parameters:
 *       - name: roomCode
 *         in: path
 *         required: true
 *         description: Il codice della stanza a cui il giocatore vuole accedere.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successo, la stanza esiste e contiene i dettagli del gioco.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 roomCode:
 *                   type: string
 *                   example: "abc123"
 *                 players:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "socket_id_1"
 *                       name:
 *                         type: string
 *                         example: "Giocatore1"
 *                 gameState:
 *                   type: string
 *                   example: "waiting_for_players"
 *       404:
 *         description: La stanza non esiste.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "La stanza non esiste."
 */
// Gestiamo la route per l'accesso alla stanza di gioco
router.get('/room/:roomCode', (req, res) => {
  const roomCode = req.params.roomCode;
  res.render("game", {roomCode: roomCode});
});
/**
 * @swagger
 * /:
 *   get:
 *     summary: Manda al client una lista di immagini prese dal server secondario nella porta 3001
 *     tags:
 *       - Invio dati
 *     responses:
 *       200:
 *         description: Immagini inviate correttamente al server
 *         content:
 *            Array
 *              schema:
 *                type: object
 *       500:
 *         description: Errore interno del server
 */
router.get('/images', async (req, res) => {
  let response = [];
  try {
    //Makes a request to the secondary server in order to take images as blob files
    const externalResponse = await axios.get('http://localhost:3001/images/4');
    //Every player takes tot images and this number is determined by the endpoint

    //Checking the response
    if (externalResponse.status === 200 && externalResponse.data.success) {
      // Restituisci la lista di blob al client
      res.status(200).json({
        success: true,
        images: externalResponse.data.images,
      });
    } else {
      // Gestione di risposte non valide
      res.status(500).json({
        success: false,
        message: 'Errore nella risposta dal server esterno',
      });
    }
  } catch (error) {
    // Gestione degli errori durante la richiesta
    console.error('Errore:', error.message);

    res.status(500).json({
      success: false,
      message: 'Errore durante la richiesta al server esterno',
    });
  }
})

module.exports = router;

