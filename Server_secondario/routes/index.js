var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
const axios = require('axios');
const imagesFolder = path.join(__dirname, '../public/images');
let imagesNames = fs.readdirSync(imagesFolder);

function extractImages(tot) {
  // Verifica che tot non superi il numero disponibile di file rimanenti
  if (tot > imagesNames.length) {
    throw new Error(`Non è possibile estrarre più di ${imagesNames.length} file disponibili.`);
  }

  // Mescola l'array con l'algoritmo Fisher-Yates
  for (let i = imagesNames.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [imagesNames[i], imagesNames[j]] = [imagesNames[j], imagesNames[i]];
  }

  if(imagesNames.length <= 0) {
    imagesNames = fs.readdirSync(imagesFolder);
    //Reloading the list with all images if all available images are finished
  }
  const extracted = imagesNames.splice(0, tot);

  // Restituisce i file estratti
  return extracted;
}

router.get("/images/:number", function(req, res) {
  const numPhotos = req.params.number;
  try{
    const extractedImages = extractImages(numPhotos);
    console.log(`Immagini rimanenti:${imagesNames.length}`);
    const blobs = extractedImages.map(imageName => {
      const filePath = path.join(imagesFolder, imageName);
      const fileContent = fs.readFileSync(filePath); // Legge il contenuto del file come buffer
      return {
        fileName: imageName,
        fileContent: fileContent.toString('base64'), // Converti in base64 per invio sicuro
      };
    });

    // Invia i blob come JSON
    res.json({
      success: true,
      images: blobs,
    });
  }catch (e) {
    // Gestione errori
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }



})

module.exports = router;
