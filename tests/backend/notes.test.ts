import express, { Express } from "express";
import request from "supertest";
import { PrismaClient } from "@prisma/client";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";

// Expressアプリのセットアップ関数
function createApp(prisma: PrismaClient): Express {
  const app = express();
  app.use(express.json());

  // ノート一覧取得
  app.get("/api/notes", async (_req, res) => {
    try {
      const notes = await prisma.note.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          tags: { include: { tag: true } },
          folder: true,
        },
      });
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  // ノート作成
  app.post("/api/notes", async (req, res) => {
    try {
      const { title, content, folderId } = req.body;
      const note = await prisma.note.create({
        data: {
          title: title || "無題のノート",
          content: content || "",
          folderId,
        },
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  // ノート取得（単一）
  app.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await prisma.note.findUnique({
        where: { id: req.params.id },
        include: {
          tags: { include: { tag: true } },
          folder: true,
          attachments: true,
        },
      });
      if (!note) {
        return res.status(404).json({ error: "Note not found" });
      }
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch note" });
    }
  });

  // ノート更新
  app.put("/api/notes/:id", async (req, res) => {
    try {
      const { title, content, isPinned, isFavorite, isArchived, folderId } =
        req.body;
      const note = await prisma.note.update({
        where: { id: req.params.id },
        data: {
          title,
          content,
          isPinned,
          isFavorite,
          isArchived,
          folderId,
        },
      });
      res.json(note);
    } catch (error) {
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  // ノート削除
  app.delete("/api/notes/:id", async (req, res) => {
    try {
      await prisma.note.delete({
        where: { id: req.params.id },
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  return app;
}

// モックデータ
const mockNotes = [
  {
    id: "note-1",
    title: "テストノート1",
    content: "テスト内容1",
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    folderId: null,
    tags: [],
    folder: null,
  },
  {
    id: "note-2",
    title: "テストノート2",
    content: "テスト内容2",
    isPinned: true,
    isFavorite: false,
    isArchived: false,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
    folderId: null,
    tags: [],
    folder: null,
  },
];

// Prismaモック
const mockPrismaClient = {
  note: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
} as unknown as PrismaClient;

describe("Notes API", () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp(mockPrismaClient);
  });

  describe("GET /api/notes", () => {
    it("should return array of notes", async () => {
      mockPrismaClient.note.findMany = jest.fn().mockResolvedValue(mockNotes);

      const response = await request(app).get("/api/notes");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe("テストノート1");
    });

    it("should return empty array when no notes exist", async () => {
      mockPrismaClient.note.findMany = jest.fn().mockResolvedValue([]);

      const response = await request(app).get("/api/notes");

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it("should return 500 on database error", async () => {
      mockPrismaClient.note.findMany = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const response = await request(app).get("/api/notes");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to fetch notes");
    });
  });

  describe("POST /api/notes", () => {
    it("should create a new note", async () => {
      const newNote = {
        id: "note-3",
        title: "新しいノート",
        content: "新しい内容",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        folderId: null,
      };
      mockPrismaClient.note.create = jest.fn().mockResolvedValue(newNote);

      const response = await request(app)
        .post("/api/notes")
        .send({ title: "新しいノート", content: "新しい内容" });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe("note-3");
      expect(response.body.title).toBe("新しいノート");
      expect(response.body.content).toBe("新しい内容");
      expect(mockPrismaClient.note.create).toHaveBeenCalledWith({
        data: {
          title: "新しいノート",
          content: "新しい内容",
          folderId: undefined,
        },
      });
    });

    it("should create note with default title when not provided", async () => {
      const defaultNote = {
        id: "note-4",
        title: "無題のノート",
        content: "",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        folderId: null,
      };
      mockPrismaClient.note.create = jest.fn().mockResolvedValue(defaultNote);

      const response = await request(app).post("/api/notes").send({});

      expect(response.status).toBe(201);
      expect(response.body.title).toBe("無題のノート");
      expect(response.body.content).toBe("");
    });

    it("should create note with folder ID", async () => {
      const noteWithFolder = {
        id: "note-5",
        title: "フォルダ内ノート",
        content: "",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        folderId: "folder-1",
      };
      mockPrismaClient.note.create = jest
        .fn()
        .mockResolvedValue(noteWithFolder);

      const response = await request(app)
        .post("/api/notes")
        .send({ title: "フォルダ内ノート", folderId: "folder-1" });

      expect(response.status).toBe(201);
      expect(response.body.folderId).toBe("folder-1");
    });

    it("should return 500 on database error", async () => {
      mockPrismaClient.note.create = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const response = await request(app)
        .post("/api/notes")
        .send({ title: "テスト" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to create note");
    });
  });

  describe("GET /api/notes/:id", () => {
    it("should return a specific note", async () => {
      const noteWithDetails = {
        ...mockNotes[0],
        attachments: [],
      };
      mockPrismaClient.note.findUnique = jest
        .fn()
        .mockResolvedValue(noteWithDetails);

      const response = await request(app).get("/api/notes/note-1");

      expect(response.status).toBe(200);
      expect(response.body.id).toBe("note-1");
      expect(response.body.title).toBe("テストノート1");
    });

    it("should return 404 for non-existent note", async () => {
      mockPrismaClient.note.findUnique = jest.fn().mockResolvedValue(null);

      const response = await request(app).get("/api/notes/non-existent-id");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error", "Note not found");
    });

    it("should return 500 on database error", async () => {
      mockPrismaClient.note.findUnique = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const response = await request(app).get("/api/notes/note-1");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to fetch note");
    });
  });

  describe("PUT /api/notes/:id", () => {
    it("should update a note", async () => {
      const updatedNote = {
        ...mockNotes[0],
        title: "更新されたタイトル",
        content: "更新された内容",
      };
      mockPrismaClient.note.update = jest.fn().mockResolvedValue(updatedNote);

      const response = await request(app)
        .put("/api/notes/note-1")
        .send({ title: "更新されたタイトル", content: "更新された内容" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("更新されたタイトル");
      expect(response.body.content).toBe("更新された内容");
    });

    it("should update note pin status", async () => {
      const pinnedNote = { ...mockNotes[0], isPinned: true };
      mockPrismaClient.note.update = jest.fn().mockResolvedValue(pinnedNote);

      const response = await request(app)
        .put("/api/notes/note-1")
        .send({ isPinned: true });

      expect(response.status).toBe(200);
      expect(response.body.isPinned).toBe(true);
    });

    it("should update note favorite status", async () => {
      const favoriteNote = { ...mockNotes[0], isFavorite: true };
      mockPrismaClient.note.update = jest.fn().mockResolvedValue(favoriteNote);

      const response = await request(app)
        .put("/api/notes/note-1")
        .send({ isFavorite: true });

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
    });

    it("should update note archive status", async () => {
      const archivedNote = { ...mockNotes[0], isArchived: true };
      mockPrismaClient.note.update = jest.fn().mockResolvedValue(archivedNote);

      const response = await request(app)
        .put("/api/notes/note-1")
        .send({ isArchived: true });

      expect(response.status).toBe(200);
      expect(response.body.isArchived).toBe(true);
    });

    it("should return 500 on database error", async () => {
      mockPrismaClient.note.update = jest
        .fn()
        .mockRejectedValue(new Error("DB error"));

      const response = await request(app)
        .put("/api/notes/note-1")
        .send({ title: "更新" });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to update note");
    });
  });

  describe("DELETE /api/notes/:id", () => {
    it("should delete a note", async () => {
      mockPrismaClient.note.delete = jest.fn().mockResolvedValue(mockNotes[0]);

      const response = await request(app).delete("/api/notes/note-1");

      expect(response.status).toBe(204);
      expect(mockPrismaClient.note.delete).toHaveBeenCalledWith({
        where: { id: "note-1" },
      });
    });

    it("should return 500 on database error", async () => {
      mockPrismaClient.note.delete = jest
        .fn()
        .mockRejectedValue(new Error("Record not found"));

      const response = await request(app).delete("/api/notes/non-existent");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to delete note");
    });
  });
});
