/**
 * Freelancer Match Service
 * Handles internal vector synchronization, compound pre-filtering, 
 * hybrid multi-factor scoring, and role-aware project matching.
 */

const User = require("../models/userModel");
const Skill = require("../models/skillModel");
const Cproject = require("../models/cprojectModel");
const FreelancerVector = require("../models/freelancerVectorModel");
const matchingConfig = require("../config/matchingConfig");
const { areSkillsRelated, getRelatedSkills } = require("../config/skillRelationships");
const { vectorize, computeCosineSimilarity } = require("./vocabularyService");

/**
 * Extracts integer years of experience from arbitrary string formats
 * (e.g., "4 years", "Fresher", "3-5 yrs", "5+", 5).
 */
function parseExperienceYears(exp) {
  if (typeof exp === "number") return Math.max(0, exp);
  if (!exp || typeof exp !== "string") return 0;

  const match = exp.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Builds the weighted composite searchable text for a freelancer.
 * Repeats high-intent fields (skills x3, title x2) to prevent skill underweighting.
 */
function buildFreelancerSearchableText({ skillTitle, description, skills, certifications, experienceYears }) {
  const parts = [];

  // 1. Boosted technical skills (3x repetition)
  if (skills && skills.length > 0) {
    const skillsText = skills.join(" ");
    for (let i = 0; i < matchingConfig.boosts.skills; i++) {
      parts.push(skillsText);
    }
  }

  // 2. Boosted job title (2x repetition)
  if (skillTitle) {
    for (let i = 0; i < matchingConfig.boosts.skillTitle; i++) {
      parts.push(skillTitle);
    }
  }

  // 3. Certifications
  if (certifications && certifications.length > 0) {
    parts.push(certifications.join(" "));
  }

  // 4. Bio / Description
  if (description) {
    parts.push(description);
  }

  // 5. Experience
  if (experienceYears > 0) {
    parts.push(`${experienceYears} years experience`);
  }

  return parts.join(" ").trim();
}

/**
 * Synchronizes a freelancer's search vector and structured fields in `freelancer_vectors`.
 * Called internally from user and skill controllers (zero new routes).
 */
async function syncFreelancerVector(fl_id) {
  if (!fl_id) return null;

  try {
    // 1. Load authoritative data from primary collections
    const [user, skillDoc] = await Promise.all([
      User.findOne({ fl_id }).lean(),
      Skill.findOne({ fl_id }).lean()
    ]);

    if (!user) {
      // If user doesn't exist, remove any orphaned vector record
      await FreelancerVector.deleteOne({ fl_id });
      return null;
    }

    // 2. Extract and normalize skills from skillDoc
    const rawSkills = (skillDoc && Array.isArray(skillDoc.skills)) 
      ? skillDoc.skills.map(s => (typeof s === "string" ? s : s.skill)).filter(Boolean)
      : [];
    const normalizedSkills = [...new Set(rawSkills.map(s => s.toLowerCase().trim()))];

    // 3. Extract and normalize certifications
    const rawCerts = Array.isArray(user.certifications)
      ? user.certifications.map(c => `${c.title || ""} ${c.issuer || ""}`.trim()).filter(Boolean)
      : [];
    const normalizedCerts = [...new Set(rawCerts.map(c => c.toLowerCase().trim()))];

    const skillTitle = (user.skillTitle || "").trim();
    const description = (user.description || "").trim();
    const experience_years = parseExperienceYears(user.experience);
    const status = user.status || "Active";

    // 4. Build compiled weighted text & generate TF-IDF vector
    const searchable_text = buildFreelancerSearchableText({
      skillTitle,
      description,
      skills: normalizedSkills,
      certifications: normalizedCerts,
      experienceYears: experience_years
    });

    const { vector, vector_magnitude } = vectorize(searchable_text);

    // 5. Upsert atomically into `freelancer_vectors`
    const updated = await FreelancerVector.findOneAndUpdate(
      { fl_id },
      {
        fl_id,
        skillTitle,
        description,
        skills: normalizedSkills,
        experience_years,
        certifications: normalizedCerts,
        searchable_text,
        vector,
        vector_magnitude,
        status,
        last_indexed_at: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return updated;
  } catch (err) {
    console.error(`[freelancerMatchService] Error syncing vector for fl_id ${fl_id}:`, err.message);
    // Return null without crashing calling controller
    return null;
  }
}

/**
 * Computes the multi-factor hybrid score between project role requirements and a candidate.
 * Guarantees strict [0.0, 1.0] normalization for every sub-score and zero double-counting.
 */
function computeHybridScore(requirements, candidate) {
  const {
    requiredSkills = [],
    requiredExp = 1,
    roleVector = {},
    roleMagnitude = 0
  } = requirements;

  const candidateSkills = new Set(candidate.skills || []);
  const reqSkillsList = requiredSkills.map(s => s.toLowerCase().trim()).filter(Boolean);

  // ── 1. Exact Skill Overlap (S_exact in [0.0, 1.0]) ────────────────
  const matchedExact = [];
  const unmatchedRequired = [];

  for (const reqSkill of reqSkillsList) {
    if (candidateSkills.has(reqSkill)) {
      matchedExact.push(reqSkill);
    } else {
      unmatchedRequired.push(reqSkill);
    }
  }

  const sExact = reqSkillsList.length === 0 
    ? 1.0 
    : matchedExact.length / reqSkillsList.length;

  // ── 2. Related Skill Score (S_related in [0.0, 1.0]) ───────────────
  // Evaluated STRICTLY against unmatchedRequired to ensure zero double-counting
  const matchedRelated = [];
  let relatedScoreSum = 0;

  if (reqSkillsList.length > 0 && unmatchedRequired.length > 0) {
    for (const unmatched of unmatchedRequired) {
      let bestRelWeight = 0;
      let matchedThrough = null;

      for (const candSkill of candidateSkills) {
        if (areSkillsRelated(unmatched, candSkill)) {
          bestRelWeight = matchingConfig.defaultRelatedSkillWeight;
          matchedThrough = candSkill;
          break;
        }
      }

      if (bestRelWeight > 0) {
        relatedScoreSum += bestRelWeight;
        matchedRelated.push({
          requiredSkill: unmatched,
          matchedVia: matchedThrough,
          weight: bestRelWeight
        });
      }
    }
  }

  const sRelated = reqSkillsList.length === 0 
    ? 0.0 
    : Math.min(1.0, relatedScoreSum / reqSkillsList.length);

  // Missing skills are those neither matched exactly nor through related mapping
  const relatedCoveredSkills = new Set(matchedRelated.map(m => m.requiredSkill));
  const missingSkills = unmatchedRequired.filter(s => !relatedCoveredSkills.has(s));

  // ── 3. TF-IDF Text Cosine Similarity (S_text in [0.0, 1.0]) ────────
  const sText = computeCosineSimilarity(
    roleVector,
    roleMagnitude,
    candidate.vector,
    candidate.vector_magnitude
  );

  // ── 4. Experience Years Match (S_exp in [0.0, 1.0]) ────────────────
  const candExp = candidate.experience_years || 0;
  const targetExp = Math.max(1, requiredExp);
  const sExp = candExp >= targetExp ? 1.0 : Number((candExp / targetExp).toFixed(2));

  // ── 5. Composite Final Score ──────────────────────────────────────
  const { weights } = matchingConfig;
  const finalScore = Number((
    (weights.exactSkills * sExact) +
    (weights.relatedSkills * sRelated) +
    (weights.textSimilarity * sText) +
    (weights.experience * sExp)
  ).toFixed(4));

  return {
    fl_id: candidate.fl_id,
    skillTitle: candidate.skillTitle || "",
    description: candidate.description || "",
    experience_years: candidate.experience_years || 0,
    skills: candidate.skills || [],
    certifications: candidate.certifications || [],
    scores: {
      finalScore,
      matchPercentage: Math.round(finalScore * 100),
      exactSkillScore: Number(sExact.toFixed(2)),
      relatedSkillScore: Number(sRelated.toFixed(2)),
      textSimilarityScore: Number(sText.toFixed(2)),
      experienceScore: Number(sExp.toFixed(2))
    },
    explanation: {
      matchedSkills: matchedExact,
      relatedSkills: matchedRelated,
      missingSkills
    }
  };
}

/**
 * Enriches ranked candidates with human details (fullname, avatar, rating)
 * from the User collection for UI presentation.
 */
async function enrichCandidatesWithUserData(candidates) {
  if (!candidates || candidates.length === 0) return [];

  const flIds = candidates.map(c => c.fl_id);
  const userDocs = await User.find({ fl_id: { $in: flIds } })
    .select("fl_id fullname email profile_pic averageRating")
    .lean();

  const userMap = new Map();
  userDocs.forEach(u => userMap.set(u.fl_id, u));

  return candidates.map((cand, idx) => {
    const u = userMap.get(cand.fl_id) || {};
    return {
      rank: idx + 1,
      fl_id: cand.fl_id,
      fullname: u.fullname || cand.fl_id,
      email: u.email || "",
      profile_pic: u.profile_pic || "",
      rating: u.averageRating || 5.0,
      skillTitle: cand.skillTitle || "Freelancer",
      description: cand.description || "",
      experience_years: cand.experience_years || 0,
      skills: cand.skills || [],
      scores: cand.scores,
      explanation: cand.explanation
    };
  });
}

/**
 * Finds and ranks best-matched freelancers for a project in `cproject`.
 * Supports role-aware ranking via `freelancerBreakdown` as well as overall matching.
 */
async function findBestMatchesForProject(p_id) {
  const project = await Cproject.findOne({ p_id }).lean();
  if (!project) {
    throw new Error(`Project not found with p_id: ${p_id}`);
  }

  const multiplier = matchingConfig.candidateMultiplier || 5;
  const isRoleAware = Array.isArray(project.freelancerBreakdown) && project.freelancerBreakdown.length > 0;

  // ── Pre-Filter Pool Helper ───────────────────────────────────────
  async function retrieveCandidatesForRequirements(requiredSkills, textQuery) {
    // Collect required skills + their related ontology skills
    const targetSkillSet = new Set(requiredSkills.map(s => s.toLowerCase().trim()));
    requiredSkills.forEach(s => {
      getRelatedSkills(s).forEach(rel => targetSkillSet.add(rel));
    });
    const targetSkillsArray = [...targetSkillSet];

    const orClauses = [];
    if (targetSkillsArray.length > 0) {
      orClauses.push({ skills: { $in: targetSkillsArray } });
    }
    if (textQuery && textQuery.trim()) {
      orClauses.push({ $text: { $search: textQuery.trim() } });
    }

    const query = { status: "Active" };
    if (orClauses.length > 0) {
      query.$or = orClauses;
    }

    let candidates = [];
    try {
      candidates = await FreelancerVector.find(query).lean();
    } catch (dbErr) {
      // Graceful fallback if full-text index is not yet built
      console.warn("[freelancerMatchService] Compound query fallback to skill check:", dbErr.message);
      candidates = await FreelancerVector.find({ 
        status: "Active", 
        ...(targetSkillsArray.length > 0 ? { skills: { $in: targetSkillsArray } } : {})
      }).lean();
    }

    // Safety fallback: if target pool is very small (< 10), pull top active candidates to ensure admin gets choices
    if (candidates.length < 10) {
      const fallbackActive = await FreelancerVector.find({ status: "Active" }).limit(30).lean();
      const existingIds = new Set(candidates.map(c => c.fl_id));
      for (const c of fallbackActive) {
        if (!existingIds.has(c.fl_id)) {
          candidates.push(c);
          existingIds.add(c.fl_id);
        }
      }
    }

    return candidates;
  }

  // ── Mode A: Role-Aware Matching (`freelancerBreakdown`) ───────────
  if (isRoleAware) {
    const rolesResult = [];

    for (let index = 0; index < project.freelancerBreakdown.length; index++) {
      const role = project.freelancerBreakdown[index];
      const roleCategory = role.category || project.category || "General";
      const roleSkills = Array.isArray(role.skills) ? role.skills : [];
      const roleCount = role.count || 1;
      const roleLimit = Math.max(multiplier, roleCount * multiplier);

      // Build composite text for role
      const roleCompositeText = `${project.title || ""} ${roleCategory} ${roleSkills.join(" ")} ${project.description || ""}`;
      const { vector: roleVector, vector_magnitude: roleMagnitude } = vectorize(roleCompositeText);

      // Retrieve and score candidates for this specific role
      const candidatePool = await retrieveCandidatesForRequirements(roleSkills, roleCompositeText);
      const scoredCandidates = candidatePool.map(cand => 
        computeHybridScore({
          requiredSkills: roleSkills,
          requiredExp: matchingConfig.defaults.requiredExperienceYears,
          roleVector,
          roleMagnitude
        }, cand)
      );

      // Sort descending by finalScore and take roleLimit
      scoredCandidates.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
      const topCandidates = scoredCandidates.slice(0, roleLimit);
      const enrichedCandidates = await enrichCandidatesWithUserData(topCandidates);

      rolesResult.push({
        roleIndex: index,
        category: roleCategory,
        countNeeded: roleCount,
        requiredSkills: roleSkills,
        candidatesLimit: roleLimit,
        totalQualified: scoredCandidates.length,
        candidates: enrichedCandidates
      });
    }

    return {
      p_id: project.p_id,
      title: project.title,
      category: project.category,
      freelancersNeeded: project.freelancersNeeded || 1,
      isRoleAware: true,
      roles: rolesResult
    };
  }

  // ── Mode B: Project-Wide Matching (Single Discipline) ─────────────
  const projectSkills = Array.isArray(project.skills) ? project.skills : [];
  const projectNeeded = project.freelancersNeeded || 1;
  const projectLimit = Math.max(multiplier, projectNeeded * multiplier);

  const projectCompositeText = `${project.title || ""} ${project.category || ""} ${projectSkills.join(" ")} ${project.description || ""}`;
  const { vector: projVector, vector_magnitude: projMagnitude } = vectorize(projectCompositeText);

  const candidatePool = await retrieveCandidatesForRequirements(projectSkills, projectCompositeText);
  const scoredCandidates = candidatePool.map(cand => 
    computeHybridScore({
      requiredSkills: projectSkills,
      requiredExp: matchingConfig.defaults.requiredExperienceYears,
      roleVector: projVector,
      roleMagnitude: projMagnitude
    }, cand)
  );

  scoredCandidates.sort((a, b) => b.scores.finalScore - a.scores.finalScore);
  const topCandidates = scoredCandidates.slice(0, projectLimit);
  const enrichedCandidates = await enrichCandidatesWithUserData(topCandidates);

  return {
    p_id: project.p_id,
    title: project.title,
    category: project.category,
    freelancersNeeded: projectNeeded,
    isRoleAware: false,
    candidatesLimit: projectLimit,
    totalQualified: scoredCandidates.length,
    candidates: enrichedCandidates
  };
}

module.exports = {
  syncFreelancerVector,
  computeHybridScore,
  findBestMatchesForProject,
  parseExperienceYears,
  buildFreelancerSearchableText
};
