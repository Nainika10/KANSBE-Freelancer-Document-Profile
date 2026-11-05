/**
 * ProfileService — Centralized profile completion calculator.
 *
 * Single source of truth for profile strength across both the freelancer
 * and client dashboards. Uses a weighted formula so not every field
 * is equally important.
 */

// ─── Freelancer Weights ────────────────────────────────────────────
const FREELANCER_FIELDS = [
  { key: 'fullname',       weight: 10, label: 'Full Name' },
  { key: 'email',          weight: 10, label: 'Email Address' },
  { key: 'contact',        weight: 8,  label: 'Contact Number' },
  { key: 'nationality',    weight: 5,  label: 'Nationality' },
  { key: 'country',        weight: 5,  label: 'Current Country' },
  { key: 'experience',     weight: 8,  label: 'Years of Experience' },
  { key: 'skillTitle',     weight: 8,  label: 'Job Title / Headline' },
  { key: 'description',    weight: 10, label: 'Professional Bio (Min 20 chars)', minLength: 20 },
  { key: 'dob',            weight: 5,  label: 'Date of Birth' },
  { key: 'gender',         weight: 2,  label: 'Gender' },
  { key: 'linkedin',       weight: 4,  label: 'LinkedIn Profile' },
  { key: 'portfolio',      weight: 4,  label: 'Portfolio URL' },
  { key: 'certifications', weight: 5,  label: 'Certifications', isArray: true },
];

// These two are checked separately because they come from different collections.
const LANGUAGES_WEIGHT = 8;   // label: 'Languages'
const SKILLS_WEIGHT    = 10;  // label: 'Technical Skills'

const FREELANCER_MAX = FREELANCER_FIELDS.reduce((s, f) => s + f.weight, 0)
                       + LANGUAGES_WEIGHT + SKILLS_WEIGHT; // = 100

// ─── Client Weights ────────────────────────────────────────────────
const CLIENT_FIELDS = [
  { key: 'fullname',        weight: 10, label: 'Full Name' },
  { key: 'email',           weight: 10, label: 'Email Address' },
  { key: 'contact',         weight: 8,  label: 'Contact Number' },
  { key: 'country',         weight: 5,  label: 'Country' },
  { key: 'nationality',     weight: 5,  label: 'Nationality' },
  { key: 'gender',          weight: 3,  label: 'Gender' },
  { key: 'dob',             weight: 4,  label: 'Date of Birth' },
  { key: 'bio',             weight: 8,  label: 'Bio', minLength: 10 },
  { key: 'companyname',     weight: 10, label: 'Company Name' },
  { key: 'companytype',     weight: 5,  label: 'Company Type' },
  { key: 'companydescrptn', weight: 8,  label: 'Company Description', minLength: 10 },
  { key: 'companyaddress',  weight: 5,  label: 'Company Address' },
  { key: 'city',            weight: 4,  label: 'City' },
  { key: 'state',           weight: 4,  label: 'State' },
  { key: 'pincode',         weight: 3,  label: 'Pincode' },
  { key: 'linkedin',        weight: 4,  label: 'LinkedIn Profile' },
  { key: 'companywebsite',  weight: 4,  label: 'Company Website' },
];

const CLIENT_MAX = CLIENT_FIELDS.reduce((s, f) => s + f.weight, 0); // = 100

// ─── Helpers ───────────────────────────────────────────────────────

function isPopulated(value, opts = {}) {
  if (value === undefined || value === null) return false;

  // Array check
  if (opts.isArray) {
    return Array.isArray(value) && value.length > 0;
  }

  const str = String(value).trim();
  if (str === '' || str === 'null' || str === 'undefined') return false;

  // Minimum length check (for description / bio)
  if (opts.minLength && str.length < opts.minLength) return false;

  return true;
}

// Map of action keys to human-friendly labels
const ACTION_MAP = {
  fullname:        { action: 'SET_FULLNAME',       label: 'Add your full name' },
  email:           { action: 'SET_EMAIL',           label: 'Add your email address' },
  contact:         { action: 'SET_CONTACT',         label: 'Add your phone number' },
  nationality:     { action: 'SET_NATIONALITY',     label: 'Set your nationality' },
  country:         { action: 'SET_COUNTRY',         label: 'Set your current country' },
  experience:      { action: 'SET_EXPERIENCE',      label: 'Add years of experience' },
  skillTitle:      { action: 'SET_SKILL_TITLE',     label: 'Add a job title / headline' },
  description:     { action: 'WRITE_BIO',           label: 'Write a professional bio (min 20 chars)' },
  dob:             { action: 'SET_DOB',             label: 'Set your date of birth' },
  gender:          { action: 'SET_GENDER',          label: 'Select your gender' },
  linkedin:        { action: 'ADD_LINKEDIN',        label: 'Connect your LinkedIn profile' },
  portfolio:       { action: 'ADD_PORTFOLIO',       label: 'Add your portfolio URL' },
  certifications:  { action: 'ADD_CERTIFICATION',   label: 'Upload at least one certification' },
  languages:       { action: 'ADD_LANGUAGES',       label: 'Add languages you speak' },
  skills:          { action: 'ADD_SKILLS',           label: 'Add at least one technical skill' },
  bio:             { action: 'WRITE_BIO',           label: 'Write a professional bio' },
  companyname:     { action: 'SET_COMPANY_NAME',    label: 'Add your company name' },
  companytype:     { action: 'SET_COMPANY_TYPE',    label: 'Specify your company type' },
  companydescrptn: { action: 'SET_COMPANY_DESC',    label: 'Write a company description' },
  companyaddress:  { action: 'SET_COMPANY_ADDRESS', label: 'Add company address' },
  city:            { action: 'SET_CITY',            label: 'Set your city' },
  state:           { action: 'SET_STATE',           label: 'Set your state' },
  pincode:         { action: 'SET_PINCODE',         label: 'Set your pincode' },
  companywebsite:  { action: 'SET_COMPANY_WEBSITE', label: 'Add company website' },
};

function buildAction(key, weight) {
  const entry = ACTION_MAP[key] || { action: `SET_${key.toUpperCase()}`, label: `Complete: ${key}` };
  return {
    ...entry,
    priority: weight >= 8 ? 'high' : 'medium',
    field: key,
  };
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Calculate freelancer profile completion.
 *
 * @param {Object} user   — Mongoose user document (plain object or doc)
 * @param {Array}  skills — Array of skill objects from the skills collection
 * @returns {{ percentage: number, missingFields: string[], suggestedActions: Object[] }}
 */
function calculateFreelancerCompletion(user, skills = []) {
  if (!user) return { percentage: 0, missingFields: [], suggestedActions: [] };

  let earned = 0;
  const missingFields = [];
  const suggestedActions = [];

  // Check standard fields
  for (const field of FREELANCER_FIELDS) {
    if (isPopulated(user[field.key], { isArray: field.isArray, minLength: field.minLength })) {
      earned += field.weight;
    } else {
      missingFields.push(field.key);
      suggestedActions.push(buildAction(field.key, field.weight));
    }
  }

  // Check languages
  const languages = user.languages;
  if (Array.isArray(languages) && languages.length > 0) {
    earned += LANGUAGES_WEIGHT;
  } else {
    missingFields.push('languages');
    suggestedActions.push(buildAction('languages', LANGUAGES_WEIGHT));
  }

  // Check skills (from skills collection)
  const hasSkills = Array.isArray(skills) && skills.length > 0 &&
                    skills.some(s => s.skills && s.skills.length > 0);
  if (hasSkills) {
    earned += SKILLS_WEIGHT;
  } else {
    missingFields.push('skills');
    suggestedActions.push(buildAction('skills', SKILLS_WEIGHT));
  }

  const percentage = Math.round((earned / FREELANCER_MAX) * 100);

  // Sort actions by priority (high first)
  suggestedActions.sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1));

  return { percentage, missingFields, suggestedActions };
}

/**
 * Calculate client profile completion.
 *
 * @param {Object} client — Mongoose cregister document
 * @returns {{ percentage: number, missingFields: string[], suggestedActions: Object[] }}
 */
function calculateClientCompletion(client) {
  if (!client) return { percentage: 0, missingFields: [], suggestedActions: [] };

  let earned = 0;
  const missingFields = [];
  const suggestedActions = [];

  for (const field of CLIENT_FIELDS) {
    if (isPopulated(client[field.key], { minLength: field.minLength })) {
      earned += field.weight;
    } else {
      missingFields.push(field.key);
      suggestedActions.push(buildAction(field.key, field.weight));
    }
  }

  const percentage = Math.round((earned / CLIENT_MAX) * 100);

  suggestedActions.sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1));

  return { percentage, missingFields, suggestedActions };
}

module.exports = {
  calculateFreelancerCompletion,
  calculateClientCompletion,
};
