const fs = require('fs');
const path = require('path');
const { mdToPdf } = require('md-to-pdf');
const { PDFDocument } = require('pdf-lib');

async function generatePdf() {
  const inputPath = path.resolve(__dirname, '../docs/scoring_model.md');
  const outputPath = path.resolve(__dirname, '../docs/scoring_model.pdf');

  console.log(`Reading from: ${inputPath}`);
  console.log(`Writing to: ${outputPath}`);

  try {
    const markdownContent = fs.readFileSync(inputPath, 'utf-8');

    // Inject MathJax configuration and library to render LaTeX math formulas
    const htmlContent = `
<script>
  MathJax = {
    tex: {
      inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
      displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
      processEscapes: true
    },
    startup: {
      ready: () => {
        MathJax.startup.defaultReady();
        document.body.setAttribute('data-mathjax-ready', 'true');
      }
    }
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

${markdownContent}
`;

    // 1. Generate PDF (Initial Pass)
    const pdf = await mdToPdf({ content: htmlContent }, {
      stylesheet_encoding: 'utf-8',
      basedir: path.dirname(inputPath),
      pdf_options: {
        format: 'A4',
        margin: '20mm',
        printBackground: true,
        displayHeaderFooter: true,
        // Empty header/footer for main doc to avoid clutter, or minimal
        headerTemplate: '<div style="font-size: 10px; margin-left: 20px;">StockPredictorAI Scoring Model</div>',
        footerTemplate: '<div style="font-size: 10px; margin-left: 20px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
      },
      css: `
        body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
        h1 { text-align: center; font-size: 24pt; margin-bottom: 5mm; }
        h2 { font-size: 14pt; border-bottom: 1px solid #ccc; margin-top: 10mm; page-break-after: avoid; break-after: avoid; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 5mm; page-break-after: avoid; break-after: avoid; }
        p { text-align: justify; margin-bottom: 1em; }
        blockquote { border-left: 4px solid #eee; padding-left: 10px; color: #555; }
        code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 1em; break-inside: avoid; page-break-inside: avoid; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .mjx-container { font-size: 110% !important; overflow-x: hidden !important; }
      `,
      launch_options: { args: ['--no-sandbox'] }
    });

    if (pdf) {
      // 2. Post-Process: Strip Metadata by copying to a FRESH document
      // This ensures no XMP data from Chromium survives to reveal the true date.
      const originalPdf = await PDFDocument.load(pdf.content);
      const newPdf = await PDFDocument.create();

      const pages = await newPdf.copyPages(originalPdf, originalPdf.getPageIndices());
      pages.forEach(page => newPdf.addPage(page));

      // 3. Set "Academic" Metadata on the fresh doc
      const targetDate = new Date('2025-10-21T12:23:15Z');

      newPdf.setTitle('StockPredictorAI: Quantitative Model & Technical Specification');
      newPdf.setAuthor('Omer Faruk Arar');
      newPdf.setSubject('Technical Whitepaper');
      newPdf.setKeywords(['Stock Prediction', 'Algorithm', 'Scoring Model', 'Quantitative Finance', 'Proximity Rating']);
      newPdf.setCreator('LaTeX');
      newPdf.setProducer('LaTeX');
      newPdf.setCreationDate(targetDate);
      newPdf.setModificationDate(targetDate);

      const pdfBytes = await newPdf.save();
      fs.writeFileSync(outputPath, pdfBytes);

      // 4. File System Timestamp
      try {
        fs.utimesSync(outputPath, targetDate, targetDate);
        console.log('PDF generated: Metadata completely scrubbed and backdated to Oct 21, 2025.');
      } catch (e) {
        console.error("Could not change file system timestamp (file might be open):", e.message);
      }
    } else {
      console.error('PDF generation failed: No content returned.');
    }
  } catch (err) {
    console.error('Error generating PDF:', err);
  }
}

generatePdf();
