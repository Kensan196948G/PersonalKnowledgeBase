import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { prisma } from "./db.js";
import path from "path";
import notesRouter from "./api/notes.js";
import uploadRouter from "./api/upload.js";
import tagsRouter from "./api/tags.js";
import foldersRouter from "./api/folders.js";
import exportRouter from "./api/export.js";
import importRouter from "./api/import.js";
import linksRouter from "./api/links.js";
import aiSummarizeRouter from "./api/ai/summarize.js";

// 環境変数読み込み
config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ミドルウェア
// ネットワークIPアドレスからのアクセスも許可
const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.0.187:5173", // ネットワークIPアドレス
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // originがundefined（サーバー間通信など）または許可リストに含まれる場合は許可
      if (
        !origin ||
        allowedOrigins.some((allowed) => origin.startsWith(allowed as string))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
app.use(express.json());

// 静的ファイル配信（アップロードされた画像）
const UPLOAD_DIR = path.join(process.cwd(), "data", "attachments");
app.use("/api/attachments", express.static(UPLOAD_DIR));

// APIルート
app.use("/api/notes", notesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/tags", tagsRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/export", exportRouter);
app.use("/api/import", importRouter);
app.use("/api/links", linksRouter);
app.use("/api/ai", aiSummarizeRouter);

// ヘルスチェック
app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (_error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

// サーバー起動（0.0.0.0でリッスン - ネットワークアクセス許可）
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on:`);
  console.log(`   - Local:   http://localhost:${PORT}`);
  console.log(`   - Network: http://192.168.0.187:${PORT}`);
  console.log(`📚 API Health: http://localhost:${PORT}/api/health`);
});

// グレースフルシャットダウン
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await prisma.$disconnect();
  process.exit(0);
});
