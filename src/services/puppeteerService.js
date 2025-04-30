const puppeteer = require('puppeteer');
const { uploadToS3 } = require('./s3Service');
const logger = require('../config/logger');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const extractLinks = async (url, retries = 2) => {
  let browser;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        return anchors
          .map((anchor) => anchor.href)
          .filter((href) => href.startsWith(window.location.origin));
      });
      logger.info(`Extracted ${links.length} links from ${url}`);
      await browser.close();
      return [...new Set(links)];
    } catch (error) {
      logger.error(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      if (attempt === retries) {
        throw new Error(`Failed to extract links from ${url} after ${retries} attempts: ${error.message}`);
      }
    } finally {
      if (browser) await browser.close();
    }
  }
};

const extractInspirationDetails = async (url, retries = 2) => {
  let browser;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      browser = await puppeteer.launch({ headless: true, args: ['--disable-javascript'] });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

      // Desktop screenshot
      await page.setViewport({ width: 1920, height: 1080 });
      const desktopScreenshot = await page.screenshot();
      const desktopScreenshotUrl = await uploadToS3(
        desktopScreenshot,
        `screenshots/desktop-${Date.now()}.png`
      );

      // Mobile screenshot
      await page.setViewport({ width: 375, height: 667 });
      const mobileScreenshot = await page.screenshot();
      const mobileScreenshotUrl = await uploadToS3(
        mobileScreenshot,
        `screenshots/mobile-${Date.now()}.png`
      );

      // Extract details
      const details = await page.evaluate(() => {
        const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
        const paragraphText = document.querySelector('p')?.innerText?.trim() ||
          document.querySelector('h1, h2')?.innerText?.trim() || '';
        let description = metaDescription.trim().replace(/\s+/g, ' ');
        if (!description && paragraphText) {
          description = paragraphText.replace(/\s+/g, ' ').substring(0, 300);
        }

        // Normalize and deduplicate fonts
        const fonts = Array.from(document.querySelectorAll('style'))
          .map((el) => {
            const match = el.innerText?.match(/font-family:([^;]+)/);
            if (match) {
              let font = match[1].trim().replace(/['"]/g, '').replace(/!important/g, '').trim();
              if (font.includes('Source Sans Pro Topnav')) {
                font = 'Source Sans Pro, sans-serif';
              }
              return font;
            }
            return null;
          })
          .filter(Boolean);

        // Technology detection
        const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src.toLowerCase());
        const technologies = [];
        if (document.querySelector('html').innerHTML.includes('html')) technologies.push('HTML');
        if (document.querySelector('html').innerHTML.includes('css')) technologies.push('CSS');
        if (scripts.some(s => s.includes('javascript') || s.includes('js'))) technologies.push('JavaScript');
        if (scripts.some(s => s.includes('jquery'))) technologies.push('jQuery');

        // Category and niche detection
        const keywords = (document.querySelector('meta[name="keywords"]')?.content || document.title || '').toLowerCase();
        const categories = ['Landing Page'];
        if (keywords.includes('tutorial') || keywords.includes('learn')) categories.push('Educational');
        if (keywords.includes('blog')) categories.push('Blog');
        if (keywords.includes('ecommerce') || keywords.includes('shop')) categories.push('E-commerce');

        const niche = keywords.includes('tutorial') || keywords.includes('learn') ? 'Web Development Education' :
                      keywords.includes('blog') ? 'Blogging' :
                      keywords.includes('ecommerce') || keywords.includes('shop') ? 'E-commerce' : 'Unknown';

        // Color scheme from multiple elements
        const elements = ['body', 'header', 'main', 'section', 'div'];
        let colorScheme = '';
        for (const el of elements) {
          const element = document.querySelector(el);
          if (element) {
            const color = getComputedStyle(element).backgroundColor;
            if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
              colorScheme = color;
              break;
            }
          }
        }
        if (!colorScheme) {
          colorScheme = '#ffffff';
        }

        return {
          title: document.title || 'Untitled',
          description: description,
          colorScheme,
          fonts: [...new Set(fonts)],
          technologyStack: technologies.length > 0 ? technologies : ['Unknown'],
          categories: categories,
          niche: niche,
        };
      });

      if (!details.description) {
        logger.warn(`No valid description found for ${url}, using default`);
        details.description = 'No description available';
      }

      // Normalize URL and generate unique slug
      const normalizedUrl = url.replace(/\/+$/, '').toLowerCase();
      let baseSlug = normalizedUrl
        .replace(/^https?:\/\//, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      let slug = baseSlug;
      let counter = 1;

      // Check for existing slugs
      while (await prisma.inspiration.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      logger.info(`Extracted details for ${url}: description="${details.description}", fonts=${JSON.stringify(details.fonts)}, technologies=${JSON.stringify(details.technologyStack)}, categories=${JSON.stringify(details.categories)}, niche=${details.niche}, slug=${slug}`);
      await browser.close();
      return {
        ...details,
        websiteLink: url,
        desktopScreenshotUrl,
        mobileScreenshotUrl,
        slug,
      };
    } catch (error) {
      logger.error(`Attempt ${attempt} failed for ${url}: ${error.message}`);
      if (attempt === retries) {
        logger.warn(`Skipping ${url} after ${retries} attempts`);
        return null;
      }
    } finally {
      if (browser) await browser.close();
    }
  }
};

module.exports = { extractLinks, extractInspirationDetails };