const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function generatePDF(name, district, training, type, period, cno, ldate, location, tscore) {
    // console.log(name, district, training, type, period, cno);
    try {
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser', // Use system-installed Chromium
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Load the HTML file
        const htmlPath = path.resolve(__dirname, '/home/masclass/training/certificate', 'file.html'); 
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        htmlContent = htmlContent.replace('{{Name}}', name).replace('{{District}}', district).replace('{{Training}}', training).replace('{{Type}}', type).
        replace('{{Start-End}}', period).replace('{{Certificate}}', cno).replace('{{Ldate}}', ldate).replace('{{Location}}', location).replace('{{prscr}}', `${tscore.prscr.pre}/${tscore.prdata.total}`).replace('{{poscr}}', `${tscore.poscr.post}/${tscore.prdata.total}`);
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const filename = `certificate_${Date.now().toString().slice(-2)}.pdf`;
        // Generate the PDF with full-page layout
        const pdfPath = path.join('/home/masclass/training/certificate', filename);
        await page.pdf({
            path: pdfPath,
            width: 1200,
            height: 767,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 } 
        });
        await browser.close();
        return filename;
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
    }
}

module.exports = {generatePDF};
