const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');

// Utiliser le plugin stealth pour Puppeteer
puppeteer.use(stealthPlugin());

// Importer le chemin d'exécutable de Puppeteer
const { executablePath } = require('puppeteer');

// Fonction pour extraire le texte d'un site web
async function extractTextFromPage(url) {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
        ignoreHTTPSErrors: true,
        executablePath: executablePath(),  // Utiliser le chemin d'exécutable de Puppeteer standard
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const pageText = await page.evaluate(() => {
        return document.body.innerText;
    });

    await browser.close();

    const trimmedText = pageText.replace(/\s+/g, ' ').trim();
    const limitedText = trimmedText.substring(0, 1000);

    return limitedText;
}

// Route POST to summarise company
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
                    { role: "user", content: `You have to accurately present the company in maximum 4 sentences in ${language} following those informations: ${extractedText}. Please use third-person perspective and provide an external view.` }
                ],
                max_tokens: 500 // Limiter le nombre de tokens à 500
            })
        });

        const responseData = await response.json();

        res.json({ result: true, summary: responseData.choices[0].message.content });
    } catch (error) {
        console.error("Erreur lors de la demande à l'API de ChatGPT :", error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la demande à l'API de ChatGPT." });
    }
});



router.post('/analysis', async (req, res) => {
    try {
        const { dataToAnalyse, language, nameCompany, countryCompany, countriesAction, numberOfEmployees, sellOnLine} = req.body;

        if (!dataToAnalyse) {
            return res.status(400).json({ error: 'No data to analyse.' });
        }

        // Faire une requête à l'API de ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GPT_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a business lawyer specialized in business description and analysis." },
                    { role: "user", content: `You have to have a global understanding of the business, the products and the services of a company, if needed ask questions.
                        Here is the context: ${dataToAnalyse} . name of the company : ${nameCompany} Country of the company: ${countryCompany} , the scope of a company's activities :  ${countriesAction} , number of employee : ${numberOfEmployees}, does it sell online ? : ${sellOnLine}  Answer in ${language}. 
                        Do not mention regulations. Only provide an RFC8259 compliant JSON response following this format without deviation:
                        {
                        "result": true if you don't need extra info and false if you need extra info,
                        if true then make a resume of all the information in maximum 5 setences with the format : "summary" : your resume,
                        if false then : "questions": ["complete here with array of questions if need extra info, each array is composed of an object {question : question you want to ask, examples : some brief examples of possible answer, examples are not in an array}"]
                        }. 
                        ` }
                ],
                max_tokens: 500 // Limiter le nombre de tokens à 500
            })
        });

        const responseData = await response.json();

        // Essayer de parser le contenu JSON de la réponse
        let content = responseData.choices[0].message.content;
        content = content.replace(/```json|```/g, '').trim();

        console.log("responseData", content);

        // Essayer de parser le contenu JSON de la réponse
        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (parseError) {
            console.error("Erreur lors du parsing du JSON :", parseError);
            return res.status(500).json({ error: "Erreur lors du parsing du JSON." });
        }

        res.json(parsedContent);
    } catch (error) {
        console.error("Erreur lors de la demande à l'API de ChatGPT :", error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la demande à l'API de ChatGPT." });
    }
});



/* summary */


router.post('/finalSummary', async (req, res) => {
    try {
        const { dataToAnalyse, language, nameCompany, countryCompany, countriesAction, numberOfEmployees, sellOnLine, extraInformation} = req.body;

        if (!dataToAnalyse) {
            return res.status(400).json({ error: 'No data to analyse.' });
        }

        const additionalInfo = extraInformation.map(info => `- ${info.question}: ${info.response}`).join('\n');

        console.log("additionalInfo",additionalInfo)

        const promptContent = `
        Here are the details concerning a business:
    
        - Name: ${nameCompany}
        - Country: ${countryCompany}
        - Scope of activities: ${countriesAction}
        - Number of employees: ${numberOfEmployees}
        - Sells online: ${sellOnLine}
        - Context: ${dataToAnalyse}
    
        Additional information to consider (answers to questions):
        ${additionalInfo}
    
        Answer in ${language}. Please write a professional, concise summary (5 sentences) of the company's business, products, and services, scope of activities and location. Use short, clear sentences.
        `;

        // Faire une requête à l'API de ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GPT_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a business lawyer specialized in business description and analysis." },
                    { role: "user", content: promptContent }
                ],
                max_tokens: 500 // Limiter le nombre de tokens à 500
            })
        });

        const responseData = await response.json();

        res.json({result : true, summary : responseData.choices[0].message.content});
    } catch (error) {
        console.error("Erreur lors de la demande à l'API de ChatGPT :", error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la demande à l'API de ChatGPT." });
    }
});


/* create structure */

router.post('/structureTerms', async (req, res) => {
    try {
        const { dataForStructure, language} = req.body;

        if (!dataForStructure) {
            return res.status(400).json({ error: 'No data to analyse.' });
        }

        const promptContent = `
        Here is a summary about a business :${dataForStructure}. I want you to first define all the important points / aspects of this company.
        Then in fiunction of the sector and the location determine the regulations that could apply to this business.

        Then create the structure of the terms and conditions: with the name of each section + a resume of the points / information that have to be in each section + eventual regulation that apply. Only provide an RFC8259 compliant JSON response following this format without deviation:
        {result : true,
        structure : [
        {section : "name of section 1",
         information : "information + regulation of section 1"
        },
        {section : "name of section 2",
         information : "information + regulation of section 2"
        },
        ]
        }
    
        Answer in ${language}. 
        `;

        // Faire une requête à l'API de ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GPT_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: "You are a business lawyer specialized in writing terms of service for companies." },
                    { role: "user", content: promptContent }
                ],
            })
        });

       
        const responseData = await response.json();

        // Essayer de parser le contenu JSON de la réponse
        let content = responseData.choices[0].message.content;
        content = content.replace(/```json|```/g, '').trim();

        // Essayer de parser le contenu JSON de la réponse
        let parsedContent;
        try {
            parsedContent = JSON.parse(content);
        } catch (parseError) {
            console.error("Erreur lors du parsing du JSON :", parseError);
            return res.status(500).json({ error: "Erreur lors du parsing du JSON." });
        }

        res.json(parsedContent);
    } catch (error) {
        console.error("Erreur lors de la demande à l'API de ChatGPT :", error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la demande à l'API de ChatGPT." });
    }
});

module.exports = router;

