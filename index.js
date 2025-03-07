const express = require('express');
const expressUserAgent = require('express-useragent');
const uaParserJs = require('ua-parser-js');
const bodyParser = require('body-parser');
const UserAgent = require('user-agents');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { exec } = require('child_process');
const { executablePath } = require('puppeteer');
const os = require("os"); //used to change MAC address
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { timeout } = require('puppeteer');

const port = process.env.APP_PORT;
const app = express();
app.use(expressUserAgent.express());
puppeteer.use(StealthPlugin());

app.use(bodyParser.urlencoded({extended:false}));

app.set('view engine', 'pug');
app.set('views', './pugfold');


//GET THE input
app.post("/dash", (req, res)=>{
    const {url, appid} = req.body;
    if(!url){
        return res.render("/", {
            error:"URL and App ID must be provided"
        });
    }

    res.render('task-started', {
        url:url,
        message:"Task has started, do not close this page"
    });
    



    //FUNCTION THAT DOES THE JOB
    const browseWebsite = async()=>{
        try{
            console.log(`Task is starting..`);
            
            //Create a random screensize
            const randomWidth = Math.floor(Math.random() * (2560 - 1366 + 1)) + 1366; // 1366-2560
            const randomHeight = Math.floor(Math.random() * (1440 - 768 + 1)) + 768; // 768-1440

            //set browser
            const certPath = path.resolve(__dirname, 'brightdata.pem'); // ssl from brightdata
            const browser = await puppeteer.launch({
                headless: false,
                executablePath: executablePath(),
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-extensions',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    `--window-size=${randomWidth},${randomHeight}`,
                    `--proxy-server=http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`,
                    "--ignore-certificate-errors", // Ignore SSL certificate issues
                    `--ssl-client-certificate=${certPath}`, // Load the SSL certificate
                ],
                ignoreHTTPSErrors: true // Ignore SSL errors
                //timeout: process.env.LOAD_TIMEOUT // Increase timeout
            });

            const page = await browser.newPage();

            // Authenticate Proxy
            try {
                await page.authenticate({
                    username: process.env.PROXY_USERNAME,
                    password: process.env.PROXY_PASSWORD
                });
                console.log("Found a real IP and successfully connected to a node...");
            } catch (error) {
                console.error("Proxy authentication failed:", error);
                await browser.close();
                return;
            }

            // Set random User-Agent
            const userAgent = new UserAgent().toString();
            await page.setUserAgent(userAgent);

            // Spoof fingerprinting & screen size
            await page.evaluateOnNewDocument((width, height, userAgentInner) => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                Object.defineProperty(navigator, 'userAgent', { get: () => userAgentInner });
                Object.defineProperty(navigator, 'platform', { get: () => userAgentInner.includes('Windows') ? 'Win32' : 'Linux' });
                Object.defineProperty(navigator, 'vendor', { get: () => userAgentInner.includes('Chrome') ? 'Google Inc.' : 'Apple' });

                Object.defineProperty(window, 'screen', {
                    get: () => ({ width, height, availWidth: width, availHeight: height })
                });

                // Spoof WebGL & GPU
                WebGLRenderingContext.prototype.getParameter = function (parameter) {
                    if (parameter === 37445) return 'Intel Inc.';
                    if (parameter === 37446) return 'Intel Iris OpenGL Engine';
                    return WebGLRenderingContext.prototype.getParameter(parameter);
                };

                // Spoof Canvas Fingerprinting
                HTMLCanvasElement.prototype.getContext = function (type) {
                    return type === '2d' ? {} : HTMLCanvasElement.prototype.getContext.apply(this, arguments);
                };
            }, randomWidth, randomHeight, userAgent);


            function getRandomReferrer(arr) {
                return arr[Math.floor(Math.random() * arr.length)];
            }
            const theReferrers = ["https://www.google.com/", "https://facebook.com/", "https://www.gmail.com/", "https://t.me/", "https://www.x.com/", "https://www.tiktok.com/", "https://www.instagram.com/", "https://m.facebook.com/", "https://nairaland.com/", "https://www.medium.com/", "https://www.quora.com/", "https://www.pinterest.com/"];
            const randomReferrer = getRandomReferrer(theReferrers);

            // Set extra HTTP headers
            await page.setExtraHTTPHeaders({
                'Referer': randomReferrer,
                'Accept-Language': 'en-US,en;q=0.9'
            });

            // Disable WebRTC (prevent real IP leaks)
            await page.evaluateOnNewDocument(() => {
                Object.defineProperty(navigator, 'mediaDevices', {
                    get: () => ({
                        getUserMedia: () => Promise.reject(new Error("WebRTC Disabled"))
                    })
                });
            });

            console.log("Navigating to website...");


        

            //await page.goto(url, { waitUntil: 'networkidle2'});
            await page.goto(url, { waitUntil: 'load', timeout:0}); //timeout disabled


            // Simulate human-like interactions
            async function scrollPage() {
                await page.evaluate(async () => {
                    const delay = (ms) => new Promise(res => setTimeout(res, ms));
                    let scrollHeight = document.body.scrollHeight;
                    let currentPosition = 0;

                    while (currentPosition < scrollHeight) {
                        window.scrollBy(0, Math.random() * 200 + 100);
                        await delay(Math.random() * 1000 + 500);
                        currentPosition = window.scrollY;
                        scrollHeight = document.body.scrollHeight;
                    }

                    await delay(2000);

                    while (currentPosition > 0) {
                        window.scrollBy(0, -(Math.random() * 200 + 100));
                        await delay(Math.random() * 1000 + 500);
                        currentPosition = window.scrollY;
                    }
                });
            }

            async function moveMouseRandomly() {
                for (let i = 0; i < 5; i++) {
                    const x = Math.floor(Math.random() * 800) + 100;
                    const y = Math.floor(Math.random() * 500) + 100;
                    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 3 });
                    await page.waitForSelector('body', { visible: true, timeout: Math.random() * 1000 + 1000 });
                }
            }


            async function randomClick() {
                //const links = await page.$$('a');
                //NOTE: wrap area to click with the element id braintan
                await page.waitForSelector('#braintan'); // Adjust selector
                await page.click('#braintan');
                console.log('Clicked a random ads".');
            }
            

            /*async function simulateTyping() {
                const searchInput = await page.$('input[type="search"]');
                if (searchInput) {
                    const randomText = ["study abroad", "work abroad", "Travelling", "Technology"];
                    const text = randomText[Math.floor(Math.random() * randomText.length)];
                    await searchInput.click();
                    await page.keyboard.type(text, { delay: Math.random() * 100 + 50 });
                    await page.keyboard.press('Enter');
                    console.log(`Typed and searched: ${text}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            */

            

            // Perform human-like actions
            //await moveMouseRandomly();
            //await scrollPage();
            //await simulateTyping();

            //let the page loads finish before clicking the ads
            //await page.waitForSelector('body', { visible: true, timeout: Math.random() * 1000 + 1000 });
            

            // Wait before closing
            //set random seconds to wait
            function getRandomWaiter(arr) {
                return arr[Math.floor(Math.random() * arr.length)];
            }
            const waitinTime = [15000, 20000, 18000, 25000, 19000, 30000, 22000, 35000, 28000, 10000, 40000, 33000, 24000, 17000, 31000, 44000];
            const randomWaiter = getRandomWaiter(waitinTime);
            await new Promise(resolve => setTimeout(resolve, randomWaiter));

            //NOW THAT IT HAS WAITED ENOUGH, CLICK THE ADS
            await randomClick();
            //AFTER CLICKING ADS, ALSO WAIT SOME SECONDS
            await new Promise(resolve => setTimeout(resolve, randomWaiter));

            await browser.close();
            
            await new Promise(resolve => setTimeout(resolve, process.env.TIME_BEFORE_RESTART));
            browseWebsite(); // Repeat the process
        }
        catch(error){
            console.error("The error is :", error);
        }
    }



    browseWebsite();
});






app.get("/", (req, res)=>{
    return res.sendFile(__dirname +'/index.html');
});

app.listen(port, () => {
    console.log(`Server started at port ${port}`);
});
