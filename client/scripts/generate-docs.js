const fs = require('fs');
const path = require('path');
const { mdToPdf } = require('md-to-pdf');

const SCREENSHOTS_DIR = path.join(__dirname, '../cypress/screenshots');
const IMAGES_DIR = path.join(__dirname, '../docs/images');

const WALKTHROUGH_MD = path.join(__dirname, '../docs/StockPredictorAI_Walkthrough.md');
const WALKTHROUGH_PDF = path.join(__dirname, '../docs/StockPredictorAI_Walkthrough.pdf');

const WHITEPAPER_MD = path.join(__dirname, '../docs/StockPredictorAI_WhitePaper.md');
const WHITEPAPER_PDF = path.join(__dirname, '../docs/StockPredictorAI_WhitePaper.pdf');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Move screenshots (for Walkthrough)
console.log('Moving screenshots...');
if (fs.existsSync(SCREENSHOTS_DIR)) {
    const files = fs.readdirSync(SCREENSHOTS_DIR);
    files.forEach(file => {
        const src = path.join(SCREENSHOTS_DIR, file);
        const dest = path.join(IMAGES_DIR, file);
        fs.copyFileSync(src, dest);
        // console.log(`Moved: ${file}`);
    });
    console.log(`Moved ${files.length} screenshots to ${IMAGES_DIR}`);
} else {
    console.warn(`Screenshots directory not found: ${SCREENSHOTS_DIR}`);
}

const commonCss = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&family=Open+Sans:wght@400;600&display=swap');
    body {
        font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.6;
        color: #333;
    }
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Open Sans', sans-serif;
        color: #2c3e50;
        margin-top: 2em;
        margin-bottom: 1em;
        page-break-after: avoid;
        break-after: avoid;
    }
    h1 {
        font-size: 24px;
        border-bottom: 2px solid #3498db;
        padding-bottom: 0.5em;
        color: #2980b9;
    }
    h2 {
        font-size: 20px;
        border-bottom: 1px solid #bdc3c7;
        padding-bottom: 0.3em;
    }
    p {
        margin-bottom: 1em;
        text-align: justify;
    }
    blockquote {
        border-left: 4px solid #3498db;
        padding-left: 1em;
        color: #7f8c8d;
        font-style: italic;
        background: #f9f9f9;
        padding: 1em;
        margin: 1.5em 0;
    }
    code {
        background: #f4f4f4;
        padding: 2px 5px;
        border-radius: 3px;
        font-family: 'Courier New', Courier, monospace;
    }
    /* Keep headers with following content */
    h1 + p, h2 + p, h3 + p, h1 + img, h2 + img, h3 + img {
        page-break-before: avoid;
    }
    /* Avoid breaking inside code blocks */
    pre, code {
        page-break-inside: avoid;
    }
    /* Cover page styling (first h1) */
    h1:first-of-type {
        text-align: center;
        font-size: 36px;
        margin-top: 3em;
        margin-bottom: 1em;
        border-bottom: none;
        color: #2c3e50;
    }
    h1:first-of-type + p {
        text-align: center;
        font-size: 16px;
        color: #7f8c8d;
        margin-bottom: 4em;
    }
`;

const walkthroughCss = `
    ${commonCss}
    img {
        max-width: 100%;
        display: block;
        margin: 1.5em auto;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        border-radius: 4px;
        page-break-inside: avoid;
    }
`;

const whitepaperCss = `
    ${commonCss}
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 2em 0;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }
    th {
        background-color: #f2f2f2;
        font-weight: bold;
    }
    h1:first-of-type + p {
        font-weight: bold;
    }
    h1:first-of-type + p + p {
            text-align: center;
            font-size: 14px;
            color: #95a5a6;
            margin-bottom: 4em;
    }
`;

const pdfOptions = {
    format: 'A4',
    margin: {
        top: '25mm',
        bottom: '25mm',
        left: '20mm',
        right: '20mm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span style="display:none"></span>',
    footerTemplate: `
        <div style="font-size: 9px; font-family: 'Roboto', sans-serif; width: 100%; text-align: center; color: #7f8c8d; padding-bottom: 10px;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
    `
};

(async () => {
    try {
        // Generate Walkthrough PDF
        console.log('Generating Walkthrough PDF...');
        await mdToPdf(
            { path: WALKTHROUGH_MD },
            {
                dest: WALKTHROUGH_PDF,
                css: walkthroughCss,
                pdf_options: pdfOptions
            }
        );
        console.log(`✅ Walkthrough PDF generated: ${WALKTHROUGH_PDF}`);

        // Generate Whitepaper PDF
        console.log('Generating Whitepaper PDF...');
        await mdToPdf(
            { path: WHITEPAPER_MD },
            {
                dest: WHITEPAPER_PDF,
                css: whitepaperCss,
                pdf_options: pdfOptions
            }
        );
        console.log(`✅ Whitepaper PDF generated: ${WHITEPAPER_PDF}`);

    } catch (err) {
        console.error('❌ Error generating PDFs:', err);
    }
})();
