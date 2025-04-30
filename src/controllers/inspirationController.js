const { PrismaClient } = require('@prisma/client');
const { extractLinks, extractInspirationDetails } = require('../services/puppeteerService');
const redis = require('redis');
const logger = require('../config/logger');

const prisma = new PrismaClient();
const redisClient = redis.createClient({ url: process.env.REDIS_URL });
redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
redisClient.connect().catch((err) => logger.error(`Redis connection error: ${err.message}`));

const extractLinksHandler = async (req, res) => {
  try {
    const { url } = req.body;
    logger.info(`Extracting links for URL: ${url}`);
    const links = await extractLinks(url);
    res.json({ links });
  } catch (error) {
    logger.error(`Extract links error: ${error.message}`);
    res.status(500).json({ error: `Failed to extract links: ${error.message}` });
  }
};

const addInspirations = async (req, res) => {
  try {
    const { urls } = req.body;
    logger.info(`Processing inspirations for URLs: ${urls.join(', ')}`);
    const inspirations = await Promise.all(
      urls.map(async (url) => {
        try {
          logger.info(`Extracting details for ${url}`);
          const details = await extractInspirationDetails(url);
          if (!details) {
            logger.warn(`Skipping ${url}: Failed to extract details`);
            return null;
          }
          if (!details.description) {
            logger.warn(`Description for ${url} is empty, setting default`);
            details.description = 'No description available';
          }
          if (details.description.length > 300) {
            logger.warn(`Description for ${url} exceeds 300 characters, truncating`);
            details.description = details.description.substring(0, 300);
          }
          if (details.title.length > 100) {
            logger.warn(`Title for ${url} exceeds 100 characters, truncating`);
            details.title = details.title.substring(0, 100);
          }
          logger.info(`Saving inspiration for ${url}: description="${details.description}", title="${details.title}", fonts=${JSON.stringify(details.fonts)}, technologies=${JSON.stringify(details.technologyStack)}, categories=${JSON.stringify(details.categories)}, niche=${details.niche}, slug=${details.slug}`);
          const inspiration = await prisma.inspiration.create({
            data: {
              ...details,
              metaTitle: details.title,
              metaDescription: details.description,
            },
          });
          logger.info(`Created inspiration for ${url}, slug: ${inspiration.slug}`);
          return inspiration;
        } catch (error) {
          logger.error(`Failed to process ${url}: ${error.message}`);
          return null;
        }
      })
    );
    const validInspirations = inspirations.filter((i) => i !== null);
    const failedUrls = urls.filter((url, i) => !inspirations[i]);
    if (validInspirations.length === 0) {
      logger.warn('No inspirations added');
      return res.status(500).json({ error: 'Failed to add any inspirations', failed: failedUrls });
    }
    logger.info(`Added ${validInspirations.length} inspirations`);
    res.json({
      inspirations: validInspirations.map((i) => i.slug),
      failed: failedUrls,
    });
  } catch (error) {
    logger.error(`Add inspirations error: ${error.message}`);
    res.status(500).json({ error: `Failed to add inspirations: ${error.message}` });
  }
};

const getInspirations = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const inspirations = await prisma.inspiration.findMany({
      skip,
      take: limit,
    });
    const total = await prisma.inspiration.count();
    res.json({
      inspirations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(`Get inspirations error: ${error.message}`);
    res.status(500).json({ error: `Failed to retrieve inspirations: ${error.message}` });
  }
};

const getInspirationBySlug = async (req, res) => {
  const { slug } = req.params;
  const cacheKey = `inspiration:${slug}`;

  try {
    // Increment pageViews first
    const inspiration = await prisma.inspiration.findUnique({
      where: { slug },
    });
    if (!inspiration) {
      return res.status(404).json({ error: 'Inspiration not found' });
    }

    await prisma.inspiration.update({
      where: { slug },
      data: { pageViews: { increment: 1 } },
    });

    // Check cache
    const connected = redisClient.isOpen;
    if (connected) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.info(`Cache hit for slug: ${slug}`);
        // Update cache with incremented pageViews
        const updatedInspiration = { ...inspiration, pageViews: inspiration.pageViews + 1 };
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(updatedInspiration));
        return res.json(updatedInspiration);
      }
    }

    // Cache miss: Fetch updated data and cache it
    const updatedInspiration = { ...inspiration, pageViews: inspiration.pageViews + 1 };
    if (connected) {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(updatedInspiration));
    }
    res.json(updatedInspiration);
  } catch (error) {
    logger.error(`Get inspiration error: ${error.message}`);
    res.status(500).json({ error: `Failed to retrieve inspiration: ${error.message}` });
  }
};

module.exports = {
  extractLinksHandler,
  addInspirations,
  getInspirations,
  getInspirationBySlug,
};