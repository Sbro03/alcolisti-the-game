var express = require('express');
var router = express.Router();
var fs = require('fs');
var axios = require('axios');

router.get("/images/:number", function(req, res) {
  const numPhotos = req.params.number;

})

module.exports = router;
