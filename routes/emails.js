var express = require('express');
var router = express.Router();
const Email = require('../models/emails')


// Route POST add an email to list

router.post('/listEmail', async function(req, res) {
    const { email } = req.body;
  
    try {
      const newEmail = new Email({ email : email });
  
      await newEmail.save();

      res.status(201).json({ result : true, message: "Email success" });
    } catch (err) {
      res.status(500).json({ result : false,  message: "Email error" });
    }
  });


module.exports = router;