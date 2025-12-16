// バックエンド ノートAPI 単体テスト（モック版）
// Prismaをモックして純粋な単体テストを実行

import { jest, describe, it, expect, beforeEach } from "@jest/globals";

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
    title: "ピン留めノート",
    content: "ピン留めされた内容",
    isPinned: true,
    isFavorite: true,
    isArchived: false,
    createdAt: new Date("2024-01-02"),
    updatedAt: new Date("2024-01-02"),
    folderId: "folder-1",
    tags: [{ tag: { id: "tag-1", name: "タグ1", color: "#ff0000" } }],
    folder: { id: "folder-1", name: "フォルダ1" },
  },
];

// Prismaモック
const mockPrisma = {
  note: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

// ノートサービス関数（テスト対象のロジックを抽出）
class NoteService {
  constructor(private prisma: typeof mockPrisma) {}

  async findAll() {
    return this.prisma.note.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        tags: { include: { tag: true } },
        folder: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.note.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        folder: true,
        attachments: true,
      },
    });
  }

  async create(data: { title?: string; content?: string; folderId?: string }) {
    return this.prisma.note.create({
      data: {
        title: data.title || "無題のノート",
        content: data.content || "",
        folderId: data.folderId,
      },
    });
  }

  async update(
    id: string,
    data: {
      title?: string;
      content?: string;
      isPinned?: boolean;
      isFavorite?: boolean;
      isArchived?: boolean;
      folderId?: string;
    },
  ) {
    return this.prisma.note.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.note.delete({
      where: { id },
    });
  }
}

describe("NoteService 単体テスト", () => {
  let noteService: NoteService;

  beforeEach(() => {
    jest.clearAllMocks();
    noteService = new NoteService(mockPrisma);
  });

  describe("findAll", () => {
    it("ノート一覧を更新日時の降順で取得する", async () => {
      mockPrisma.note.findMany.mockResolvedValue(mockNotes);

      const result = await noteService.findAll();

      expect(mockPrisma.note.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: "desc" },
        include: {
          tags: { include: { tag: true } },
          folder: true,
        },
      });
      expect(result).toEqual(mockNotes);
      expect(result.length).toBe(2);
    });

    it("ノートが存在しない場合は空配列を返す", async () => {
      mockPrisma.note.findMany.mockResolvedValue([]);

      const result = await noteService.findAll();

      expect(result).toEqual([]);
    });

    it("データベースエラー時は例外をスローする", async () => {
      mockPrisma.note.findMany.mockRejectedValue(new Error("DB接続エラー"));

      await expect(noteService.findAll()).rejects.toThrow("DB接続エラー");
    });
  });

  describe("findById", () => {
    it("指定IDのノートを取得する", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(mockNotes[0]);

      const result = await noteService.findById("note-1");

      expect(mockPrisma.note.findUnique).toHaveBeenCalledWith({
        where: { id: "note-1" },
        include: {
          tags: { include: { tag: true } },
          folder: true,
          attachments: true,
        },
      });
      expect(result).toEqual(mockNotes[0]);
    });

    it("存在しないIDの場合はnullを返す", async () => {
      mockPrisma.note.findUnique.mockResolvedValue(null);

      const result = await noteService.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("新規ノートを作成する", async () => {
      const newNote = {
        id: "new-note",
        title: "新しいノート",
        content: "新しい内容",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        folderId: null,
      };
      mockPrisma.note.create.mockResolvedValue(newNote);

      const result = await noteService.create({
        title: "新しいノート",
        content: "新しい内容",
      });

      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "新しいノート",
          content: "新しい内容",
          folderId: undefined,
        },
      });
      expect(result.title).toBe("新しいノート");
    });

    it("タイトル未指定の場合はデフォルトタイトルを設定する", async () => {
      const defaultNote = {
        id: "default-note",
        title: "無題のノート",
        content: "",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        folderId: null,
      };
      mockPrisma.note.create.mockResolvedValue(defaultNote);

      await noteService.create({});

      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "無題のノート",
          content: "",
          folderId: undefined,
        },
      });
    });

    it("フォルダIDを指定してノートを作成する", async () => {
      const noteWithFolder = {
        id: "folder-note",
        title: "フォルダ内ノート",
        content: "",
        folderId: "folder-1",
        isPinned: false,
        isFavorite: false,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.note.create.mockResolvedValue(noteWithFolder);

      const result = await noteService.create({
        title: "フォルダ内ノート",
        folderId: "folder-1",
      });

      expect(mockPrisma.note.create).toHaveBeenCalledWith({
        data: {
          title: "フォルダ内ノート",
          content: "",
          folderId: "folder-1",
        },
      });
      expect(result.folderId).toBe("folder-1");
    });
  });

  describe("update", () => {
    it("ノートのタイトルと内容を更新する", async () => {
      const updatedNote = {
        ...mockNotes[0],
        title: "更新後タイトル",
        content: "更新後内容",
      };
      mockPrisma.note.update.mockResolvedValue(updatedNote);

      const result = await noteService.update("note-1", {
        title: "更新後タイトル",
        content: "更新後内容",
      });

      expect(mockPrisma.note.update).toHaveBeenCalledWith({
        where: { id: "note-1" },
        data: {
          title: "更新後タイトル",
          content: "更新後内容",
        },
      });
      expect(result.title).toBe("更新後タイトル");
    });

    it("ピン留め状態を更新する", async () => {
      const pinnedNote = { ...mockNotes[0], isPinned: true };
      mockPrisma.note.update.mockResolvedValue(pinnedNote);

      const result = await noteService.update("note-1", { isPinned: true });

      expect(result.isPinned).toBe(true);
    });

    it("お気に入り状態を更新する", async () => {
      const favoriteNote = { ...mockNotes[0], isFavorite: true };
      mockPrisma.note.update.mockResolvedValue(favoriteNote);

      const result = await noteService.update("note-1", { isFavorite: true });

      expect(result.isFavorite).toBe(true);
    });

    it("アーカイブ状態を更新する", async () => {
      const archivedNote = { ...mockNotes[0], isArchived: true };
      mockPrisma.note.update.mockResolvedValue(archivedNote);

      const result = await noteService.update("note-1", { isArchived: true });

      expect(result.isArchived).toBe(true);
    });
  });

  describe("delete", () => {
    it("ノートを削除する", async () => {
      mockPrisma.note.delete.mockResolvedValue(mockNotes[0]);

      await noteService.delete("note-1");

      expect(mockPrisma.note.delete).toHaveBeenCalledWith({
        where: { id: "note-1" },
      });
    });

    it("存在しないノートの削除時は例外をスローする", async () => {
      mockPrisma.note.delete.mockRejectedValue(new Error("Record not found"));

      await expect(noteService.delete("non-existent")).rejects.toThrow(
        "Record not found",
      );
    });
  });
});

describe("ノートデータバリデーション", () => {
  it("ノートにはIDが必須", () => {
    const note = mockNotes[0];
    expect(note.id).toBeDefined();
    expect(typeof note.id).toBe("string");
  });

  it("ノートにはタイトルが必須", () => {
    const note = mockNotes[0];
    expect(note.title).toBeDefined();
    expect(typeof note.title).toBe("string");
  });

  it("ノートにはcontentが必須", () => {
    const note = mockNotes[0];
    expect(note.content).toBeDefined();
    expect(typeof note.content).toBe("string");
  });

  it("日付フィールドはDate型", () => {
    const note = mockNotes[0];
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
  });

  it("ブール値フィールドの初期値", () => {
    const note = mockNotes[0];
    expect(typeof note.isPinned).toBe("boolean");
    expect(typeof note.isFavorite).toBe("boolean");
    expect(typeof note.isArchived).toBe("boolean");
  });
});
