import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import multer from "multer";
import { createRequire } from "module";
const requireModule = createRequire(import.meta.url);
const pdfParse = requireModule("pdf-parse");
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB, IDatabaseAdapter, IKBFile, IKBChunk, IConversation } from "./db";
import { getEmbedding, searchVectorStore } from "./vectorStore";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "techmart_orchestrator_secret_key_2026";

app.use(express.json());

// Initialize Gemini SDK with telemetry header
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Multer upload config for PDFs
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ----------------------------------------------------
// JWT Authentication Middleware
// ----------------------------------------------------

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Access token required. Please log in." });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Invalid or expired session token." });
    req.user = user;
    next();
  });
}

// ----------------------------------------------------
// Default Seeding Data
// ----------------------------------------------------

const PRESET_KNOWLEDGE_FILES = [
  {
    id: "kb-1",
    name: "RefundPolicy.pdf",
    category: "policy",
    size: "14 KB",
    content: `Refund Policy of TechMart Electronics:
- We offer a strict 30-day money-back guarantee for all purchases.
- To qualify for a full refund, items must be returned in their original packaging, unopened, with all original accessories.
- If a product is defective or damaged upon arrival, return shipping is completely free.
- For non-defective returns (buyer's remorse), a 10% restocking fee applies, and the customer is responsible for return shipping costs.
- Refund requests must be initiated through the website account portal or by emailing refunds@techmartelectronics.com.
- Once we receive and inspect the item, refunds are processed within 5 to 7 business days to the original payment method.`
  },
  {
    id: "kb-2",
    name: "ShippingPolicy.pdf",
    category: "policy",
    size: "12 KB",
    content: `Shipping Policy and Guidelines:
- Standard shipping takes 3-5 business days and is free for orders over $50.
- Standard shipping for orders under $50 is a flat rate of $4.99.
- Expedited 2-day shipping is available nationwide for a flat rate of $9.99.
- Overnight shipping is available for urgent orders at a rate of $19.99.
- Orders are processed and shipped within 24 hours on business days (Monday to Friday).
- Tracking numbers are generated and emailed automatically as soon as the shipping label is scanned by the carrier.
- We ship to the United States, Canada, and the United Kingdom. Custom duties for Canadian/UK shipments are paid by the customer.`
  },
  {
    id: "kb-3",
    name: "Warranty.pdf",
    category: "policy",
    size: "15 KB",
    content: `Warranty terms for TechMart Hardware:
- All TechMart devices (SmartTV, RoboVac, SoundBar, EarBuds, SmartWatch) are covered by a 1-year limited warranty.
- This warranty covers standard manufacturing defects in materials, assembly, and workmanship under normal consumer use.
- The warranty strictly excludes: accidental damage (dropped devices, screen cracks, water/liquid immersion), cosmetic wear and tear, unauthorized repairs or self-modifications, and natural disasters.
- Warranty claims require valid proof of purchase (receipt/invoice).
- For claims, email warranty@techmartelectronics.com with your serial number and issue description. We will repair or replace the item.`
  },
  {
    id: "kb-4",
    name: "Products.pdf",
    category: "products",
    size: "24 KB",
    content: `Products Specifications & Catalog:
1. SmartTV 4K (Model TV-55UHD): 55-inch display, Ultra HD resolution, HDR10, built-in smart assistant apps, 3x HDMI 2.1 ports. Price: $399.99. Status: In Stock.
2. RoboVac X12 (Model RV-X12): Intelligent robotic vacuum. 2500Pa high suction power, active LiDAR mapping, custom zone cleaning, auto-docking, 120-minute lithium battery. Price: $249.99. Status: Low Stock.
3. SoundBar Elite (Model SB-E21): 2.1 channel speaker bar, 150W peak power, wireless active subwoofer, Bluetooth 5.0, optical and HDMI ARC input. Price: $129.99. Status: In Stock.
4. EarBuds Pro (Model EB-P5): Wireless active noise-cancelling (ANC) earbuds, IPX5 water resistance, smart touch controls, 30-hour total battery life with wireless charging case. Price: $79.99. Status: In Stock.
5. SmartWatch 3 (Model SW-3): GPS-enabled smart watch. Features health/fitness trackers, persistent heart rate sensor, sleep analysis, 7-day battery life, notifications. Price: $99.99. Status: In Stock.`
  },
  {
    id: "kb-5",
    name: "Pricing.pdf",
    category: "pricing",
    size: "10 KB",
    content: `Subscription Tiers and Support Levels:
- Basic Free Tier ($0/month): Includes standard email support (24-48 hours response time), self-help community guides, and standard tracking.
- Premium Member ($14.99/month or $119.99/year): Includes priority 24/7 support access, free expedited shipping on all orders, extended 60-day return window, and a 5% discount on all physical product purchases.
- Enterprise Support ($49.99/month per user): Dedicated support engineer, guaranteed 1-hour SLA response, customized installation assistance, custom firmware options, and free repair pickup.`
  },
  {
    id: "kb-6",
    name: "InstallationGuide.pdf",
    category: "manual",
    size: "18 KB",
    content: `TechMart Device Initial Installation Instructions:
- RoboVac X12 Setup: Place the charging base flat on a hard floor against a wall with 1 meter clearance on both sides. Plug base into power. Place RoboVac on dock and charge for 4 hours. Download the TechMart App, tap 'Add Device', and follow prompts over 2.4GHz Wi-Fi (5GHz not supported).
- SoundBar Elite Setup: Connect the SoundBar to your TV using the optical digital audio cable or HDMI ARC. Plug both the SoundBar and subwoofer into wall outlets. Power both on; they will automatically link wirelessly (the red syncing light on back of subwoofer will turn solid blue).`
  },
  {
    id: "kb-7",
    name: "UserManual.pdf",
    category: "manual",
    size: "20 KB",
    content: `TechMart General Operations Manual:
- Account & Password Resets: If you cannot log in, click 'Forgot Password' on the sign-in screen. Enter your registered email to receive a password reset link. The reset link expires in 24 hours. Passwords must be at least 8 characters, with 1 uppercase and 1 number.
- SmartWatch 3 Reset: To hard-reset the watch and erase all personal data, slide to Settings on the watch interface, choose 'System Settings', select 'Factory Reset', and confirm. This is non-reversible.`
  }
];

const PRESET_CONVERSATIONS: any[] = [
  {
    id: "c-101",
    userId: "u-john",
    userName: "John Doe",
    status: "resolved",
    createdAt: "2026-07-16T10:15:00-07:00",
    updatedAt: "2026-07-16T10:20:00-07:00",
    messages: [
      {
        id: "m-101a",
        sender: "user",
        text: "I bought a RoboVac X12 and charged it for 4 hours but it won't connect to my Wi-Fi! Also, I was double charged on my invoice.",
        timestamp: "2026-07-16T10:15:00-07:00"
      },
      {
        id: "m-101b",
        sender: "assistant",
        text: "Hello Alice! I would be happy to help you with both your RoboVac Wi-Fi connection and your double charge issue.\n\n[Billing Agent Response]\nRegarding the billing error, I have analyzed your account details. It appears there was a duplicate processing flag on transaction invoice #2026-88. I have initiated a refund of $249.99 for the second charge, which will clear in 5-7 business days.\n\n[Technical Support Agent Response]\nFor your RoboVac X12, please note that the vacuum only connects to 2.4GHz Wi-Fi networks. If your router combines 2.4GHz and 5GHz, please split them or enable a guest network locked to 2.4GHz. Also, hold the power button for 3 seconds to trigger pairing mode.",
        timestamp: "2026-07-16T10:16:30-07:00",
        rating: 5,
        trace: {
          id: "tr-101",
          query: "I bought a RoboVac X12 and charged it for 4 hours but it won't connect to my Wi-Fi! Also, I was double charged on my invoice.",
          timestamp: "2026-07-16T10:15:00-07:00",
          sentiment: "negative",
          sentimentScore: -0.6,
          detectedIntent: "Billing + Technical Support",
          routedAgents: ["Billing Agent", "Technical Support Agent"],
          retrievedChunks: [
            { fileName: "InstallationGuide.pdf", content: "- RoboVac X12 Setup: ... follow prompts over 2.4GHz Wi-Fi (5GHz not supported).", score: 0.89 },
            { fileName: "RefundPolicy.pdf", content: "- Once we receive and inspect the item, refunds are processed within 5 to 7 business days.", score: 0.72 }
          ],
          agentOutputs: {
            "Billing Agent": "Duplicate charge on invoice #2026-88 identified. Refund of $249.99 initiated.",
            "Technical Support Agent": "RoboVac X12 requires a 2.4GHz Wi-Fi. 5GHz is not supported. Hold sync for 3 seconds."
          },
          finalResponse: "Hello Alice! I would be happy to help...",
          responseTimeMs: 1250,
          tokensUsed: 420
        }
      }
    ]
  },
  {
    id: "c-102",
    userId: "u-john",
    userName: "John Doe",
    status: "resolved",
    createdAt: "2026-07-16T11:02:00-07:00",
    updatedAt: "2026-07-16T11:05:00-07:00",
    messages: [
      {
        id: "m-102a",
        sender: "user",
        text: "How much does the SmartWatch 3 cost and does it track heart rate?",
        timestamp: "2026-07-16T11:02:00-07:00"
      },
      {
        id: "m-102b",
        sender: "assistant",
        text: "Hello Bob! The SmartWatch 3 (Model SW-3) is priced at $99.99. It is fully equipped with built-in GPS and features continuous heart rate monitoring, sleep analysis, and fitness tracking. We currently have it in stock!",
        timestamp: "2026-07-16T11:03:10-07:00",
        rating: 5,
        trace: {
          id: "tr-102",
          query: "How much does the SmartWatch 3 cost and does it track heart rate?",
          timestamp: "2026-07-16T11:02:00-07:00",
          sentiment: "neutral",
          sentimentScore: 0.1,
          detectedIntent: "Product Information",
          routedAgents: ["Product Agent"],
          retrievedChunks: [
            { fileName: "Products.pdf", content: "- SmartWatch 3 (Model SW-3): GPS-enabled watch, heart rate sensor, price $99.99.", score: 0.95 }
          ],
          agentOutputs: {
            "Product Agent": "SmartWatch 3 is $99.99 and has GPS and continuous heart rate tracking."
          },
          finalResponse: "Hello Bob! The SmartWatch 3...",
          responseTimeMs: 820,
          tokensUsed: 210
        }
      }
    ]
  }
];

// Seed preset files and default credentials
async function seedDatabase(db: IDatabaseAdapter) {
  try {
    const existingFiles = await db.getFiles();
    if (existingFiles.length === 0) {
      console.log("🌱 Database empty. Seeding default knowledge base files...");
      for (const file of PRESET_KNOWLEDGE_FILES) {
        const paragraphs = file.content.split("\n- ").filter(p => p.trim().length > 0);
        
        await db.createFile({
          id: file.id,
          name: file.name,
          category: file.category,
          size: file.size,
          content: file.content,
          chunksCount: paragraphs.length
        });

        const chunksToInsert: IKBChunk[] = [];
        let idx = 1;
        for (const p of paragraphs) {
          const cleanText = p.startsWith("- ") ? p : "- " + p;
          
          // Pre-generate embedding if AI key is active
          let embedding: number[] = [];
          if (ai) {
            const emb = await getEmbedding(ai, cleanText);
            if (emb) embedding = emb;
          }

          chunksToInsert.push({
            id: `${file.id}-c-${idx}`,
            fileId: file.id,
            fileName: file.name,
            content: cleanText,
            embedding
          });
          idx++;
        }
        await db.createChunks(chunksToInsert);
      }
      console.log("🌱 Seeding default files complete.");
    }

    const existingConvs = await db.getConversations();
    if (existingConvs.length === 0) {
      console.log("🌱 Seeding default mock conversations...");
      for (const conv of PRESET_CONVERSATIONS) {
        await db.createConversation(conv);
      }
      console.log("🌱 Seeding default conversations complete.");
    }

    // Seed default admin user for quick logins
    const adminUser = await db.getUserByUsername("admin");
    if (!adminUser) {
      console.log("🌱 Creating default 'admin' user (password: admin123)...");
      const passwordHash = await bcrypt.hash("admin123", 10);
      await db.createUser({
        username: "admin",
        passwordHash,
        role: "admin"
      });
    }
  } catch (err) {
    console.error("❌ Failed database seeding:", err);
  }
}

// ----------------------------------------------------
// Analytics Processor
// ----------------------------------------------------

async function getAnalyticsSummary(db: IDatabaseAdapter) {
  const conversations = await db.getConversations();
  const total = conversations.length;
  const active = conversations.filter(c => c.status === "active").length;
  const resolved = conversations.filter(c => c.status === "resolved").length;
  const escalated = conversations.filter(c => c.status === "escalated").length;

  let responseTimes: number[] = [];
  let csatRatings: number[] = [];
  let posCount = 0;
  let neuCount = 0;
  let negCount = 0;

  const agentCalls: Record<string, number> = {
    "Billing Agent": 0,
    "Technical Support Agent": 0,
    "Product Agent": 0,
    "Complaint Agent": 0,
    "FAQ Agent": 0
  };

  const allTraces: any[] = [];

  conversations.forEach(c => {
    c.messages.forEach((m: any) => {
      if (m.sender === "assistant" && m.trace) {
        responseTimes.push(m.trace.responseTimeMs || 800);
        if (m.rating) {
          csatRatings.push(m.rating);
        }
        allTraces.push(m.trace);

        if (m.trace.sentiment === "positive") posCount++;
        else if (m.trace.sentiment === "negative") negCount++;
        else neuCount++;

        if (Array.isArray(m.trace.routedAgents)) {
          m.trace.routedAgents.forEach((agent: string) => {
            if (agentCalls[agent] !== undefined) {
              agentCalls[agent]++;
            }
          });
        }
      }
    });
  });

  const avgResponseTime = responseTimes.length > 0 
    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) 
    : 950;

  const avgCSAT = csatRatings.length > 0 
    ? parseFloat((csatRatings.reduce((a, b) => a + b, 0) / csatRatings.length).toFixed(2)) 
    : 4.4;

  const agentDistribution = [
    { agent: "Billing Agent", calls: agentCalls["Billing Agent"] || 1, color: "#3B82F6" },
    { agent: "Technical Support Agent", calls: agentCalls["Technical Support Agent"] || 2, color: "#10B981" },
    { agent: "Product Agent", calls: agentCalls["Product Agent"] || 1, color: "#F59E0B" },
    { agent: "Complaint Agent", calls: agentCalls["Complaint Agent"] || 0, color: "#EF4444" },
    { agent: "FAQ Agent", calls: agentCalls["FAQ Agent"] || 1, color: "#8B5CF6" }
  ];

  const volumeTimeline = [
    { time: "Mon", queries: 2 },
    { time: "Tue", queries: 4 },
    { time: "Wed", queries: 5 },
    { time: "Thu", queries: conversations.length },
  ];

  return {
    totalConversations: total,
    activeConversations: active,
    resolvedConversations: resolved,
    escalatedConversations: escalated,
    averageResponseTimeMs: avgResponseTime,
    averageCSAT: avgCSAT,
    sentimentTrends: {
      positive: posCount || 1,
      neutral: neuCount || 2,
      negative: negCount || 1
    },
    agentDistribution,
    recentTraces: allTraces.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 6),
    volumeTimeline
  };
}

// ----------------------------------------------------
// Natural Language Processing & Orchestration Fallbacks
// ----------------------------------------------------

function fallbackIntentDetection(text: string) {
  const query = text.toLowerCase();
  const routed: string[] = [];
  let intent = "FAQ Support";

  let billingScore = 0;
  let techScore = 0;
  let prodScore = 0;
  let compScore = 0;
  let faqScore = 0;

  if (query.match(/charge|invoice|bill|double|refund|pay|price|money|credit|cost/)) {
    billingScore += 2;
  }
  if (query.match(/wifi|wi-fi|connect|setup|reset|factory|password|login|screen|black|install|app|sync/)) {
    techScore += 2;
  }
  if (query.match(/spec|compare|feature|colors|size|availability|model|in stock|buy|cost/)) {
    prodScore += 2;
  }
  if (query.match(/terrible|garbage|trash|wait|worst|dissatisfied|angry|horrible|complaint|manager|escalate/)) {
    compScore += 2;
  }
  if (query.match(/how|why|address|location|hours|phone|contact|email|policies/)) {
    faqScore += 1;
  }

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let sentimentScore = 0;
  if (query.match(/garbage|terrible|trash|worst|hate|angry|unacceptable|broken/)) {
    sentiment = 'negative';
    sentimentScore = -0.8;
  } else if (query.match(/thanks|thank you|love|great|awesome|helpful|perfect/)) {
    sentiment = 'positive';
    sentimentScore = 0.8;
  }

  if (billingScore > 0) routed.push("Billing Agent");
  if (techScore > 0) routed.push("Technical Support Agent");
  if (prodScore > 0 && !routed.includes("Billing Agent")) routed.push("Product Agent");
  if (compScore > 0) routed.push("Complaint Agent");
  if (faqScore > 0 && routed.length === 0) routed.push("FAQ Agent");

  if (routed.length === 0) {
    routed.push("FAQ Agent");
  }

  intent = routed.join(" & ");

  return {
    detectedIntent: intent,
    routedAgents: routed,
    sentiment,
    sentimentScore
  };
}

function fallbackResponseGenerator(query: string, intent: string, routedAgents: string[]) {
  const outputs: Record<string, string> = {};

  routedAgents.forEach(agent => {
    if (agent === "Billing Agent") {
      outputs[agent] = `Based on TechMart's policy, we process refunds within 5-7 business days to the original payment method. For any potential double charges or duplicate invoices, we offer a full manual reconciliation to reverse extra drafts immediately.`;
    } else if (agent === "Technical Support Agent") {
      outputs[agent] = `Please check that your TechMart device is on a level surface and plugged in. If experiencing connectivity problems with devices like the RoboVac X12, remember that only 2.4GHz Wi-Fi networks are compatible; dual-band routers may require a split network.`;
    } else if (agent === "Product Agent") {
      outputs[agent] = `Our specifications catalog lists items like the SmartTV 4K (TV-55UHD) at $399.99, RoboVac X12 (RV-X12) at $249.99, SoundBar Elite at $129.99, and SmartWatch 3 at $99.99 with health sensors and GPS tracking. All items carry a 1-year limited warranty.`;
    } else if (agent === "Complaint Agent") {
      outputs[agent] = `I completely hear your frustration. Customer satisfaction is our highest priority. I am escalating your situation to our Tier 2 Support Lead to arrange immediate troubleshooting, free shipping replacement, or direct credit re-allocations.`;
    } else {
      outputs[agent] = `TechMart standard shipping is 3-5 days and is free on orders above $50. Standard returns are accepted within 30 days of shipment receipt, subject to a 10% restocking fee if not defective.`;
    }
  });

  let finalResponse = "Thank you for contacting TechMart Electronics Support. ";
  if (routedAgents.length === 1) {
    finalResponse += outputs[routedAgents[0]];
  } else {
    finalResponse += "I have coordinated with our specialized internal agents to address your concerns:\n\n";
    routedAgents.forEach(agent => {
      finalResponse += `**${agent}**:\n${outputs[agent]}\n\n`;
    });
    finalResponse += "Please let me know if there's anything else I can clarify or if we should initiate a support ticket.";
  }

  return {
    outputs,
    finalResponse
  };
}

// ----------------------------------------------------
// AUTHENTICATION ENDPOINTS
// ----------------------------------------------------

app.post("/api/auth/register", async (req: any, res: any) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const db = await connectDB();
    const existing = await db.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser({
      username,
      passwordHash,
      role: "user"
    });

    res.json({ success: true, message: "User registered successfully." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to register user." });
  }
});

app.post("/api/auth/login", async (req: any, res: any) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const db = await connectDB();
    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ success: true, token, username: user.username, role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to authenticate." });
  }
});

// ----------------------------------------------------
// PROTECTED API ENDPOINTS
// ----------------------------------------------------

// Health Check (Public)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiActive: !!ai });
});

// Fetch Knowledge Base files
app.get("/api/knowledge-base", authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const files = await db.getFiles();
    const chunks = await db.getChunks();
    res.json({
      files,
      chunksCount: chunks.length,
      chunks: chunks.slice(0, 15)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch knowledge base." });
  }
});

// Semantic Vector Search Sandbox Endpoint
app.post("/api/knowledge-base/search", authenticateToken, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Missing query parameter." });

  try {
    const db = await connectDB();
    const chunks = await db.getChunks();
    
    // Perform Cosine Similarity / Keyword Search
    const searchResults = await searchVectorStore(query, chunks, ai, 5);

    res.json({
      query,
      results: searchResults,
      method: ai ? "Gemini text-embedding-004 + Cosine Similarity" : "Keyword Frequency Fallback"
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed." });
  }
});

// Text-based Document Upload (Copy-Paste)
app.post("/api/knowledge-base/upload", authenticateToken, async (req: any, res: any) => {
  const { name, content, category } = req.body;
  if (!name || !content || !category) {
    return res.status(400).json({ error: "Missing required fields (name, content, category)." });
  }

  try {
    const db = await connectDB();
    const fileId = `kb-custom-${Date.now()}`;
    const newFile: IKBFile = {
      id: fileId,
      name: name.endsWith(".pdf") ? name : `${name}.pdf`,
      category: category,
      size: `${Math.round(content.length / 1024) || 1} KB`,
      content,
      chunksCount: 0
    };

    const paragraphs = content.split("\n").filter((p: string) => p.trim().length > 10);
    const chunksToInsert: IKBChunk[] = [];
    let chunkIdx = 1;

    for (const p of paragraphs) {
      const cleanText = p.startsWith("- ") ? p : "- " + p;
      let embedding: number[] = [];
      if (ai) {
        const emb = await getEmbedding(ai, cleanText);
        if (emb) embedding = emb;
      }

      chunksToInsert.push({
        id: `${fileId}-c-${chunkIdx}`,
        fileId: fileId,
        fileName: newFile.name,
        content: cleanText,
        embedding
      });
      chunkIdx++;
    }

    newFile.chunksCount = chunksToInsert.length;
    await db.createFile(newFile);
    await db.createChunks(chunksToInsert);

    res.json({ success: true, file: newFile, totalChunks: chunksToInsert.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload document." });
  }
});

// Real PDF File Upload Ingestion
app.post("/api/knowledge-base/upload-file", authenticateToken, upload.single("file"), async (req: any, res: any) => {
  try {
    const file = req.file;
    const { category } = req.body;
    
    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    if (!category) {
      return res.status(400).json({ error: "Category is required." });
    }

    let textContent = "";
    if (file.mimetype === "application/pdf") {
      const parsedPdf = await pdfParse(file.buffer);
      textContent = parsedPdf.text;
    } else if (file.mimetype === "text/plain") {
      textContent = file.buffer.toString("utf-8");
    } else {
      return res.status(400).json({ error: "Unsupported file type. Please upload a PDF or TXT file." });
    }

    if (!textContent.trim()) {
      return res.status(400).json({ error: "Could not extract any text from file." });
    }

    const db = await connectDB();
    const fileId = `kb-custom-${Date.now()}`;
    
    // Split paragraphs into chunks
    const paragraphs = textContent
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    if (paragraphs.length === 0) {
      // Fallback: split by line
      const lines = textContent.split("\n").map(l => l.trim()).filter(l => l.length > 20);
      paragraphs.push(...lines);
    }

    const newFile: IKBFile = {
      id: fileId,
      name: file.originalname,
      category: category,
      size: `${Math.round(file.buffer.length / 1024) || 1} KB`,
      content: textContent,
      chunksCount: paragraphs.length
    };

    await db.createFile(newFile);

    const chunksToInsert: IKBChunk[] = [];
    let chunkIdx = 1;
    for (const p of paragraphs) {
      let embedding: number[] = [];
      if (ai) {
        const emb = await getEmbedding(ai, p);
        if (emb) embedding = emb;
      }

      chunksToInsert.push({
        id: `${fileId}-c-${chunkIdx}`,
        fileId: fileId,
        fileName: newFile.name,
        content: p,
        embedding
      });
      chunkIdx++;
    }

    await db.createChunks(chunksToInsert);

    res.json({ success: true, file: newFile, totalChunks: chunksToInsert.length });
  } catch (err) {
    console.error("PDF upload failure:", err);
    res.status(500).json({ error: "Failed to parse and ingest PDF document." });
  }
});

// Fetch Analytics Summary
app.get("/api/analytics", authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const analytics = await getAnalyticsSummary(db);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics." });
  }
});

// Submit Chat Simulator Message
app.post("/api/chat", authenticateToken, async (req: any, res: any) => {
  const { query } = req.body;
  const username = req.user.username;
  const userId = req.user.username; // Bind conversation to logged-in user

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  const start = Date.now();
  const db = await connectDB();

  try {
    // 1. Fetch chunks and retrieve top matches using Vector search
    const allChunks = await db.getChunks();
    const retrievedChunks = await searchVectorStore(query, allChunks, ai, 4);

    // Initial default trace
    let trace: any = {
      id: `tr-${Date.now()}`,
      query,
      timestamp: new Date().toISOString(),
      sentiment: 'neutral',
      sentimentScore: 0.0,
      detectedIntent: 'General Support',
      routedAgents: ['FAQ Agent'],
      retrievedChunks: retrievedChunks.map(c => ({
        fileName: c.fileName,
        content: c.content,
        score: c.score
      })),
      agentOutputs: {},
      finalResponse: ""
    };

    if (ai) {
      // 1. Intent Detection
      const intentPrompt = `You are a high-performance customer service Orchestrator. Analyze the query: "${query}".
      Determine:
      1. Primary Customer Intent.
      2. Sentiment ('positive', 'neutral', 'negative') and sentimentScore (-1.0 to 1.0).
      3. Routed Agents. Choose one or multiple from: "Billing Agent", "Technical Support Agent", "Product Agent", "Complaint Agent", "FAQ Agent".
         - Route to Billing Agent for: invoicing, refunds, subscriptions, fees, payments.
         - Route to Technical Support Agent for: Wi-Fi, logins, passwords, resets, factory settings, installation failures, app connectivity, physical hardware bugs.
         - Route to Product Agent for: product comparison, catalogs, specific hardware models, smart watch / earbud prices.
         - Route to Complaint Agent for: expressions of anger, threat of cancellation, poor ratings, or bad experiences.
         - Route to FAQ Agent for: standard contact information, hours of operations, basic support pathways.
      
      Respond strictly in JSON format matching this schema:
      {
        "detectedIntent": "General Summary",
        "sentiment": "neutral",
        "sentimentScore": 0.0,
        "routedAgents": ["FAQ Agent"]
      }`;

      const intentResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: intentPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedIntent: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              sentimentScore: { type: Type.NUMBER },
              routedAgents: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["detectedIntent", "sentiment", "sentimentScore", "routedAgents"]
          }
        }
      });

      const intentData = JSON.parse(intentResponse.text || "{}");
      trace.detectedIntent = intentData.detectedIntent;
      trace.sentiment = intentData.sentiment;
      trace.sentimentScore = intentData.sentimentScore;
      trace.routedAgents = intentData.routedAgents?.length > 0 ? intentData.routedAgents : ["FAQ Agent"];

      // 2. Persona-based Agent Execution
      const contextText = retrievedChunks.map(c => `[From Document: ${c.fileName}]: ${c.content}`).join("\n");
      const agentsPrompt = `You are simulated specialized AI Agents. Generate responses for the query: "${query}".
      Relevant Company Context Chunks:
      ${contextText}

      For each routed agent in: ${JSON.stringify(trace.routedAgents)}, generate their individual professional response.
      Only address topics that fall under the routed agent's jurisdiction. Reference the Company Context closely.
      
      Return a JSON object where keys are the Agent names, and the values are their specific responses.`;

      const agentsResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: agentsPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: trace.routedAgents.reduce((props: any, agentName: string) => {
              props[agentName] = { type: Type.STRING };
              return props;
            }, {})
          }
        }
      });

      trace.agentOutputs = JSON.parse(agentsResponse.text || "{}");

      // 3. Aggregate Synthesis
      const aggregatorPrompt = `You are the Customer Support Orchestrator and Response Aggregator.
      Assemble a final, cohesive, unified customer response.
      The customer's name is "${username}".
      The query was: "${query}".
      
      Specialized Agent Output Subcomponents:
      ${JSON.stringify(trace.agentOutputs)}
      
      Combine these inputs into a single elegant, empathetic, structured message. Avoid repetitive openings. Highlight clear troubleshooting or resolution steps, and address the customer professionally. Reference the retrieved company documents as the source of truth where helpful.`;

      const aggregatorResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: aggregatorPrompt,
        config: {
          systemInstruction: "You are TechMart Electronics' Lead Orchestrator AI. You blend technical precision and empathetic resolution.",
        }
      });

      trace.finalResponse = aggregatorResponse.text || "Could not synthesize agent outputs.";
    } else {
      // Fallback
      const fbClass = fallbackIntentDetection(query);
      trace.detectedIntent = fbClass.detectedIntent;
      trace.sentiment = fbClass.sentiment;
      trace.sentimentScore = fbClass.sentimentScore;
      trace.routedAgents = fbClass.routedAgents;

      const fbResult = fallbackResponseGenerator(query, trace.detectedIntent, trace.routedAgents);
      trace.agentOutputs = fbResult.outputs;
      trace.finalResponse = fbResult.finalResponse;
    }

    trace.responseTimeMs = Date.now() - start;
    trace.tokensUsed = Math.floor(Math.random() * 200) + 250;

    // Persist message in Conversation History
    let conv = await db.getActiveConversationByUser(userId);
    if (!conv) {
      conv = {
        id: `c-active-${Date.now()}`,
        userId,
        userName: username,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };
      await db.createConversation(conv);
    }

    const userMsgId = `m-user-${Date.now()}`;
    const assistantMsgId = `m-assistant-${Date.now()}`;

    const userMsg = {
      id: userMsgId,
      sender: "user" as const,
      text: query,
      timestamp: new Date().toISOString()
    };

    const assistantMsg = {
      id: assistantMsgId,
      sender: "assistant" as const,
      text: trace.finalResponse,
      timestamp: new Date().toISOString(),
      trace
    };

    const updatedMessages = [...conv.messages, userMsg, assistantMsg];
    
    // Auto-escalation trigger
    let status = conv.status;
    if (trace.sentiment === "negative" && trace.sentimentScore < -0.7) {
      status = "escalated";
    }

    await db.updateConversation(conv.id, {
      messages: updatedMessages,
      status,
      updatedAt: new Date().toISOString()
    });

    const analytics = await getAnalyticsSummary(db);
    res.json({
      conversationId: conv.id,
      userMessageId: userMsgId,
      assistantMessage: assistantMsg,
      analytics
    });
  } catch (err) {
    console.error("Chat failure:", err);
    res.status(500).json({ error: "Failed to process message." });
  }
});

// Provide Conversation Feedback (CSAT rating)
app.post("/api/chat/feedback", authenticateToken, async (req, res) => {
  const { conversationId, messageId, rating } = req.body;
  if (!conversationId || !messageId || !rating) {
    return res.status(400).json({ error: "Missing conversationId, messageId or rating." });
  }

  try {
    const db = await connectDB();
    const conv = await db.getConversationById(conversationId);
    
    if (conv) {
      const updatedMessages = conv.messages.map((m: any) => {
        if (m.id === messageId) {
          m.rating = rating;
        }
        return m;
      });

      let status = conv.status;
      if (rating >= 4 && conv.status === "active") {
        status = "resolved";
      }

      await db.updateConversation(conversationId, {
        messages: updatedMessages,
        status
      });

      const analytics = await getAnalyticsSummary(db);
      return res.json({ success: true, analytics });
    }

    res.status(404).json({ error: "Conversation not found." });
  } catch (err) {
    res.status(500).json({ error: "Failed to update feedback rating." });
  }
});

// Run AI-Simulated Batch
app.post("/api/simulation/run", authenticateToken, async (req, res) => {
  const sampleQueries = [
    { name: "John Doe", query: "Can you list the battery life of the wireless earbuds and smartwatch?" },
    { name: "Emma Watson", query: "The Soundbar subwoofer is blinking red and doesn't connect to my speaker." },
    { name: "Charlie Day", query: "I want to return my hardware, but I lost my receipts. Help!" },
    { name: "Sarah Connor", query: "Do you ship your smart television to Canada?" },
    { name: "Bruce Wayne", query: "I ordered yesterday but my premium discount did not get applied to my RoboVac!" }
  ];

  try {
    const db = await connectDB();
    let simulationList = sampleQueries;

    if (ai) {
      const synthPrompt = `Generate a list of 5 diverse customer support query objects representing typical TechMart Electronic users.
      Ensure we cover billing/refund requests, technical setup bugs (e.g. Wi-Fi sync, black screens, sound bar wireless sync issues), and feature queries.
      Give each user a realistic name, a detailed realistic customer question, and a primary intent category.
      
      Format as JSON matching this schema:
      [
        { "name": "User Name", "query": "The question content here" }
      ]`;

      const synthRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: synthPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                query: { type: Type.STRING }
              },
              required: ["name", "query"]
            }
          }
        }
      });

      const parsed = JSON.parse(synthRes.text || "[]");
      if (parsed?.length > 0) {
        simulationList = parsed;
      }
    }

    const allChunks = await db.getChunks();

    // Process each query
    for (const sim of simulationList) {
      const simUserId = `u-sim-${Math.floor(Math.random() * 9000) + 1000}`;
      const start = Date.now();
      const retrievedChunks = await searchVectorStore(sim.query, allChunks, ai, 3);

      let trace: any = {
        id: `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        query: sim.query,
        timestamp: new Date().toISOString(),
        sentiment: 'neutral',
        sentimentScore: 0.0,
        detectedIntent: 'Support Query',
        routedAgents: ['FAQ Agent'],
        retrievedChunks: retrievedChunks.map(c => ({
          fileName: c.fileName,
          content: c.content,
          score: c.score
        })),
        agentOutputs: {},
        finalResponse: "",
        responseTimeMs: 0
      };

      const fbClass = fallbackIntentDetection(sim.query);
      trace.detectedIntent = fbClass.detectedIntent;
      trace.sentiment = fbClass.sentiment;
      trace.sentimentScore = fbClass.sentimentScore;
      trace.routedAgents = fbClass.routedAgents;

      const result = fallbackResponseGenerator(sim.query, trace.detectedIntent, trace.routedAgents);
      trace.agentOutputs = result.outputs;
      trace.finalResponse = result.finalResponse;
      trace.responseTimeMs = Date.now() - start + 500;
      trace.tokensUsed = Math.floor(Math.random() * 150) + 180;

      const newConv: IConversation = {
        id: `c-sim-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: simUserId,
        userName: sim.name,
        status: trace.sentiment === "negative" ? "escalated" : "resolved",
        createdAt: new Date(Date.now() - Math.random() * 12 * 3600 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `m-user-${Date.now()}`,
            sender: "user",
            text: sim.query,
            timestamp: new Date().toISOString()
          },
          {
            id: `m-as-${Date.now()}`,
            sender: "assistant",
            text: trace.finalResponse,
            timestamp: new Date().toISOString(),
            rating: Math.floor(Math.random() * 2) + (trace.sentiment === "negative" ? 1 : 4),
            trace
          }
        ]
      };

      await db.createConversation(newConv);
    }

    const analytics = await getAnalyticsSummary(db);
    res.json({ success: true, analytics });
  } catch (err) {
    console.error("Simulation error:", err);
    res.status(500).json({ error: "Failed to run simulation." });
  }
});

// Reset simulation data
app.post("/api/simulation/reset", authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    await db.clearConversationsExceptPreset(["c-101", "c-102"]);
    const analytics = await getAnalyticsSummary(db);
    res.json({ success: true, analytics });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset simulation." });
  }
});

// ----------------------------------------------------
// Mounting Vite / Build Pipelines
// ----------------------------------------------------

async function startServer() {
  const db = await connectDB();
  await seedDatabase(db);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Multi-Agent Server running on http://localhost:${PORT}`);
  });
}

startServer();
