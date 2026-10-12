const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
  });
  page.on('pageerror', err => {
    console.error('[BROWSER PAGEERROR]:', err.message, err.stack);
  });
  
  console.log('Navigating to Ask Virasat page...');
  await page.goto('https://virasat-511210.web.app/case/VR-2026-0142/ask-virasat', { waitUntil: 'networkidle2' });
  
  console.log('Clicking suggested prompt...');
  const promptBtn = await page.$('button:has-text("Who can claim the HDFC account?")');
  if (promptBtn) {
    await promptBtn.click();
  } else {
    console.log('Prompt button not found by text, finding first prompt button...');
    const buttons = await page.$$('button');
    for (const b of buttons) {
      const text = await page.evaluate(el => el.textContent, b);
      if (text && text.includes('Who can claim the HDFC account?')) {
        await b.click();
        break;
      }
    }
  }
  
  console.log('Waiting 10 seconds for stream and response completion...');
  await new Promise(r => setTimeout(r, 10000));
  
  const content = await page.evaluate(() => document.body.innerText);
  console.log('Body length:', content.length);
  if (content.length < 50) {
    console.log('BODY IS BLANK! Full HTML:', await page.content());
  } else {
    console.log('Body snippet:', content.substring(0, 200));
  }
  
  await browser.close();
})();
