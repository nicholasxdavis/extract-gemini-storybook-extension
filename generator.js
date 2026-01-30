window.addEventListener('load', () => {
    chrome.storage.local.get('bookDataForGenerator', async ({ bookDataForGenerator }) => {
        const statusElement = document.getElementById('status');

        if (bookDataForGenerator) {
            try {
                // --- MODIFIED: Show icon on download start ---
                statusElement.innerHTML = `
            <div class="generator-main">
                <img src="${chrome.runtime.getURL("icons/icon.png")}" class="success-icon" alt="Logo">
                <h1>Generating PDF...</h1>
                <p>Fetching images and fonts. This may take a moment.</p>
            </div>`;

                const pdfBytes = await createPdf(bookDataForGenerator);
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                const filename = bookDataForGenerator.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
                link.download = filename;
                link.click();

                URL.revokeObjectURL(link.href);

                // --- UPDATED SUCCESS MESSAGE WITH NEW LAYOUT AND ICON ---
                statusElement.innerHTML = `
            <div class="generator-main">
                <img src="${chrome.runtime.getURL("icons/icon.png")}" class="success-icon" alt="Download Icon">
                <h1>Download Complete!</h1>
                <p>Your PDF is ready.</p>
            </div>
            <div class="generator-footer">
                <div class="footer-actions">
                    <a href="https://buymeacoffee.com/galore" target="_blank" rel="noopener noreferrer" class="support-button">
                        Support us 
                        <svg class="heart-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>
                        </svg>
                    </a>
                </div>
                <div class="footer-links">
                    <a href="https://github.com/nicholasxdavis/extract-gemini-storybook-extension-/issues/new" target="_blank" rel="noopener noreferrer" class="report-link">Report Issues</a>
                </div>
            </div>
        `;
                // Add a class to the container to trigger new styles (if needed, mostly standardized now)
                statusElement.classList.add('success');

            } catch (err) {
                console.error("PDF generation failed:", err);
                statusElement.innerHTML = `
                    <div class="generator-main">
                        <h1>Error</h1>
                        <p>Could not generate PDF. ${err.message}</p>
                        <p>Please check the console for details.</p>
                    </div>
                    <div class="generator-footer">
                        <div class="footer-links">
                            <a href="https://github.com/nicholasxdavis/extract-gemini-storybook-extension-/issues/new" target="_blank" rel="noopener noreferrer" class="report-link">Report Issues</a>
                        </div>
                    </div>`;
            } finally {
                chrome.storage.local.remove('bookDataForGenerator');
            }
        } else {
            statusElement.innerHTML = `
                <div class="generator-main">
                    <h1>Error</h1>
                    <p>Could not find storybook data. Please go back and try extracting again.</p>
                </div>
                <div class="generator-footer">
                    <div class="footer-links">
                        <a href="https://github.com/nicholasxdavis/extract-gemini-storybook-extension-/issues/new" target="_blank" rel="noopener noreferrer" class="report-link">Report Issues</a>
                    </div>
                </div>`;
        }
    });
});

async function createPdf(bookData) {
    const { PDFDocument, rgb, PageSizes } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const poppinsRegularBytes = await fetch(chrome.runtime.getURL('fonts/poppins-latin-400-normal.ttf')).then(res => res.arrayBuffer());
    const poppinsBoldBytes = await fetch(chrome.runtime.getURL('fonts/poppins-latin-500-normal.ttf')).then(res => res.arrayBuffer());
    const poppinsRegular = await pdfDoc.embedFont(poppinsRegularBytes);

    const poppinsBold = await pdfDoc.embedFont(poppinsBoldBytes);

    // Initialize Watermark Engine
    const watermarkEngine = new WatermarkEngine();
    await watermarkEngine.loadBackgroundImages();

    const [pageWidth, pageHeight] = PageSizes.Letter;
    const margin = 72;

    const replaceWithNormalSize = (src) => {
        return src.replace(/=s\d+(?=[-?#]|$)/, '=s0');
    };

    const fetchAndEmbedImage = async (url) => {
        // Use high-resolution image for better watermark detection
        const highResUrl = replaceWithNormalSize(url);
        const response = await chrome.runtime.sendMessage({ type: 'fetchImage', url: highResUrl });
        if (!response || !response.success) throw new Error(`Failed to fetch image: ${highResUrl}`);
        const dataUrl = response.dataUrl;

        // Check user preference for watermark removal
        const shouldRemoveWatermark = bookData.removeWatermark !== false; // Default to true if undefined

        if (shouldRemoveWatermark) {
            // Process image to remove watermark
            // 1. Create Image object from dataUrl
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = dataUrl;
            });

            // 2. Remove watermark
            const processedCanvas = await watermarkEngine.removeWatermarkFromImage(img);

            // 3. Convert back to blob/buffer
            const processedBlob = await new Promise(resolve => processedCanvas.toBlob(resolve, 'image/png'));
            const imageBytes = await processedBlob.arrayBuffer();

            return await pdfDoc.embedPng(imageBytes);
        } else {
             // Do NOT remove watermark - use original image
             const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
             if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
                 return await pdfDoc.embedJpg(imageBytes);
             }
             return await pdfDoc.embedPng(imageBytes);
        }
    };
    
    if (bookData.imageUrls.length > 0) {
        const coverImage = await fetchAndEmbedImage(bookData.imageUrls[0]);
        const coverPage = pdfDoc.addPage(PageSizes.Letter);
        const { width, height } = coverPage.getSize();
        coverPage.drawImage(coverImage, { x: 0, y: 0, width, height });
    }

    pdfDoc.addPage(PageSizes.Letter);
    const titlePage = pdfDoc.addPage(PageSizes.Letter);
    drawText(bookData.title, { page: titlePage, font: poppinsBold, size: 48, y: pageHeight / 2 + 50, color: rgb(0, 0, 0), maxWidth: pageWidth - (margin * 2) });
    drawText(bookData.author, { page: titlePage, font: poppinsRegular, size: 24, y: pageHeight / 2 - 20, color: rgb(0.2, 0.2, 0.2), maxWidth: pageWidth - (margin * 2) });
    
    for (let i = 1; i < bookData.imageUrls.length; i++) {
        const textIndex = i - 1;

        const illustrationImage = await fetchAndEmbedImage(bookData.imageUrls[i]);
        const illustrationPage = pdfDoc.addPage(PageSizes.Letter);
        const { width, height } = illustrationPage.getSize();
        illustrationPage.drawImage(illustrationImage, { x: 0, y: 0, width, height });
        
        if (textIndex < bookData.textContents.length) {
            const textPage = pdfDoc.addPage(PageSizes.Letter);
            drawText(bookData.textContents[textIndex], {
                page: textPage,
                font: poppinsRegular,
                size: 21,
                y: pageHeight / 2,
                color: rgb(0, 0, 0),
                lineHeight: 36,
                maxWidth: pageWidth - (margin * 2)
            });
            const pageNumStr = String(i);
            const numWidth = poppinsRegular.widthOfTextAtSize(pageNumStr, 12);
            textPage.drawText(pageNumStr, {
                x: pageWidth - margin - numWidth,
                y: margin - 20,
                font: poppinsRegular,
                size: 12,
                color: rgb(0.4, 0.4, 0.4)
            });
        }
    }

    return await pdfDoc.save();
}

function drawText(text, options) {
    const { page, font, size, color, y, lineHeight, maxWidth } = options;
    const { width: pageWidth } = page.getSize();
    const lines = wrapText(text, font, size, maxWidth);
    const totalTextHeight = lines.length * (lineHeight || size);
    let currentY = y + (totalTextHeight / 2) - size;
    lines.forEach(line => {
        const textWidth = font.widthOfTextAtSize(line, size);
        page.drawText(line, {
            x: (pageWidth - textWidth) / 2, y: currentY, font, size, color, lineHeight
        });
        currentY -= (lineHeight || size);
    });
}

function wrapText(text, font, size, maxWidth) {
    if (!text) return [''];
    if (!maxWidth) return text.split('\n');
    const words = text.replace(/\n/g, ' \n ').split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
        if (word === '\n') {
            lines.push(line);
            line = '';
            continue;
        }
        const testLine = line + (line ? ' ' : '') + word;
        const width = font.widthOfTextAtSize(testLine, size);
        if (width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    return lines;
}