/**
 * Curated Skill Relationship & Synonym Ontology Map
 * Maps a technical skill to its related skills, frameworks, or runtime environments.
 * Used for zero-AI semantic expansion during hybrid matching.
 */

const skillMap = {
  // ── Frontend Ecosystem ──────────────────────────────────────────
  "angular": ["typescript", "rxjs", "javascript", "html", "css", "frontend", "web development"],
  "react": ["javascript", "next.js", "redux", "typescript", "frontend", "web development", "react.js"],
  "react.js": ["react", "javascript", "next.js", "redux", "typescript", "frontend"],
  "vue": ["javascript", "vuex", "nuxt.js", "frontend", "pinia", "vue.js"],
  "vue.js": ["vue", "javascript", "vuex", "nuxt.js", "frontend"],
  "next.js": ["react", "javascript", "typescript", "ssr", "frontend", "full stack"],
  "nuxt.js": ["vue", "javascript", "typescript", "ssr", "frontend"],
  "typescript": ["javascript", "angular", "react", "node.js", "frontend", "backend"],
  "javascript": ["typescript", "frontend", "backend", "node.js", "react", "angular", "vue"],
  "html": ["css", "javascript", "frontend", "web development"],
  "css": ["html", "tailwind", "bootstrap", "sass", "scss", "frontend"],
  "tailwind": ["css", "html", "frontend"],
  "bootstrap": ["css", "html", "frontend"],

  // ── Backend & APIs ──────────────────────────────────────────────
  "node.js": ["javascript", "express", "backend", "rest api", "mongodb", "nestjs"],
  "express": ["node.js", "rest api", "javascript", "backend"],
  "nestjs": ["node.js", "typescript", "backend", "rest api"],
  "python": ["django", "fastapi", "flask", "backend", "data science", "machine learning"],
  "fastapi": ["python", "rest api", "backend", "pydantic"],
  "django": ["python", "backend", "sql", "rest api"],
  "flask": ["python", "backend", "rest api"],
  "java": ["spring", "spring boot", "backend", "hibernate", "sql"],
  "spring boot": ["java", "spring", "backend", "microservices", "rest api"],
  "c#": [".net", "asp.net", "backend", "sql"],
  ".net": ["c#", "asp.net", "backend", "sql"],
  "php": ["laravel", "wordpress", "backend", "mysql"],
  "laravel": ["php", "backend", "mysql", "rest api"],
  "golang": ["go", "backend", "microservices", "docker"],
  "go": ["golang", "backend", "microservices", "docker"],

  // ── Databases & Caching ─────────────────────────────────────────
  "mongodb": ["nosql", "database", "mongoose", "backend"],
  "mongoose": ["mongodb", "node.js", "nosql", "backend"],
  "postgresql": ["sql", "relational database", "postgres", "backend", "database"],
  "postgres": ["postgresql", "sql", "backend", "database"],
  "mysql": ["sql", "relational database", "backend", "database"],
  "sql": ["mysql", "postgresql", "oracle", "database", "relational database"],
  "redis": ["caching", "in-memory database", "backend", "nosql"],
  "cassandra": ["nosql", "database", "distributed systems"],

  // ── Cloud, DevOps & Containers ─────────────────────────────────
  "aws": ["cloud", "s3", "ec2", "lambda", "devops", "docker"],
  "azure": ["cloud", "devops", "docker", "kubernetes"],
  "gcp": ["google cloud", "cloud", "devops", "docker", "kubernetes"],
  "google cloud": ["gcp", "cloud", "devops"],
  "docker": ["devops", "containerization", "kubernetes", "ci/cd"],
  "kubernetes": ["docker", "containerization", "devops", "cloud", "k8s"],
  "k8s": ["kubernetes", "docker", "devops"],
  "ci/cd": ["devops", "github actions", "jenkins", "docker"],
  "jenkins": ["ci/cd", "devops", "automation"],
  "github actions": ["ci/cd", "devops", "git"],

  // ── Mobile Development ──────────────────────────────────────────
  "flutter": ["dart", "mobile app", "cross-platform", "ios", "android"],
  "dart": ["flutter", "mobile app"],
  "react native": ["react", "javascript", "typescript", "mobile app", "cross-platform"],
  "ios": ["swift", "mobile app", "objective-c"],
  "swift": ["ios", "mobile app"],
  "android": ["kotlin", "java", "mobile app"],
  "kotlin": ["android", "java", "mobile app"],

  // ── AI, Data & Machine Learning ─────────────────────────────────
  "machine learning": ["python", "ai", "data science", "tensorflow", "pytorch", "pandas"],
  "deep learning": ["machine learning", "pytorch", "tensorflow", "ai", "neural networks"],
  "data science": ["python", "pandas", "numpy", "sql", "machine learning"],
  "pytorch": ["python", "deep learning", "machine learning"],
  "tensorflow": ["python", "deep learning", "machine learning"],
  "nlp": ["python", "machine learning", "ai", "transformers"]
};

/**
 * Checks whether skill B is a known related skill for skill A.
 * Returns true if mapped in either direction.
 */
function areSkillsRelated(skillA, skillB) {
  if (!skillA || !skillB) return false;
  const a = skillA.toLowerCase().trim();
  const b = skillB.toLowerCase().trim();
  if (a === b) return true;

  const relatedToA = skillMap[a] || [];
  if (relatedToA.includes(b)) return true;

  const relatedToB = skillMap[b] || [];
  if (relatedToB.includes(a)) return true;

  return false;
}

/**
 * Returns the list of related skills for a given skill.
 */
function getRelatedSkills(skill) {
  if (!skill) return [];
  const s = skill.toLowerCase().trim();
  return skillMap[s] || [];
}

module.exports = {
  skillMap,
  areSkillsRelated,
  getRelatedSkills
};
