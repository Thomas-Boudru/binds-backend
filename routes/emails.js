var express = require('express');
var router = express.Router();
const Email = require('../models/emails')


// Route POST add an email to list

router.post('/listEmail', function(req, res) {
    const { email } = req.body;

    const newEmail = new Email({ email });

    newEmail.save(function(err) {
      if (err) {
        return res.status(500).json({ result: false, message: "Email error" });
      }
      // Répondre avec un message de succès
      res.status(201).json({ result: true, message: "Email success" });
    });
  });


module.exports = router;