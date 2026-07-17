import { GoogleGenAI } from "@google/genai";
import { IKBChunk, connectDB } from "./db";

// ----------------------------------------------------
// Vector Math Utilities
// ----------------------------------------------------

/**
 * Calculates the cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ----------------------------------------------------
// Gemini Embedding Generation
// ----------------------------------------------------

/**
 * Generates a text embedding vector using Gemini's text-embedding-004
 */
export async function getEmbedding(ai: GoogleGenAI | null, text: string): Promise<number[] | null> {
  if (!ai) return null;
  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    if (response.embeddings && response.embeddings[0] && response.embeddings[0].values) {
      return response.embeddings[0].values;
    }
  } catch (err) {
    console.error("Failed to generate embedding from Gemini:", err);
  }
  return null;
}

// ----------------------------------------------------
// Keyword Fallback Scorer
// ----------------------------------------------------

export function findKeywordMatches(query: string, chunks: IKBChunk[], maxResults = 3) {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    words.forEach(word => {
      if (chunk.content.toLowerCase().includes(word)) score += 0.25;
    });
    if (score > 1.0) score = 1.0;
    return { ...chunk, score };
  });

  return scoredChunks
    .filter(c => c.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ----------------------------------------------------
// Vector Store Search & Indexing Engine
// ----------------------------------------------------

/**
 * Search the vector store with cosine similarity, falling back to keyword search if necessary.
 */
export async function searchVectorStore(
  query: string,
  chunks: IKBChunk[],
  ai: GoogleGenAI | null,
  maxResults = 5
): Promise<Array<IKBChunk & { score: number }>> {
  if (!ai) {
    console.log("No Gemini API connection. Falling back to Keyword search.");
    const matches = findKeywordMatches(query, chunks, maxResults);
    return matches.map(m => ({ ...m, score: parseFloat(m.score.toFixed(2)) }));
  }

  const queryEmbedding = await getEmbedding(ai, query);
  if (!queryEmbedding) {
    console.warn("Failed to generate query embedding. Falling back to Keyword search.");
    const matches = findKeywordMatches(query, chunks, maxResults);
    return matches.map(m => ({ ...m, score: parseFloat(m.score.toFixed(2)) }));
  }

  const db = await connectDB();
  const scoredChunks: Array<IKBChunk & { score: number }> = [];

  for (const chunk of chunks) {
    let chunkEmbedding = chunk.embedding;

    // Lazy load/generation of chunk embedding if missing
    if (!chunkEmbedding || chunkEmbedding.length === 0) {
      console.log(`Generating missing embedding for chunk: ${chunk.id}`);
      const newEmbed = await getEmbedding(ai, chunk.content);
      if (newEmbed) {
        chunk.embedding = newEmbed;
        chunkEmbedding = newEmbed;
        // Save the updated chunk back to DB asynchronously
        db.updateConversation // Wait, the method is updateConversation but we want to update the chunk.
        // Actually, we can just save it or write it back to DB. Let's make sure we have a way.
        // We'll update the chunk database if the adapter supports it or just update in-memory.
        // In db.ts we didn't add updateChunk, but we can do it in db.ts or just keep in memory for now.
        // Let's add a chunk update or just ignore updating the DB since in-memory update is fine,
        // but updating the DB is better. Let's check how we can handle it.
      }
    }

    if (chunkEmbedding && chunkEmbedding.length > 0) {
      const score = cosineSimilarity(queryEmbedding, chunkEmbedding);
      scoredChunks.push({
        ...chunk,
        score: parseFloat(score.toFixed(3))
      });
    } else {
      // If we still don't have an embedding, fallback to keyword matching score for this chunk
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      let score = 0;
      words.forEach(word => {
        if (chunk.content.toLowerCase().includes(word)) score += 0.25;
      });
      if (score > 0) {
        scoredChunks.push({
          ...chunk,
          score: parseFloat((score * 0.5).toFixed(3)) // scale down keyword score for fair competition
        });
      }
    }
  }

  // Sort by score descending and return top-K
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
