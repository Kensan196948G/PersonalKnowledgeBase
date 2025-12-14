import { useState, useCallback, useEffect } from "react";

interface MainLayoutProps {
  sidebar: React.ReactNode;
  editor: React.ReactNode;
  header?: React.ReactNode;
  rightSidebar?: React.ReactNode;
}

/**
 * メインレイアウトコンポーネント
 * サイドバー（ノート一覧）とエディタの2ペイン構成（右サイドバーオプション）
 */
export function MainLayout({
  sidebar,
  editor,
  header,
  rightSidebar,
}: MainLayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isRightResizing, setIsRightResizing] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);

  const minSidebarWidth = 240;
  const maxSidebarWidth = 500;
  const minRightSidebarWidth = 250;
  const maxRightSidebarWidth = 450;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleRightMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsRightResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        if (newWidth >= minSidebarWidth && newWidth <= maxSidebarWidth) {
          setSidebarWidth(newWidth);
        }
      } else if (isRightResizing) {
        const newWidth = window.innerWidth - e.clientX;
        if (
          newWidth >= minRightSidebarWidth &&
          newWidth <= maxRightSidebarWidth
        ) {
          setRightSidebarWidth(newWidth);
        }
      }
    },
    [isResizing, isRightResizing],
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    setIsRightResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing || isRightResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isRightResizing, handleMouseMove, handleMouseUp]);

  // キーボードショートカット: Cmd/Ctrl + \ でサイドバートグル
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* ヘッダー */}
      {header && (
        <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">
          {header}
        </header>
      )}

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* サイドバー */}
        <aside
          className={`
            flex-shrink-0 bg-white border-r border-gray-200 overflow-hidden
            transition-all duration-200 ease-in-out
            ${isSidebarCollapsed ? "w-0" : ""}
          `}
          style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
        >
          <div
            className="h-full overflow-y-auto"
            style={{ width: sidebarWidth }}
          >
            {sidebar}
          </div>
        </aside>

        {/* リサイズハンドル */}
        {!isSidebarCollapsed && (
          <div
            className={`
              w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-400
              transition-colors duration-150
              ${isResizing ? "bg-blue-500" : "bg-transparent hover:bg-blue-300"}
            `}
            onMouseDown={handleMouseDown}
          />
        )}

        {/* サイドバートグルボタン */}
        <button
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={`
            absolute z-10 p-1.5 bg-white border border-gray-300 rounded-r-md
            hover:bg-gray-100 transition-colors shadow-sm
            ${isSidebarCollapsed ? "left-0" : ""}
          `}
          style={{
            left: isSidebarCollapsed ? 0 : sidebarWidth - 4,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          title={
            isSidebarCollapsed
              ? "サイドバーを開く (⌘\\)"
              : "サイドバーを閉じる (⌘\\)"
          }
        >
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform ${isSidebarCollapsed ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>

        {/* エディタ */}
        <main className="flex-1 overflow-hidden bg-white">{editor}</main>

        {/* 右サイドバーリサイズハンドル */}
        {rightSidebar && !isRightSidebarCollapsed && (
          <div
            className={`
              w-1 flex-shrink-0 cursor-col-resize hover:bg-blue-400
              transition-colors duration-150
              ${isRightResizing ? "bg-blue-500" : "bg-transparent hover:bg-blue-300"}
            `}
            onMouseDown={handleRightMouseDown}
          />
        )}

        {/* 右サイドバー */}
        {rightSidebar && (
          <>
            <aside
              className={`
                flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-hidden
                transition-all duration-200 ease-in-out
                ${isRightSidebarCollapsed ? "w-0" : ""}
              `}
              style={{ width: isRightSidebarCollapsed ? 0 : rightSidebarWidth }}
            >
              <div
                className="h-full overflow-y-auto"
                style={{ width: rightSidebarWidth }}
              >
                {rightSidebar}
              </div>
            </aside>

            {/* 右サイドバートグルボタン */}
            <button
              onClick={() => setIsRightSidebarCollapsed((prev) => !prev)}
              className={`
                absolute z-10 p-1.5 bg-white border border-gray-300 rounded-l-md
                hover:bg-gray-100 transition-colors shadow-sm
                ${isRightSidebarCollapsed ? "right-0" : ""}
              `}
              style={{
                right: isRightSidebarCollapsed ? 0 : rightSidebarWidth - 4,
                top: "50%",
                transform: "translateY(-50%)",
              }}
              title={
                isRightSidebarCollapsed
                  ? "関連ノートを開く"
                  : "関連ノートを閉じる"
              }
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${isRightSidebarCollapsed ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MainLayout;
