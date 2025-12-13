import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import path from "path";
import notesRouter from "./api/notes.js";
import uploadRouter from "./api/upload.js";

// 環境変数読み込み
config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());

// 静的ファイル配信（アップロードされた画像）
const UPLOAD_DIR = path.join(process.cwd(), "data", "attachments");
app.use("/api/attachments", express.static(UPLOAD_DIR));

// APIルート
app.use("/api/notes", notesRouter);
app.use("/api/upload", uploadRouter);

// ヘルスチェック
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api/health`);
});

// グレースフルシャットダウン
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
