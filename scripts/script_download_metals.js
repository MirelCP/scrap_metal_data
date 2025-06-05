const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Updated target URL for scrap prices
const targetUrl = "https://www.recycleinme.com/scrappricelisting/Us%20Scrap%20Prices";

// Lista de user agents realistas
const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
];

// Accept-Language aleatorio
const acceptLanguages = [
  'en-US,en;q=0.9',
  'es-ES,es;q=0.9',
  'en;q=0.9'
];

// Carpeta donde se guardarán los HTML y screenshots (fuera de /scripts)
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const delay = (min, max) =>
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min));

// Función de desplazamiento simulando comportamiento humano
const simulateHumanScrolling = async (page) => {
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  let currentPosition = 0;
  
  while (currentPosition < scrollHeight) {
    const scrollStep = Math.floor(Math.random() * 100) + 100; // Desplazamiento aleatorio entre 100-200px
    currentPosition += scrollStep;
    await page.evaluate((step) => window.scrollBy(0, step), scrollStep);
    await delay(100, 300); // Retardo aleatorio entre desplazamientos
  }
  
  // Volver a desplazar hacia arriba
  await page.evaluate(() => window.scrollTo(0, 0));
  await delay(500, 1000);
};

(async () => {
  const sessionId = crypto.randomBytes(4).toString('hex');
  const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
  const acceptLanguage = acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)];

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.setUserAgent(userAgent);
  await page.setExtraHTTPHeaders({
    'Accept-Language': acceptLanguage,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  });

  // Espera humana antes de navegar
  await delay(2000, 4000);

  try {
    console.log(`🌍 Navigating to: ${targetUrl}`);
    await page.goto(targetUrl, { 
      waitUntil: "networkidle2", 
      timeout: 60000  // Increased timeout for slower site
    });

    // Wait for the price content to load
    await page.waitForSelector('.p-2.mobileview', { timeout: 30000 });

    // Scroll to load all content
    await simulateHumanScrolling(page);
    await delay(2000, 3000);

    // Save the HTML
    const html = await page.content();
    const filename = `scrap_prices_${sessionId}.html`;
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, html, "utf-8");
    console.log(`✅ Page saved to ${filePath}`);

    // Take a screenshot for verification
    const screenshotPath = path.join(dataDir, `screenshot_scrap_prices_${sessionId}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved to ${screenshotPath}`);

  } catch (err) {
    console.log(`⚠️ Error loading page: ${err.message}`);
  } finally {
    await browser.close();
    console.log("🏁 Process completed.");
  }
})();
