/**
 * NewsService — Fetches, scores, and caches technology news.
 *
 * Instead of returning raw RSS/API data, every article is run through
 * a keyword relevance scorer. Only articles that pass a minimum score
 * threshold are returned to the frontend. Results are cached for 15 min.
 */

const axios = require('axios');
const cacheService = require('./cacheService');

// ─── Relevance Keywords (case‑insensitive) ─────────────────────────
const RELEVANCE_KEYWORDS = [
  // Core platform themes
  { word: 'freelance',     score: 5 },
  { word: 'freelancer',    score: 5 },
  { word: 'freelancing',   score: 5 },
  { word: 'remote work',   score: 4 },
  { word: 'remote',        score: 2 },
  { word: 'gig economy',   score: 5 },
  { word: 'gig',           score: 2 },

  // Technology
  { word: 'artificial intelligence', score: 4 },
  { word: 'ai',            score: 3 },
  { word: 'machine learning', score: 3 },
  { word: 'technology',    score: 2 },
  { word: 'software',      score: 2 },
  { word: 'developer',     score: 3 },
  { word: 'programming',   score: 3 },
  { word: 'cloud',         score: 2 },
  { word: 'startup',       score: 3 },
  { word: 'saas',          score: 3 },

  // Career / Work
  { word: 'career',        score: 3 },
  { word: 'hiring',        score: 3 },
  { word: 'job',           score: 2 },
  { word: 'productivity',  score: 2 },
  { word: 'entrepreneur',  score: 3 },
  { word: 'business',      score: 1 },

  // Design & Creative
  { word: 'design',        score: 2 },
  { word: 'ui/ux',         score: 3 },
  { word: 'creative',      score: 2 },

  // Web & Mobile
  { word: 'web development', score: 3 },
  { word: 'app development', score: 3 },
  { word: 'javascript',    score: 2 },
  { word: 'react',         score: 2 },
  { word: 'angular',       score: 2 },
  { word: 'node',          score: 2 },
  { word: 'python',        score: 2 },
];

const MIN_RELEVANCE_SCORE = 3;   // Articles scoring below this are filtered out
const MAX_ARTICLES        = 6;   // Max articles to return

// ─── Scoring ───────────────────────────────────────────────────────

/**
 * Score a single article against the relevance keyword list.
 */
function scoreArticle(article) {
  const text = [
    article.title || '',
    article.description || '',
    ...(article.category || []),
  ].join(' ').toLowerCase();

  let totalScore = 0;
  for (const kw of RELEVANCE_KEYWORDS) {
    if (text.includes(kw.word.toLowerCase())) {
      totalScore += kw.score;
    }
  }
  return totalScore;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Fetch the latest news, apply relevance filtering, and cache.
 *
 * @returns {Promise<Array>} Filtered and scored articles
 */
async function getFilteredNews() {
  // 1️⃣ Check cache first
  const cacheKey = cacheService.keys.news();
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  // 2️⃣ Fetch from Currents API
  try {
    const response = await axios.get(
      'https://api.currentsapi.services/v1/latest-news',
      {
        params: {
          apiKey: process.env.CURRENTS_API_KEY,
          language: 'en',
          category: 'technology',
        },
        timeout: 8000,
      }
    );

    const rawArticles = response.data?.news || [];

    // 3️⃣ Score and filter
    const scoredArticles = rawArticles
      .map(article => ({
        ...article,
        _relevanceScore: scoreArticle(article),
      }))
      .filter(article => article._relevanceScore >= MIN_RELEVANCE_SCORE)
      .sort((a, b) => b._relevanceScore - a._relevanceScore)
      .slice(0, MAX_ARTICLES);

    // 4️⃣ Strip internal score before caching / returning
    const cleanArticles = scoredArticles.map(({ _relevanceScore, ...rest }) => rest);

    // 5️⃣ Cache for 15 minutes
    cacheService.set(cacheKey, cleanArticles, cacheService.TTL.NEWS);

    return cleanArticles;

  } catch (error) {
    console.error('NewsService fetch error:', error.message);
    // Return empty array on failure — frontend has its own fallback
    return [];
  }
}

module.exports = {
  getFilteredNews,
  scoreArticle,  // exported for testing
};
