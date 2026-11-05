module.exports = {
  // Linear combination weights for hybrid scoring (must sum to 1.0)
  weights: {
    exactSkills: 0.45,
    relatedSkills: 0.15,
    textSimilarity: 0.30,
    experience: 0.10
  },

  // Number of candidate matches to return per required freelancer
  // E.g., if freelancersNeeded = 2, return 2 * 5 = 10 candidates
  candidateMultiplier: 5,

  // Default partial credit assigned for mapped related skills (0.0 to 1.0)
  defaultRelatedSkillWeight: 0.60,

  // Field repetition boosts for building the compiled searchable text
  boosts: {
    skills: 3,       // Repeat skills 3x to ensure high Term Frequency (TF)
    skillTitle: 2,   // Repeat title 2x
    certifications: 1,
    description: 1
  },

  // Fallback defaults
  defaults: {
    requiredExperienceYears: 1,
    minCandidatesToReturn: 5
  }
};
