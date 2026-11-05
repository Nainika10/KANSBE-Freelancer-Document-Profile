#!/usr/bin/env node
/**
 * seed-demo.js — one-shot demo data for the "View Resume" (Client View) feature.
 *
 * Creates exactly what the button needs:
 *   client  -> project -> group -> freelancer with a stored client_view
 *
 * Safe & idempotent:
 *   - Only touches documents with the DEMO_* ids below (upsert).
 *   - Never deletes unrelated data.
 *   - Re-running updates the same records.
 *
 * Usage (from backend/mycontacts-backend):
 *   node seed-demo.js             # create / update demo data
 *   node seed-demo.js --cleanup   # remove demo data
 *
 * Login after seeding:
 *   email:    demo.client@example.com
 *   password: Demo@12345
 *
 * Then open:
 *   http://localhost:4200/home/freelancer-list/P-DEMO-0001
 */

require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("./models/userModel");
const Cregister = require("./models/cregisterModel");
const Cproject = require("./models/cprojectModel");
const Group = require("./models/groupModel");
const Skill = require("./models/skillModel");

const DEMO = {
  c_id: "CLDEMO0001",
  fl_id: "flDEMO0001",
  p_id: "P-DEMO-0001",
  grp_id: "grpDEMO0001",
  clientEmail: "demo.client@example.com",
  freelancerEmail: "demo.freelancer@example.com",
  password: "Demo@12345",
};

// Only the nine whitelisted professional fields — no PII.
const CLIENT_VIEW = {
  skills: [
    "Video Editing",
    "Adobe Premiere Pro",
    "After Effects",
    "Color Grading",
    "Sound Design",
  ],
  experience: [
    "5+ years editing short-form and long-form video content",
    "Worked with marketing and product teams on launch videos",
  ],
  roles: ["Video Editor", "Motion Designer"],
  responsibilities: [
    "Edit raw footage into polished, on-brand deliverables",
    "Collaborate with clients through revision rounds",
  ],
  projects: [
    "Corporate brand film (2024)",
    "YouTube series editing (2023)",
  ],
  technologies: [
    "Adobe Premiere Pro",
    "After Effects",
    "DaVinci Resolve",
    "Audition",
  ],
  certifications: ["Adobe Certified Professional — Premiere Pro"],
  achievements: ["Edited a campaign video that reached 1M+ views"],
  portfolio: ["Portfolio samples available on request"],
};

const CLEANUP = process.argv.includes("--cleanup");

async function removeDemoData() {
  const [groups, skills, projects, users, clients] = await Promise.all([
    Group.deleteMany({ grp_id: DEMO.grp_id }),
    Skill.deleteMany({ fl_id: DEMO.fl_id }),
    Cproject.deleteMany({ p_id: DEMO.p_id }),
    User.deleteMany({ fl_id: DEMO.fl_id }),
    Cregister.deleteMany({ c_id: DEMO.c_id }),
  ]);

  console.log("Removed demo data:");
  console.log(`  groups      : ${groups.deletedCount}`);
  console.log(`  skills      : ${skills.deletedCount}`);
  console.log(`  projects    : ${projects.deletedCount}`);
  console.log(`  freelancers : ${users.deletedCount}`);
  console.log(`  clients     : ${clients.deletedCount}`);
}

async function createDemoData() {
  const passwordHash = await bcrypt.hash(DEMO.password, 10);

  // 1. Client account (login)
  await Cregister.updateOne(
    { c_id: DEMO.c_id },
    {
      $set: {
        c_id: DEMO.c_id,
        fullname: "Demo Client",
        email: DEMO.clientEmail,
        password: passwordHash,
        country: "India",
        location: "Bengaluru",
        city: "Bengaluru",
        companyname: "Demo Company",
        terms: true,
        isverfied: true,
        profile: true,
        profile_completion: 100,
        createdby: DEMO.c_id,
        updatedby: DEMO.c_id,
      },
    },
    { upsert: true }
  );

  // 2. Freelancer with a stored, PII-free Client View
  await User.updateOne(
    { fl_id: DEMO.fl_id },
    {
      $set: {
        fl_id: DEMO.fl_id,
        fullname: "Siri Demo",
        email: DEMO.freelancerEmail,
        password: passwordHash,
        country: "India",
        skillTitle: "Video Editor",
        description:
          "Video editor with 5+ years of experience in brand and social content.",
        isverified: true,
        status: "Active",
        createdby: DEMO.c_id,
        updatedby: DEMO.c_id,
        client_view: {
          data: CLIENT_VIEW,
          validationStatus: "valid",
          piiDetected: {
            email: false,
            phone: false,
            addressLocation: false,
            governmentId: false,
          },
          updatedAt: new Date(),
        },
      },
    },
    { upsert: true }
  );

  // 3. Project owned by the demo client
  await Cproject.updateOne(
    { p_id: DEMO.p_id },
    {
      $set: {
        p_id: DEMO.p_id,
        c_id: DEMO.c_id,
        title: "Demo Video Editing Project",
        description: "Demo project used to test the View Resume button.",
        category: "Video Editing",
        skills: ["Video Editing", "Adobe Premiere Pro"],
        budget: 50000,
        status: "in-progress",
        freelancersNeeded: 1,
        createdby: DEMO.c_id,
        updatedby: DEMO.c_id,
      },
    },
    { upsert: true }
  );

  // 4. Group linking project + freelancer ("Waiting-for-client" = shows the card)
  await Group.updateOne(
    { grp_id: DEMO.grp_id },
    {
      $set: {
        grp_id: DEMO.grp_id,
        grp_name: "Demo Group",
        p_id: DEMO.p_id,
        p_manager: [],
        members: [
          { member: DEMO.fl_id, decision: "Waiting-for-client", terms: false },
        ],
        members_accepted: 0,
        status: "active",
        createdby: DEMO.c_id,
        updatedby: DEMO.c_id,
      },
    },
    { upsert: true }
  );

  // 5. Skills shown as pills on the freelancer card
  await Skill.updateOne(
    { fl_id: DEMO.fl_id },
    {
      $set: {
        fl_id: DEMO.fl_id,
        skills: [
          "Adobe Premiere Pro",
          "After Effects",
          "DaVinci Resolve",
          "Sound Design",
        ].map((s) => ({ skill: s, status: "Active", createdby: DEMO.fl_id })),
        createdby: DEMO.fl_id,
      },
    },
    { upsert: true }
  );
}

async function verifyDemoData() {
  const [client, freelancer, project, group] = await Promise.all([
    Cregister.findOne({ c_id: DEMO.c_id }).lean(),
    User.findOne({ fl_id: DEMO.fl_id }).lean(),
    Cproject.findOne({ p_id: DEMO.p_id }).lean(),
    Group.findOne({ grp_id: DEMO.grp_id }).lean(),
  ]);

  const sectionCount = freelancer?.client_view?.data
    ? Object.keys(freelancer.client_view.data).length
    : 0;

  const checks = [
    ["client account", !!client],
    ["freelancer", !!freelancer],
    [`client_view (${sectionCount} sections)`, sectionCount === 9],
    ["project", !!project && project.c_id === DEMO.c_id],
    ["group", !!group && group.p_id === DEMO.p_id],
    [
      "group member (Waiting-for-client)",
      !!group &&
        Array.isArray(group.members) &&
        group.members.some(
          (m) => m.member === DEMO.fl_id && m.decision === "Waiting-for-client"
        ),
    ],
  ];

  console.log("");
  console.log("Verification:");
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "OK  " : "FAIL"}  ${label}`);
  }

  return checks.every(([, ok]) => ok);
}

(async () => {
  if (!process.env.CONNECTION_STRING) {
    console.error(
      "CONNECTION_STRING is missing. Copy .env.example to .env and fill it in first."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("Connected to database:", mongoose.connection.name);

    if (CLEANUP) {
      await removeDemoData();
    } else {
      await createDemoData();
      const ok = await verifyDemoData();

      console.log("");
      console.log("==============================================");
      console.log(" DEMO DATA READY");
      console.log("==============================================");
      console.log(" Client login");
      console.log("   email   :", DEMO.clientEmail);
      console.log("   password:", DEMO.password);
      console.log("");
      console.log(" Open after starting the frontend:");
      console.log(`   http://localhost:4200/home/freelancer-list/${DEMO.p_id}`);
      console.log("");
      console.log(" Re-run to update, or remove with:");
      console.log("   node seed-demo.js --cleanup");
      console.log("==============================================");

      if (!ok) {
        console.error("Verification failed — check the output above.");
        process.exitCode = 1;
      }
    }
  } catch (err) {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
