import mongoose, { Schema, Document } from "mongoose";
import fs from "fs";
import path from "path";

// ----------------------------------------------------
// Database Interfaces
// ----------------------------------------------------

export interface IUser {
  username: string;
  passwordHash: string;
  role: string;
  createdAt: Date;
}

export interface IKBFile {
  id: string;
  name: string;
  category: string;
  size: string;
  content: string;
  chunksCount: number;
}

export interface IKBChunk {
  id: string;
  fileId: string;
  fileName: string;
  content: string;
  embedding?: number[];
}

export interface IMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  rating?: number;
  trace?: any;
}

export interface IConversation {
  id: string;
  userId: string;
  userName: string;
  status: "active" | "resolved" | "escalated";
  createdAt: string;
  updatedAt: string;
  messages: IMessage[];
}

// ----------------------------------------------------
// Mongoose Schema Definitions
// ----------------------------------------------------

const UserSchema = new Schema<IUser & Document>({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now }
});

const KBFileSchema = new Schema<IKBFile & Document>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  size: { type: String, required: true },
  content: { type: String, required: true },
  chunksCount: { type: Number, required: true }
});

const KBChunkSchema = new Schema<IKBChunk & Document>({
  id: { type: String, required: true, unique: true },
  fileId: { type: String, required: true },
  fileName: { type: String, required: true },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] }
});

const MessageSchema = new Schema<IMessage>({
  id: { type: String, required: true },
  sender: { type: String, enum: ["user", "assistant", "system"], required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true },
  rating: { type: Number },
  trace: { type: Schema.Types.Mixed }
});

const ConversationSchema = new Schema<IConversation & Document>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  status: { type: String, enum: ["active", "resolved", "escalated"], required: true },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  messages: { type: [MessageSchema], default: [] }
});

const MongoUserModel = mongoose.model<IUser & Document>("User", UserSchema);
const MongoKBFileModel = mongoose.model<IKBFile & Document>("KBFile", KBFileSchema);
const MongoKBChunkModel = mongoose.model<IKBChunk & Document>("KBChunk", KBChunkSchema);
const MongoConversationModel = mongoose.model<IConversation & Document>("Conversation", ConversationSchema);

// ----------------------------------------------------
// Database Adapter Interface
// ----------------------------------------------------

export interface IDatabaseAdapter {
  isMongo: boolean;
  
  // Users
  getUserByUsername(username: string): Promise<IUser | null>;
  createUser(user: Omit<IUser, "createdAt">): Promise<IUser>;
  
  // Files
  getFiles(): Promise<IKBFile[]>;
  createFile(file: IKBFile): Promise<IKBFile>;
  
  // Chunks
  getChunks(): Promise<IKBChunk[]>;
  createChunk(chunk: IKBChunk): Promise<IKBChunk>;
  createChunks(chunks: IKBChunk[]): Promise<IKBChunk[]>;
  
  // Conversations
  getConversations(): Promise<IConversation[]>;
  getConversationById(id: string): Promise<IConversation | null>;
  getActiveConversationByUser(userId: string): Promise<IConversation | null>;
  createConversation(conv: IConversation): Promise<IConversation>;
  updateConversation(id: string, updates: Partial<IConversation>): Promise<IConversation | null>;
  clearConversationsExceptPreset(presetIds: string[]): Promise<void>;
}

// ----------------------------------------------------
// Mongoose / MongoDB Adapter Implementation
// ----------------------------------------------------

class MongoAdapter implements IDatabaseAdapter {
  isMongo = true;

  async getUserByUsername(username: string): Promise<IUser | null> {
    return MongoUserModel.findOne({ username }).lean();
  }

  async createUser(user: Omit<IUser, "createdAt">): Promise<IUser> {
    const newUser = new MongoUserModel(user);
    const saved = await newUser.save();
    return saved.toObject();
  }

  async getFiles(): Promise<IKBFile[]> {
    return MongoKBFileModel.find().lean();
  }

  async createFile(file: IKBFile): Promise<IKBFile> {
    const newFile = new MongoKBFileModel(file);
    const saved = await newFile.save();
    return saved.toObject();
  }

  async getChunks(): Promise<IKBChunk[]> {
    return MongoKBChunkModel.find().lean();
  }

  async createChunk(chunk: IKBChunk): Promise<IKBChunk> {
    const newChunk = new MongoKBChunkModel(chunk);
    const saved = await newChunk.save();
    return saved.toObject();
  }

  async createChunks(chunks: IKBChunk[]): Promise<IKBChunk[]> {
    const savedChunks = await MongoKBChunkModel.insertMany(chunks);
    return savedChunks.map(c => c.toObject());
  }

  async getConversations(): Promise<IConversation[]> {
    return MongoConversationModel.find().lean();
  }

  async getConversationById(id: string): Promise<IConversation | null> {
    return MongoConversationModel.findOne({ id }).lean();
  }

  async getActiveConversationByUser(userId: string): Promise<IConversation | null> {
    return MongoConversationModel.findOne({ userId, status: "active" }).lean();
  }

  async createConversation(conv: IConversation): Promise<IConversation> {
    const newConv = new MongoConversationModel(conv);
    const saved = await newConv.save();
    return saved.toObject();
  }

  async updateConversation(id: string, updates: Partial<IConversation>): Promise<IConversation | null> {
    return MongoConversationModel.findOneAndUpdate({ id }, { $set: updates }, { new: true }).lean();
  }

  async clearConversationsExceptPreset(presetIds: string[]): Promise<void> {
    await MongoConversationModel.deleteMany({ id: { $nin: presetIds } });
  }
}

// ----------------------------------------------------
// File-based JSON Database Adapter Implementation (Fallback)
// ----------------------------------------------------

class LocalJSONAdapter implements IDatabaseAdapter {
  isMongo = false;
  private dataDir = path.join(process.cwd(), "data");
  
  private usersFile = path.join(this.dataDir, "users.json");
  private filesFile = path.join(this.dataDir, "kb_files.json");
  private chunksFile = path.join(this.dataDir, "kb_chunks.json");
  private conversationsFile = path.join(this.dataDir, "conversations.json");

  constructor() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.ensureFile(this.usersFile, []);
    this.ensureFile(this.filesFile, []);
    this.ensureFile(this.chunksFile, []);
    this.ensureFile(this.conversationsFile, []);
  }

  private ensureFile(filePath: string, defaultData: any) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
    }
  }

  private readJSON<T>(filePath: string): T {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch {
      return [] as unknown as T;
    }
  }

  private writeJSON<T>(filePath: string, data: T): void {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    const users = this.readJSON<IUser[]>(this.usersFile);
    return users.find(u => u.username === username) || null;
  }

  async createUser(user: Omit<IUser, "createdAt">): Promise<IUser> {
    const users = this.readJSON<any[]>(this.usersFile);
    const newUser = { ...user, createdAt: new Date() };
    users.push(newUser);
    this.writeJSON(this.usersFile, users);
    return newUser;
  }

  async getFiles(): Promise<IKBFile[]> {
    return this.readJSON<IKBFile[]>(this.filesFile);
  }

  async createFile(file: IKBFile): Promise<IKBFile> {
    const files = this.readJSON<IKBFile[]>(this.filesFile);
    files.push(file);
    this.writeJSON(this.filesFile, files);
    return file;
  }

  async getChunks(): Promise<IKBChunk[]> {
    return this.readJSON<IKBChunk[]>(this.chunksFile);
  }

  async createChunk(chunk: IKBChunk): Promise<IKBChunk> {
    const chunks = this.readJSON<IKBChunk[]>(this.chunksFile);
    chunks.push(chunk);
    this.writeJSON(this.chunksFile, chunks);
    return chunk;
  }

  async createChunks(chunks: IKBChunk[]): Promise<IKBChunk[]> {
    const currentChunks = this.readJSON<IKBChunk[]>(this.chunksFile);
    const updated = [...currentChunks, ...chunks];
    this.writeJSON(this.chunksFile, updated);
    return chunks;
  }

  async getConversations(): Promise<IConversation[]> {
    return this.readJSON<IConversation[]>(this.conversationsFile);
  }

  async getConversationById(id: string): Promise<IConversation | null> {
    const convs = this.readJSON<IConversation[]>(this.conversationsFile);
    return convs.find(c => c.id === id) || null;
  }

  async getActiveConversationByUser(userId: string): Promise<IConversation | null> {
    const convs = this.readJSON<IConversation[]>(this.conversationsFile);
    return convs.find(c => c.userId === userId && c.status === "active") || null;
  }

  async createConversation(conv: IConversation): Promise<IConversation> {
    const convs = this.readJSON<IConversation[]>(this.conversationsFile);
    convs.push(conv);
    this.writeJSON(this.conversationsFile, convs);
    return conv;
  }

  async updateConversation(id: string, updates: Partial<IConversation>): Promise<IConversation | null> {
    const convs = this.readJSON<IConversation[]>(this.conversationsFile);
    const idx = convs.findIndex(c => c.id === id);
    if (idx === -1) return null;
    convs[idx] = { ...convs[idx], ...updates };
    this.writeJSON(this.conversationsFile, convs);
    return convs[idx];
  }

  async clearConversationsExceptPreset(presetIds: string[]): Promise<void> {
    const convs = this.readJSON<IConversation[]>(this.conversationsFile);
    const filtered = convs.filter(c => presetIds.includes(c.id));
    this.writeJSON(this.conversationsFile, filtered);
  }
}

// ----------------------------------------------------
// Database Manager - Connection & Fallback Orchestrator
// ----------------------------------------------------

let dbAdapter: IDatabaseAdapter;

export async function connectDB(): Promise<IDatabaseAdapter> {
  if (dbAdapter) return dbAdapter;

  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/support_rag";
  
  try {
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    // Connect with a 3-second timeout so we don't hang if Mongo isn't running
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log("🚀 MongoDB Connected successfully!");
    dbAdapter = new MongoAdapter();
  } catch (err) {
    console.warn("⚠️ MongoDB connection failed. Falling back to local file storage.");
    dbAdapter = new LocalJSONAdapter();
  }
  
  return dbAdapter;
}
