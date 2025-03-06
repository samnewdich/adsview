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
// @ts-ignore
const ahk = require('node-ahk'); //for gui interaction
//const ahk = new Ahk();

const port = 2000;
const app = express();
app.use(expressUserAgent.express());
puppeteer.use(StealthPlugin());

app.use(bodyParser.urlencoded({extended:false}));



app.get("/reboot", (req, res)=>{

async function rebootRouter() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Replace with your router's admin panel URL
    await page.goto('http://192.168.0.1'); 

    // Replace with your router's username and password
    //await page.type('#username', 'admin'); 
    await page.type('#password', '41969598'); //replace with your wifi management login password    
    await page.click('#loginBtn'); // Adjust selector based on router's login button

    await new Promise(resolve => setTimeout(resolve, 5000));

    //go to the reboot page
    const pagereboot = await browser.newPage();
    await pagereboot.goto('http://192.168.0.1/settings.html#Advanced/Device/Shutdown');

    // Wait for page to load and find the reboot button
    await pagereboot.waitForSelector('#rebootBtn'); // Adjust selector
    await pagereboot.click('#rebootBtn');

    // Wait for page to load and find the reboot button
    await pagereboot.waitForSelector('#rebootBtn'); // Adjust selector
    await pagereboot.click('#rebootBtn');

    console.log('Reboot command sent!');

    await new Promise(resolve => setTimeout(resolve, 20000));
    await browser.close();
}

rebootRouter();

});


//GET THE input
app.post("/dash", (req, res)=>{
    const {url, appid} = req.body;
    if(!url){
        return res.render("/", {
            error:"URL and App ID must be provided"
        });
    }
    
    
    //const url ="https://newdich.tech/institute/all/";
    //check if appid is valid

    const browseWebsite = async()=>{
        try{
            //CHANGE MAC ADDRESS BEFORE RECONNECTING
            function changeMacAndReconnect() {
                const platform = os.platform();
                
                if (platform === "win32") {
                    changeMacWindows();
                } else if (platform === "linux") {
                    changeMacLinux();
                } else {
                    console.log("Unsupported OS");
                }
            }

            //Change MAC on Windows
            function changeMacWindows() {
                console.log("Changing MAC Address on Windows...");
                
                exec("netsh interface show interface", (err, stdout) => {
                    if (err) return console.error("Error getting interfaces:", err);
                    
                    const match = stdout.match(/Wireless\s+(\S+)/);
                    if (!match) return console.error("WiFi adapter not found!");

                    const adapter = match[1];
                    const newMac = generateRandomMac();

                    exec(`netsh interface set interface "${adapter}" admin=disable`, () => {
                        exec(`reg add "HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}\\0001" /v NetworkAddress /t REG_SZ /d ${newMac} /f`, (err) => {
                            if (err) return console.error("Error changing MAC:", err);
                            
                            exec(`netsh interface set interface "${adapter}" admin=enable`, () => {
                                console.log(`✅ MAC changed to: ${newMac}`);
                                reconnectWiFi();
                            });
                        });
                    });
                });
            }

            //Change MAC on Linux (Requires macchanger)
            function changeMacLinux() {
                console.log("Changing MAC Address on Linux...");
                
                exec("nmcli dev status", (err, stdout) => {
                    if (err) return console.error("Error getting interfaces:", err);
                    
                    const match = stdout.match(/wifi\s+(\S+)/);
                    if (!match) return console.error("WiFi adapter not found!");

                    const adapter = match[1];
                    const newMac = generateRandomMac();

                    exec(`sudo ifconfig ${adapter} down && sudo macchanger -m ${newMac} ${adapter} && sudo ifconfig ${adapter} up`, (err) => {
                        if (err) return console.error("Error changing MAC:", err);
                        
                        console.log(`✅ MAC changed to: ${newMac}`);
                        reconnectWiFi();
                    });
                });
            }






            const wifiName ="Wi-Fi";
            const disconnectWiFi = async ()=>{
                exec(`netsh interface set interface name="${wifiName}" admin=disable`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error disconnecting: ${error.message}`);
                        return;
                    }
                    console.log("Wi-Fi disconnected");
                    
                    // Reconnect after 3 seconds
                    setTimeout(reconnectWiFi, 3000);
                });
            }


            // Function to reconnect to Wi-Fi
            const reconnectWiFi = async ()=>{
                exec(`netsh interface set interface name="${wifiName}" admin=enable`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error reconnecting: ${error.message}`);
                        return;
                    }
                    console.log(`Reconnected to Wi-Fi: ${wifiName}`);
                });
            }
            
            
            //connect to windscribe
            const connectWindscribe = async()=>{
                exec("windscribe-cli connect", (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            console.error(`Stderr: ${stderr}`);
                            return;
                        }
                        console.log(`Output: ${stdout}`);
                    });
            }
            
            //disconnect from windscribe
            const disConnectWindscribe = async()=>{
                exec("windscribe-cli disconnect", (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            console.error(`Stderr: ${stderr}`);
                            return;
                        }
                        console.log(`Output: ${stdout}`);
                    });
            }
            


            //start the proccessing here
            changeMacAndReconnect()
            await new Promise(resolve => setTimeout(resolve, 5000));

            //disconnectWiFi();
            //await new Promise(resolve => setTimeout(resolve, 10000));

            //connectWindscribe();
            //await new Promise(resolve => setTimeout(resolve, 15000));

            //open puppeteer to open browser
            console.log(`Windscribe connected, App opening..`);

            //Create a random screensize
            const randomWidth = Math.floor(Math.random() * (2560 - 1366 + 1)) + 1366; // 1366-2560
            const randomHeight = Math.floor(Math.random() * (1440 - 768 + 1)) + 768; // 768-1440

            //set browser
            const browser = await puppeteer.launch({
                headless: false,
                executablePath: executablePath(),
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-extensions',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    `--window-size=${randomWidth},${randomHeight}`
                ]
            });

            const page = await browser.newPage();

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

            // Set extra HTTP headers
            await page.setExtraHTTPHeaders({
                'Referer': 'https://www.google.com/',
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


            //let puppeteer detects popup or prompt and allow it
            page.on('dialog', async dialog => {
                console.log(`Dialog message: ${dialog.message()}`);
                if (dialog.message().toLowerCase().includes("allow")) {
                    await dialog.accept();
                    console.log("Popup allowed!");
                } else {
                    await dialog.dismiss();
                    console.log("Popup dismissed!");
                }
            });

            
            await page.goto(url, { waitUntil: 'networkidle2' });


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


            /*async function randomClick() {
                const links = await page.$$('a');
                if (links.length > 0) {
                    const randomLink = links[Math.floor(Math.random() * links.length)];
                    await randomLink.click();
                    console.log("Clicked on a random link!");
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            

            async function simulateTyping() {
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
            //await randomClick();
            //await simulateTyping();

            // Wait before closing
            await new Promise(resolve => setTimeout(resolve, 20000));
            await browser.close();

            // Disconnect Windscribe and wait 5 seconds before reconnecting
            //await disConnectWindscribe();
            await new Promise(resolve => setTimeout(resolve, 5000));
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
