/**
 * API クライアント設定
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

/**
 * APIリクエストのレスポンス型
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

/**
 * ノート一覧取得のクエリパラメータ
 */
export interface NotesQueryParams {
  sortBy?: "createdAt" | "updatedAt" | "title";
  order?: "asc" | "desc";
  search?: string;
  folderId?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
}

/**
 * API クライアント
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * GET リクエスト
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  }

  /**
   * POST リクエスト
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return response.json();
  }

  /**
   * PUT リクエスト
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return response.json();
  }

  /**
   * DELETE リクエスト
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.json();
  }

  /**
   * ファイルアップロード
   */
  async upload<T>(
    endpoint: string,
    file: File,
    additionalData?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append("file", file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  }
}

// シングルトン API クライアントインスタンス
export const api = new ApiClient(API_BASE_URL);

/**
 * Notes API
 */
export const notesApi = {
  /**
   * ノート一覧取得
   */
  getAll: (params?: NotesQueryParams) =>
    api.get<import("../types/note").Note[]>(
      "/notes",
      params as Record<string, unknown>,
    ),

  /**
   * ノート単体取得
   */
  getById: (id: string) =>
    api.get<import("../types/note").Note>(`/notes/${id}`),

  /**
   * ノート作成
   */
  create: (data: { title?: string; content?: string; folderId?: string }) =>
    api.post<import("../types/note").Note>("/notes", data),

  /**
   * ノート更新
   */
  update: (id: string, data: Partial<import("../types/note").Note>) =>
    api.put<import("../types/note").Note>(`/notes/${id}`, data),

  /**
   * ノート削除
   */
  delete: (id: string) => api.delete<void>(`/notes/${id}`),
};

/**
 * Upload API
 */
export const uploadApi = {
  /**
   * 画像アップロード
   */
  uploadImage: (file: File, noteId?: string) =>
    api.upload<import("../types/note").Attachment>(
      "/upload",
      file,
      noteId ? { noteId } : undefined,
    ),
};

/**
 * Folders API
 */
export const foldersApi = {
  /**
   * フォルダ一覧取得
   */
  getAll: () => api.get<import("../types/folder").Folder[]>("/folders"),

  /**
   * フォルダ単体取得
   */
  getById: (id: string) =>
    api.get<import("../types/folder").Folder>(`/folders/${id}`),

  /**
   * フォルダ作成
   */
  create: (data: { name: string; parentId?: string | null }) =>
    api.post<import("../types/folder").Folder>("/folders", data),

  /**
   * フォルダ更新
   */
  update: (id: string, data: { name: string; parentId?: string | null }) =>
    api.put<import("../types/folder").Folder>(`/folders/${id}`, data),

  /**
   * フォルダ削除
   */
  delete: (id: string) => api.delete<void>(`/folders/${id}`),

  /**
   * ノートをフォルダに移動
   */
  moveNoteToFolder: (noteId: string, folderId: string | null) =>
    api.put<void>(`/notes/${noteId}/move`, { folderId }),
};

/**
 * Tags API
 */
export const tagsApi = {
  /**
   * タグ一覧取得
   */
  getAll: () => api.get<import("../types/tag").Tag[]>("/tags"),

  /**
   * タグ単体取得
   */
  getById: (id: string) => api.get<import("../types/tag").Tag>(`/tags/${id}`),

  /**
   * タグ作成
   */
  create: (data: import("../types/tag").CreateTagData) =>
    api.post<import("../types/tag").Tag>("/tags", data),

  /**
   * タグ更新
   */
  update: (id: string, data: import("../types/tag").UpdateTagData) =>
    api.put<import("../types/tag").Tag>(`/tags/${id}`, data),

  /**
   * タグ削除
   */
  delete: (id: string) => api.delete<void>(`/tags/${id}`),

  /**
   * ノートにタグを付与
   */
  addToNote: (noteId: string, tagId: string) =>
    api.post<void>(`/notes/${noteId}/tags/${tagId}`),

  /**
   * ノートからタグを削除
   */
  removeFromNote: (noteId: string, tagId: string) =>
    api.delete<void>(`/notes/${noteId}/tags/${tagId}`),
};

/**
 * Export API
 */
export const exportApi = {
  /**
   * Markdown形式でエクスポート
   */
  markdown: (noteId: string) => `/api/export/markdown/${noteId}`,

  /**
   * HTML形式でエクスポート
   */
  html: (noteId: string) => `/api/export/html/${noteId}`,

  /**
   * PDF形式でエクスポート
   */
  pdf: (noteId: string) => `/api/export/pdf/${noteId}`,

  /**
   * JSON形式でエクスポート（バックアップ用）
   */
  json: (noteId: string) => `/api/export/json/${noteId}`,
};

/**
 * Import API
 */
export const importApi = {
  /**
   * バッチインポート（複数ファイル）
   * @param files - インポートするファイル配列
   * @param folderId - インポート先フォルダID（オプション）
   * @param addImportTag - インポートタグを追加するか
   */
  batch: async (
    files: File[],
    folderId?: string | null,
    addImportTag: boolean = true,
  ) => {
    const formData = new FormData();

    // ファイルを追加
    files.forEach((file) => {
      formData.append("files", file);
    });

    // フォルダIDを追加
    if (folderId) {
      formData.append("folderId", folderId);
    }

    // タグオプションを追加
    formData.append("addImportTag", addImportTag.toString());

    const response = await fetch(`${API_BASE_URL}/import/batch`, {
      method: "POST",
      body: formData,
    });

    return response.json();
  },
};

export default api;
