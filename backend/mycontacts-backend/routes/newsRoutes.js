const express = require('express');
const router = express.Router();
const { getFilteredNews } = require('../services/newsService');

/**
 * @swagger
 * /api/news/latest:
 *   get:
 *     tags: [News]
 *     summary: Get latest filtered technology news
 *     description: Returns relevance-scored and cached technology news articles. Results are cached for 15 minutes.
 *     responses:
 *       200:
 *         description: Filtered news articles
 *       500:
 *         description: Could not fetch news
 */
router.get('/latest', async (req, res) => {
    try {
        const articles = await getFilteredNews();
        res.json({ news: articles });
    } catch (error) {
        console.error('News route error:', error.message);
        res.status(500).json({ message: 'Could not fetch news' });
    }
});

module.exports = router;