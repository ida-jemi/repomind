import mongoose from "mongoose";

const contributorSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    commitCount: Number,
    linesChanged: Number,
    firstCommitDate: Date,
    lastCommitDate: Number,
    influenceScore: Number, // 0-100, normalized
  },
  { _id: false }
);

const fileNodeSchema = new mongoose.Schema(
  {
    path: String,
    commitCount: Number,
    lastModified: Date,
    coChangeWeight: Number, // aggregate co-change strength ("gravity")
    status: {
      type: String,
      enum: ["active", "stale", "dead"],
      default: "active",
    },
  },
  { _id: false }
);

const decisionCardSchema = new mongoose.Schema(
  {
    date: Date,
    title: String, // e.g. "Migrated auth from Firebase to JWT"
    narrative: String, // AI-generated explanation
    confidence: { type: String, enum: ["high", "medium", "low"], default: "medium" },
    evidenceRefs: [String], // commit SHAs / PR numbers used as evidence
    tags: [String],
  },
  { _id: false }
);

const repoAnalysisSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    repoUrl: { type: String, required: true },
    repoFullName: String, // e.g. "facebook/react"
    status: {
      type: String,
      enum: ["pending", "cloning", "analyzing", "embedding", "ready", "failed"],
      default: "pending",
    },
    error: String,

    stats: {
      totalCommits: Number,
      totalContributors: Number,
      firstCommitDate: Date,
      lastCommitDate: Date,
      totalFiles: Number,
    },

    contributors: [contributorSchema],
    fileGraph: [fileNodeSchema],
    deadFiles: [String],
    decisionCards: [decisionCardSchema],
    biography: String, // long-form AI narrative

    techStack: [String],

    embeddingMode: { type: String, enum: ["gemini", "local-tfidf"], default: "local-tfidf" },
  },
  { timestamps: true }
);

export default mongoose.model("RepoAnalysis", repoAnalysisSchema);
