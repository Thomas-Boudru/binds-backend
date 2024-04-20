const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer')
const cheerio = require('cheerio');
const fs = require('fs');
const uid2 = require("uid2");
const path = require('path');

router.post('/extract-text', async (req, res) => {
    try {
        const { pageUrl } = req.body;

        if (!pageUrl) {
            return res.status(400).send('Veuillez fournir l\'URL de la page à partir de laquelle vous souhaitez extraire le texte.');
        }

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(pageUrl);

        // Extraction de tout le texte de la page
        const pageText = await page.evaluate(() => {
            // Utilise une expression régulière pour supprimer les espaces vides et les sauts de ligne inutiles
            return document.body.innerText.replace(/\s{2,}/g, ' ').trim();
        });

        await browser.close();

        res.send(pageText);
    } catch (error) {
        console.error('Erreur lors de l\'extraction du texte de la page :', error);
        res.status(500).send('Une erreur est survenue lors de l\'extraction du texte de la page');
    }
});



router.post('/crawl-site', async (req, res) => {
    try {
        const { siteUrl } = req.body;

        if (!siteUrl) {
            return res.status(400).send('Veuillez fournir l\'URL du site à parcourir.');
        }

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto(siteUrl);

        // Fonction pour extraire les liens de la page
        const extractLinks = async () => {
            const html = await page.content();
            const $ = cheerio.load(html);
            const links = [];
            $('a').each((index, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith(siteUrl)) {
                    links.push(href);
                }
            });
            return links;
        };

        // Fonction pour extraire le texte de la page
        const extractText = async () => {
            const pageText = await page.evaluate(() => {
                return document.body.innerText.replace(/\s{2,}/g, ' ').trim();
            });
            return pageText;
        };

        const allTexts = [];
        const visitedPages = new Set();
        const pagesToVisit = [siteUrl];

        // Parcours de toutes les pages et extraction du texte
        while (pagesToVisit.length > 0) {
            const currentUrl = pagesToVisit.shift();
            if (!visitedPages.has(currentUrl)) {
                await page.goto(currentUrl);
                visitedPages.add(currentUrl);
                const text = await extractText();
                allTexts.push(text);
                const links = await extractLinks();
                links.forEach(link => {
                    if (!visitedPages.has(link)) {
                        pagesToVisit.push(link);
                    }
                });
            }
        }

        await browser.close();

        res.json(allTexts);
    } catch (error) {
        console.error('Erreur lors du parcours du site et de l\'extraction du texte :', error);
        res.status(500).send('Une erreur est survenue lors du parcours du site et de l\'extraction du texte');
    }
});


// Remplacer les retours à la ligne par "\n"
router.post('/transformText', async (req, res) => {
    try {
        const formattedText = req.body.text.replace(/\n/g, "");
  
        res.json({ formattedText });
    } catch (error) {
        console.error('Erreur ', error);
        res.status(500).json({ error: 'Une erreur est survenue' });
    }
  });


  router.use('/generatedFiles', express.static(path.join(__dirname, 'generatedFiles')));
  router.post('/generateFile', async (req, res) => {
    try {
        const { data } = req.body;

        const random = uid2(10)

        const filePath = path.join(__dirname, `../generatedFiles/${random}_filetuning.jsonl`);

        // Écrire les données dans le fichier JSONL sans conversion en chaîne JSON
        fs.writeFileSync(filePath, data);

        const fileURL = `https://binds-backend.vercel.app/Backend/generatedFiles/${random}_filetuning.jsonl`;

        // Envoyer l'URL du fichier dans la réponse
        res.json({ message: 'JSONL file created successfully', fileURL });
    } catch (error) {
        console.error('Error creating JSONL file:', error);
        res.status(500).json({ error: 'An error occurred while creating the JSONL file' });
    }
});

module.exports = router;