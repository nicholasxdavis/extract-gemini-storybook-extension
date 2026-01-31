<div align="center">

<img src="https://github.com/nicholasxdavis/extract-gemini-storybook-extension-/blob/main/icons/icon.png?raw=true" alt="Storybook Extractor Logo" width="128" />

# Storybook Extractor

**Turn Gemini-generated stories into print-ready PDFs instantly.**

[![Manifest](https://img.shields.io/badge/Manifest-V3-blue)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Output](https://img.shields.io/badge/Output-KDP%20Ready-orange)](https://kdp.amazon.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](https://opensource.org/licenses/MIT)

</div>

<br />

## About

**Storybook Extractor** is a Chrome extension designed to automate the conversion of Google Gemini storybooks into professional, printable PDF documents.

It intelligently extracts high-resolution imagery and text, removes watermarks automatically using reverse-alpha blending, and reformats the content into a clean, paginated layout suitable for e-books or physical printing (KDP).

## Features

* **AI Watermark Removal:** Automatically detects and removes Gemini watermarks from illustrations.
* **Print-Ready PDFs:** Generates standard Letter-sized PDFs with proper margins.
* **Smart Formatting:** Automatically builds a Cover Page, Title Page, and alternating Illustration/Text pages.
* **Client-Side Only:** No servers and no uploads. All processing happens locally in the browser for privacy.
* **Typography:** Embeds the Poppins font family for a modern reading experience.

## Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/nicholasxdavis/extract-gemini-storybook-extension-.git](https://github.com/nicholasxdavis/extract-gemini-storybook-extension-.git)
    ```
2.  Open Chrome and navigate to `chrome://extensions/`
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the folder where you cloned or downloaded this repository.

## Usage

1.  Navigate to any shared Gemini storybook link (e.g., `https://gemini.google.com/share/...`).
2.  Click the **Storybook Extractor** icon in your Chrome toolbar.
3.  The extension will fetch high-resolution images, clean them, and compile the book.
4.  The PDF will download automatically once processing is complete.

   ## Credits

This project builds upon the research and logic provided by the open-source community:

* **[GeminiWatermarkTool](https://github.com/allenk/GeminiWatermarkTool)** by [Allen K](https://github.com/allenk) - Special thanks for the original logic on watermark detection and reverse alpha blending.


## License

Distributed under the MIT License. See `LICENSE` for more information.
