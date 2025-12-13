/**
 * API クライアント設定
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * APIリクエストのレスポンス型
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  count?: number
}

/**
 * ノート一覧取得のクエリパラメータ
 */
export interface NotesQueryParams {
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  order?: 'asc' | 'desc'
  search?: string
  folderId?: string
  isPinned?: boolean
  isFavorite?: boolean
  isArchived?: boolean
}

/**
 * API クライアント
 */
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * GET リクエスト
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response.json()
  }

  /**
   * POST リクエスト
   */
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return response.json()
  }

  /**
   * PUT リクエスト
   */
  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    })

    return response.json()
  }

  /**
   * DELETE リクエスト
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    return response.json()
  }

  /**
   * ファイルアップロード
   */
  async upload<T>(endpoint: string, file: File, additionalData?: Record<string, string>): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
    })

    return response.json()
  }
}

// シングルトン API クライアントインスタンス
export const api = new ApiClient(API_BASE_URL)

/**
 * Notes API
 */
export const notesApi = {
  /**
   * ノート一覧取得
   */
  getAll: (params?: NotesQueryParams) =>
    api.get<import('../types/note').Note[]>('/notes', params as Record<string, unknown>),

  /**
   * ノート単体取得
   */
  getById: (id: string) =>
    api.get<import('../types/note').Note>(`/notes/${id}`),

  /**
   * ノート作成
   */
  create: (data: { title?: string; content?: string; folderId?: string }) =>
    api.post<import('../types/note').Note>('/notes', data),

  /**
   * ノート更新
   */
  update: (id: string, data: Partial<import('../types/note').Note>) =>
    api.put<import('../types/note').Note>(`/notes/${id}`, data),

  /**
   * ノート削除
   */
  delete: (id: string) =>
    api.delete<void>(`/notes/${id}`),
}

/**
 * Upload API
 */
export const uploadApi = {
  /**
   * 画像アップロード
   */
  uploadImage: (file: File, noteId?: string) =>
    api.upload<import('../types/note').Attachment>('/upload', file, noteId ? { noteId } : undefined),
}

export default api
