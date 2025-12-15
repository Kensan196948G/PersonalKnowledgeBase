import { useState } from "react";
import { useAiStore } from "../../stores/aiStore";

export interface AIToolbarProps {
  noteId: string;
  noteContent?: string;
  onSummaryClick?: () => void;
  onTagSuggestClick?: () => void;
  onProofreadClick?: () => void;
  compact?: boolean;
}

export function AIToolbar({
  noteId,
  noteContent,
  onSummaryClick,
  onTagSuggestClick,
  onProofreadClick,
  compact = false,
}: AIToolbarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const {
    isSummarizing,
    isSuggestingTags,
    isProofreading,
    suggestTags,
    proofreadText,
  } = useAiStore();

  const handleSummaryClick = () => {
    if (onSummaryClick) {
      onSummaryClick();
    }
  };

  const handleTagSuggestClick = async () => {
    await suggestTags(noteId, noteContent);
    if (onTagSuggestClick) {
      onTagSuggestClick();
    }
  };

  const handleProofreadClick = async () => {
    if (noteContent) {
      await proofreadText(noteContent);
    }
    if (onProofreadClick) {
      onProofreadClick();
    }
  };

  const buttons = [
    {
      id: "summary",
      label: "要約生成",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      onClick: handleSummaryClick,
      isLoading: isSummarizing,
      tooltip: "AIでノートを要約",
      color: "blue",
    },
    {
      id: "tags",
      label: "タグ提案",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
          />
        </svg>
      ),
      onClick: handleTagSuggestClick,
      isLoading: isSuggestingTags,
      tooltip: "適切なタグを提案",
      color: "green",
    },
    {
      id: "proofread",
      label: "文章校正",
      icon: (
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      onClick: handleProofreadClick,
      isLoading: isProofreading,
      tooltip: "文法・表現をチェック",
      color: "purple",
      disabled: !noteContent,
    },
  ];

  const getColorClasses = (color: string, isActive: boolean = false) => {
    const colors = {
      blue: isActive
        ? "bg-blue-500 text-white hover:bg-blue-600"
        : "bg-blue-50 text-blue-600 hover:bg-blue-100",
      green: isActive
        ? "bg-green-500 text-white hover:bg-green-600"
        : "bg-green-50 text-green-600 hover:bg-green-100",
      purple: isActive
        ? "bg-purple-500 text-white hover:bg-purple-600"
        : "bg-purple-50 text-purple-600 hover:bg-purple-100",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={button.onClick}
            disabled={button.isLoading || button.disabled}
            onMouseEnter={() => setShowTooltip(button.id)}
            onMouseLeave={() => setShowTooltip(null)}
            className={`
              relative p-2 rounded-md transition-all
              ${getColorClasses(button.color)}
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${button.color}-500
            `}
            title={button.tooltip}
          >
            {button.isLoading ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              button.icon
            )}
            {showTooltip === button.id && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
                {button.tooltip}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="ai-toolbar bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="h-4 w-4 text-blue-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span className="text-xs font-semibold text-gray-700">AI機能</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {buttons.map((button) => (
          <button
            key={button.id}
            onClick={button.onClick}
            disabled={button.isLoading || button.disabled}
            className={`
              flex flex-col items-center gap-1 p-3 rounded-lg transition-all
              ${getColorClasses(button.color)}
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${button.color}-500
            `}
          >
            {button.isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <div className="h-5 w-5">{button.icon}</div>
            )}
            <span className="text-xs font-medium">
              {button.isLoading ? "処理中..." : button.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">Powered by AI</p>
      </div>
    </div>
  );
}

export default AIToolbar;
