const fs = require('fs');
const path = require('path');
const { mdToPdf } = require('md-to-pdf');

const MARKDOWN_FILE = path.join(__dirname, '../docs/StockPredictorAI_WhitePaper.md');
const PDF_FILE = path.join(__dirname, '../docs/StockPredictorAI_WhitePaper.pdf');

// Generate PDF
console.log('Generating Whitepaper PDF...');
(async () => {
    try {
        const pdf = await mdToPdf(
            { path: MARKDOWN_FILE },
            {
                dest: PDF_FILE,
                css: `
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
                    blockquote {
                        border-left: 4px solid #3498db;
                        padding-left: 1em;
                        color: #7f8c8d;
                        font-style: italic;
                        background: #f9f9f9;
                        padding: 1em;
                        margin: 1.5em 0;
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
                        font-weight: bold;
                    }
                    h1:first-of-type + p + p {
                         text-align: center;
                         font-size: 14px;
                         color: #95a5a6;
                         margin-bottom: 4em;
                    }
                `,
                pdf_options: {
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
                }
            }
        );
        if (pdf) {
            console.log(`PDF generated successfully: ${PDF_FILE}`);
        }
    } catch (err) {
        console.error('Error generating PDF:', err);
    }
})();
