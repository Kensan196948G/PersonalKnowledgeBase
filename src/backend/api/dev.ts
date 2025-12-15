import { Router } from "express";

const router = Router();

/**
 * フロントエンド状態リセットAPI
 * 開発用: ブラウザのLocalStorage、SessionStorage、IndexedDBをクリアするためのエンドポイント
 */
router.get("/reset-frontend", (_req, res) => {
  res.json({
    success: true,
    message: "Frontend reset initiated",
    instructions: {
      localStorage: "clear",
      sessionStorage: "clear",
      indexedDB: "clear",
      zustand: "clear",
    },
    redirect: "/",
    timestamp: new Date().toISOString(),
  });
});

/**
 * 開発用ステータス確認
 */
router.get("/status", (_req, res) => {
  res.json({
    success: true,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      resetFrontend: "/api/dev/reset-frontend",
      status: "/api/dev/status",
    },
  });
});

export default router;
