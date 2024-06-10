const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

// Fonction pour extraire le texte d'un site web
async function extractTextFromPage(url) {
    const browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Extraire le texte du body de la page
    const pageText = await page.evaluate(() => {
        return document.body.innerText;
    });

    await browser.close();

    // Trim et limiter à 1000 caractères
    const trimmedText = pageText.replace(/\s+/g, ' ').trim();
    const limitedText = trimmedText.substring(0, 1000);

    return limitedText;
}

// Route POST pour interroger ChatGPT
router.post('/summarize', async (req, res) => {
    try {
        const { pageUrl, language } = req.body;

        if (!pageUrl) {
            return res.status(400).json({ error: 'No page URL found.' });
        }

        // Extraire le texte de la page
        const extractedText = await extractTextFromPage(pageUrl);

        // Faire une requête à l'API de ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GPT_KEY}` 
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a specialist in writing company descriptions." },
                    { role: "user", content: `You have to accurately present the company in maximum 5 sentences in ${language} following those informations: ${extractedText}. Please use third-person perspective and provide an external view.` }
                ]
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
