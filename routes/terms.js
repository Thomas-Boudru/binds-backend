const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Route POST pour interroger ChatGPT
router.post('/chat', async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'No question found.' });
        }

        // Faire une requête à l'API de ChatGPT
        const response = await fetch('https://api.openai.com/v1/engines/text-davinci-003/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GPT_KEY}` 
            },
            body: JSON.stringify({
                prompt: question,
                max_tokens: 150 
            })
        });

        const responseData = await response.json();

        res.json(responseData);
    } catch (error) {
        console.error("Erreur lors de la demande à l'API de ChatGPT :", error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la demande à l'API de ChatGPT." });
    }
});

module.exports = router;
