import express, { Express } from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// ヘルスチェックエンドポイントを持つExpressアプリを作成
function createApp(prisma: PrismaClient): Express {
  const app = express();
  app.use(express.json());

  // ヘルスチェックエンドポイント
  app.get("/api/health", async (_req, res) => {
    try {
      // データベース接続確認（簡易的なクエリ）
      await prisma.$queryRaw`SELECT 1`;

      res.json({
        status: "ok",
        database: "connected",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return app;
}

// PrismaClientのモック
const mockPrisma = {
  $queryRaw: jest.fn(),
} as unknown as PrismaClient;

describe("Backend Health Check", () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp(mockPrisma);
  });

  describe("GET /api/health", () => {
    it("should return status ok when database is connected", async () => {
      // データベース接続成功をシミュレート
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ "1": 1 }]);

      const response = await request(app).get("/api/health");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("ok");
      expect(response.body.database).toBe("connected");
      expect(response.body.timestamp).toBeDefined();
    });

    it("should return error status when database is disconnected", async () => {
      // データベース接続失敗をシミュレート
      (mockPrisma.$queryRaw as jest.Mock).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const response = await request(app).get("/api/health");

      expect(response.status).toBe(500);
      expect(response.body.status).toBe("error");
      expect(response.body.database).toBe("disconnected");
      expect(response.body.error).toBe("Database connection failed");
    });
  });

  describe("API Response Format", () => {
    it("should return JSON content type", async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([{ "1": 1 }]);

      const response = await request(app).get("/api/health");
      const contentType = response.headers["content-type"];

      expect(contentType).toContain("application/json");
    });
  });
});
