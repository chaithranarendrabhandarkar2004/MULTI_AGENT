import test from "node:test";
import assert from "node:assert";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cosineSimilarity } from "./vectorStore";
import { connectDB } from "./db";

test("Vector Store - Cosine Similarity calculations", () => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];
  const vecD = [-1, 0, 0];

  assert.strictEqual(cosineSimilarity(vecA, vecB), 1);

  assert.strictEqual(cosineSimilarity(vecA, vecC), 0);

  assert.strictEqual(cosineSimilarity(vecA, vecD), -1);

  const vecX = [1, 1];
  const vecY = [1, 0];
  const sim = cosineSimilarity(vecX, vecY);
  assert.ok(Math.abs(sim - 0.7071) < 0.001);
});

test("Auth - Bcrypt password hashing & validation", async () => {
  const password = "SuperSecretPassword123";
  
  const hash = await bcrypt.hash(password, 10);
  assert.ok(hash !== password);
  assert.ok(hash.startsWith("$2a$") || hash.startsWith("$2b$"));

  const isMatch = await bcrypt.compare(password, hash);
  assert.strictEqual(isMatch, true);

  const isMatchFail = await bcrypt.compare("WrongPassword", hash);
  assert.strictEqual(isMatchFail, false);
});

test("Auth - JWT creation & validation signature", () => {
  const secret = "test_jwt_secret_key_2026";
  const payload = { username: "tester", role: "user" };

  const token = jwt.sign(payload, secret, { expiresIn: "1h" });
  assert.ok(token.length > 0);
  assert.strictEqual(token.split(".").length, 3);

  const decoded = jwt.verify(token, secret) as any;
  assert.strictEqual(decoded.username, payload.username);
  assert.strictEqual(decoded.role, payload.role);

  const tamperedToken = token + "modified";
  assert.throws(() => {
    jwt.verify(tamperedToken, secret);
  });
});

test("Database - Fallback initialization check", async () => {

  const db = await connectDB();
  assert.ok(db !== null);
  assert.ok(typeof db.isMongo === "boolean");
  
  assert.ok(typeof db.getUserByUsername === "function");
  assert.ok(typeof db.getFiles === "function");
  assert.ok(typeof db.getChunks === "function");
  assert.ok(typeof db.getConversations === "function");
});
