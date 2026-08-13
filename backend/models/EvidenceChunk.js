import mongoose from "mongoose";

// Each chunk is a piece of evidence (a commit message, PR body, or issue
// thread) that has been embedded and can be retrieved by the RAG pipeline
// when answering "why" questions about the repo.
const evidenceChunkSchema = new mongoose.Schema(
  {
    analysisId: { type: mongoose.Schema.Types.ObjectId, ref: "RepoAnalysis", required: true, index: true },
    sourceType: { type: String, enum: ["commit", "pull_request", "issue", "readme"], required: true },
    sourceRef: String, // commit SHA, PR number, or issue number
    author: String,
    date: Date,
    text: String, // the raw text that was embedded
    embedding: { type: [Number], required: true }, // vector (Gemini: 768-dim, local fallback: bag-of-words)
    url: String,
  },
  { timestamps: true }
);

evidenceChunkSchema.index({ analysisId: 1, sourceType: 1 });

export default mongoose.model("EvidenceChunk", evidenceChunkSchema);
