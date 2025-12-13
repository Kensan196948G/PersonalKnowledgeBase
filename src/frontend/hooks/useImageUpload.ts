/**
 * 画像アップロードカスタムフック
 * 画像ファイルのアップロード処理を提供
 */

import { useState, useCallback } from "react";
import { useUIStore } from "../stores/uiStore";
import { uploadApi } from "../lib/api";
import type { Attachment } from "../types/note";

// ファイル制約
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

export interface UseImageUploadReturn {
  uploadImage: (file: File, noteId?: string) => Promise<string>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

/**
 * 画像アップロードフック
 */
export function useImageUpload(): UseImageUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useUIStore();

  /**
   * ファイルバリデーション
   */
  const validateFile = useCallback((file: File): string | null => {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズが大きすぎます（最大: ${MAX_FILE_SIZE / 1024 / 1024}MB）`;
    }

    // MIMEタイプチェック
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `サポートされていないファイル形式です（対応形式: PNG, JPG, GIF, WebP）`;
    }

    return null;
  }, []);

  /**
   * 画像アップロード処理
   */
  const uploadImage = useCallback(
    async (file: File, noteId?: string): Promise<string> => {
      // バリデーション
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        addToast({
          message: validationError,
          type: "error",
        });
        throw new Error(validationError);
      }

      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        // アップロード開始通知
        addToast({
          message: "画像をアップロード中...",
          type: "info",
          duration: 2000,
        });

        // プログレス更新（擬似的）
        setUploadProgress(30);

        // API呼び出し
        const response = await uploadApi.uploadImage(file, noteId);

        setUploadProgress(100);

        // レスポンス検証
        if (!response.success || !response.data) {
          throw new Error(response.error || "アップロードに失敗しました");
        }

        const attachment = response.data as Attachment;

        // 成功通知
        addToast({
          message: "画像をアップロードしました",
          type: "success",
        });

        // 画像URLを返す
        return attachment.filePath;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "アップロードに失敗しました";
        setError(errorMessage);

        addToast({
          message: errorMessage,
          type: "error",
        });

        throw err;
      } finally {
        setIsUploading(false);
        // プログレスをリセット（少し遅延させてUIの見栄えを良くする）
        setTimeout(() => {
          setUploadProgress(0);
        }, 500);
      }
    },
    [validateFile, addToast],
  );

  return {
    uploadImage,
    isUploading,
    uploadProgress,
    error,
  };
}
