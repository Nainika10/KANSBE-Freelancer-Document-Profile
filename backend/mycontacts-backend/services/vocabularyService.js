/**
 * Vocabulary & Vectorization Service
 * Manages shared corpus tokenization, term-to-ID mapping, and sparse TF-IDF vector generation.
 */

const { skillMap } = require("../config/skillRelationships");

// Standard English stopwords to filter out of text fields
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
  "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", 
  "but", "by", "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", 
  "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", 
  "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", 
  "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", 
  "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", 
  "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", 
  "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", 
  "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", 
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", 
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", 
  "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", 
  "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where", "where's", 
  "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", 
  "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

// In-memory vocabulary lookup: maps normalized term string -> numeric term ID
const termToId = new Map();
const idToTerm = new Map();
let nextTermId = 1;

/**
 * Registers a term in the shared dictionary if not already present.
 */
function registerTerm(term) {
  if (!term || typeof term !== "string") return null;
  const clean = term.toLowerCase().trim();
  if (!clean || STOPWORDS.has(clean) || clean.length < 2) return null;

  if (termToId.has(clean)) {
    return termToId.get(clean);
  }

  const id = nextTermId++;
  termToId.set(clean, id);
  idToTerm.set(id, clean);
  return id;
}

// ── Initialize Seed Vocabulary from Skill Map ──────────────────────
(function initializeSeedVocabulary() {
  // Pre-register all known skills and their related terms
  Object.keys(skillMap).forEach(skill => {
    registerTerm(skill);
    skillMap[skill].forEach(related => registerTerm(related));
  });

  // Pre-register common job titles and industry terms
  const commonDomainTerms = [
    "developer", "engineer", "designer", "architect", "lead", "senior", "junior", "full stack", 
    "frontend", "backend", "devops", "cloud", "database", "mobile", "api", "rest", "graphql", 
    "microservices", "testing", "agile", "scrum", "ui", "ux", "responsive", "security"
  ];
  commonDomainTerms.forEach(term => registerTerm(term));
})();

/**
 * Tokenizes text while preserving multi-word and technical terms
 * (e.g. "node.js", "next.js", "c#", "c++", "ci/cd", "rest api").
 */
function tokenize(text) {
  if (!text || typeof text !== "string") return [];

  const normalized = text.toLowerCase();
  const tokens = [];

  // 1. First, check for any known multi-word skill phrases (e.g. "full stack", "machine learning")
  let processed = normalized;
  for (const knownTerm of termToId.keys()) {
    if (knownTerm.includes(" ") || knownTerm.includes(".") || knownTerm.includes("#") || knownTerm.includes("+") || knownTerm.includes("/")) {
      if (processed.includes(knownTerm)) {
        tokens.push(knownTerm);
        // Replace matched phrase with spaces so individual words don't get re-added
        processed = processed.split(knownTerm).join(" ");
      }
    }
  }

  // 2. Tokenize remaining words by splitting on punctuation and whitespace
  const rawWords = processed
    .replace(/[^a-z0-9+#.-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of rawWords) {
    const clean = word.replace(/^[.-]+|[.-]+$/g, ""); // strip leading/trailing dots/hyphens
    if (clean.length >= 2 && !STOPWORDS.has(clean)) {
      tokens.push(clean);
    }
  }

  return tokens;
}

/**
 * Builds a sparse TF-IDF vector and exact L2 Euclidean magnitude for a given text.
 * 
 * Returns:
 * {
 *   vector: { "42": 0.45, "105": 0.38, ... },
 *   vector_magnitude: 0.89
 * }
 */
function vectorize(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { vector: {}, vector_magnitude: 0 };
  }

  // Count term frequencies
  const tfCounts = new Map();
  for (const token of tokens) {
    const termId = registerTerm(token);
    if (termId !== null) {
      tfCounts.set(termId, (tfCounts.get(termId) || 0) + 1);
    }
  }

  if (tfCounts.size === 0) {
    return { vector: {}, vector_magnitude: 0 };
  }

  // Compute sub-linear term frequency: TF = 1 + ln(count)
  // And compute vector sum of squares for exact L2 Euclidean norm
  const vector = {};
  let sumOfSquares = 0;

  for (const [termId, count] of tfCounts.entries()) {
    // Sub-linear TF formula prevents a single repeated word from dominating the vector
    const tf = 1 + Math.log(count);
    
    // Smooth calibrated IDF approximation: technical terms have high base IDF weight
    const termStr = idToTerm.get(termId) || "";
    const isKnownTechSkill = skillMap[termStr] !== undefined;
    const idf = isKnownTechSkill ? 1.8 : 1.2;

    const weight = Number((tf * idf).toFixed(4));
    vector[String(termId)] = weight;
    sumOfSquares += weight * weight;
  }

  const vector_magnitude = Number(Math.sqrt(sumOfSquares).toFixed(4));

  return {
    vector,
    vector_magnitude
  };
}

/**
 * Computes cosine similarity between two sparse vector maps in O(shared_terms) time.
 * cos(A, B) = (A . B) / (||A|| * ||B||)
 */
function computeCosineSimilarity(vecA, magA, vecB, magB) {
  if (!vecA || !vecB || !magA || !magB || magA === 0 || magB === 0) {
    return 0.0;
  }

  // Handle Mongoose Map instances or plain JavaScript objects
  const objA = vecA instanceof Map ? Object.fromEntries(vecA) : vecA;
  const objB = vecB instanceof Map ? Object.fromEntries(vecB) : vecB;

  // Iterate over whichever vector is smaller to minimize operations
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  const [smaller, larger] = keysA.length <= keysB.length ? [objA, objB] : [objB, objA];

  let dotProduct = 0;
  for (const termId of Object.keys(smaller)) {
    if (larger[termId] !== undefined) {
      dotProduct += smaller[termId] * larger[termId];
    }
  }

  if (dotProduct === 0) return 0.0;

  const similarity = dotProduct / (magA * magB);
  // Guarantee strict [0.0, 1.0] boundary
  return Number(Math.max(0.0, Math.min(1.0, similarity)).toFixed(4));
}

module.exports = {
  tokenize,
  registerTerm,
  vectorize,
  computeCosineSimilarity,
  termToId,
  idToTerm
};
