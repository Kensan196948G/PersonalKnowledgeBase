/**
 * パフォーマンス測定ユーティリティ
 * React Profiler と Performance API を使用した測定
 */

import { ProfilerOnRenderCallback } from "react";

/**
 * パフォーマンスメトリクス
 */
export interface PerformanceMetrics {
  id: string;
  phase: "mount" | "update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

/**
 * メモリ使用量情報
 */
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * React Profiler用のコールバック
 */
export const createProfilerCallback = (
  componentName: string,
): ProfilerOnRenderCallback => {
  return (
    id: string,
    phase: "mount" | "update" | "nested-update",
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
  ) => {
    const metrics: Omit<PerformanceMetrics, "interactions"> = {
      id,
      phase: phase === "nested-update" ? "update" : phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    };

    console.group(`[Profiler] ${componentName}`);
    console.log("Phase:", phase);
    console.log("Actual Duration:", `${actualDuration.toFixed(2)}ms`);
    console.log("Base Duration:", `${baseDuration.toFixed(2)}ms`);
    console.log("Start Time:", `${startTime.toFixed(2)}ms`);
    console.log("Commit Time:", `${commitTime.toFixed(2)}ms`);
    console.groupEnd();

    // パフォーマンス警告
    if (actualDuration > 16) {
      console.warn(
        `⚠️ ${componentName}: レンダリングに${actualDuration.toFixed(2)}msかかりました（60fps = 16ms以下が理想）`,
      );
    }

    return metrics;
  };
};

/**
 * メモリ使用量を取得
 */
export const getMemoryUsage = (): MemoryInfo | null => {
  if ("memory" in performance && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  return null;
};

/**
 * メモリ使用量をフォーマット（MB単位）
 */
export const formatMemoryUsage = (bytes: number): string => {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * メモリ使用量をログ出力
 */
export const logMemoryUsage = (label: string = "Memory Usage") => {
  const memory = getMemoryUsage();
  if (memory) {
    console.group(`[Memory] ${label}`);
    console.log("Used:", formatMemoryUsage(memory.usedJSHeapSize));
    console.log("Total:", formatMemoryUsage(memory.totalJSHeapSize));
    console.log("Limit:", formatMemoryUsage(memory.jsHeapSizeLimit));
    console.log(
      "Usage:",
      `${((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(2)}%`,
    );
    console.groupEnd();
  } else {
    console.log(`[Memory] ${label}: Memory API not available`);
  }
};

/**
 * パフォーマンスマーカー
 */
export class PerformanceMarker {
  private marks: Map<string, number> = new Map();

  start(name: string) {
    this.marks.set(name, performance.now());
    performance.mark(`${name}-start`);
  }

  end(name: string): number {
    const startTime = this.marks.get(name);
    if (!startTime) {
      console.warn(`Performance marker "${name}" not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    this.marks.delete(name);

    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  clear() {
    this.marks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * パフォーマンスレポート生成
 */
export interface PerformanceReport {
  component: string;
  metrics: {
    renderCount: number;
    totalRenderTime: number;
    avgRenderTime: number;
    maxRenderTime: number;
    minRenderTime: number;
  };
  memory?: {
    before: MemoryInfo;
    after: MemoryInfo;
    delta: number;
  };
}

export class PerformanceReporter {
  private reports: Map<string, number[]> = new Map();
  private memorySnapshots: Map<string, MemoryInfo> = new Map();

  recordRender(componentName: string, duration: number) {
    const durations = this.reports.get(componentName) || [];
    durations.push(duration);
    this.reports.set(componentName, durations);
  }

  snapshotMemory(label: string) {
    const memory = getMemoryUsage();
    if (memory) {
      this.memorySnapshots.set(label, memory);
    }
  }

  generateReport(componentName: string): PerformanceReport | null {
    const durations = this.reports.get(componentName);
    if (!durations || durations.length === 0) {
      return null;
    }

    const totalRenderTime = durations.reduce((sum, d) => sum + d, 0);
    const avgRenderTime = totalRenderTime / durations.length;
    const maxRenderTime = Math.max(...durations);
    const minRenderTime = Math.min(...durations);

    const beforeMemory = this.memorySnapshots.get(`${componentName}-before`);
    const afterMemory = this.memorySnapshots.get(`${componentName}-after`);

    return {
      component: componentName,
      metrics: {
        renderCount: durations.length,
        totalRenderTime,
        avgRenderTime,
        maxRenderTime,
        minRenderTime,
      },
      memory:
        beforeMemory && afterMemory
          ? {
              before: beforeMemory,
              after: afterMemory,
              delta: afterMemory.usedJSHeapSize - beforeMemory.usedJSHeapSize,
            }
          : undefined,
    };
  }

  printReport(componentName: string) {
    const report = this.generateReport(componentName);
    if (!report) {
      console.log(`No performance data for ${componentName}`);
      return;
    }

    console.group(`[Performance Report] ${componentName}`);
    console.log("Render Count:", report.metrics.renderCount);
    console.log(
      "Total Render Time:",
      `${report.metrics.totalRenderTime.toFixed(2)}ms`,
    );
    console.log(
      "Avg Render Time:",
      `${report.metrics.avgRenderTime.toFixed(2)}ms`,
    );
    console.log(
      "Max Render Time:",
      `${report.metrics.maxRenderTime.toFixed(2)}ms`,
    );
    console.log(
      "Min Render Time:",
      `${report.metrics.minRenderTime.toFixed(2)}ms`,
    );

    if (report.memory) {
      console.log("Memory Delta:", formatMemoryUsage(report.memory.delta));
      console.log(
        "Memory Before:",
        formatMemoryUsage(report.memory.before.usedJSHeapSize),
      );
      console.log(
        "Memory After:",
        formatMemoryUsage(report.memory.after.usedJSHeapSize),
      );
    }

    console.groupEnd();
  }

  clear() {
    this.reports.clear();
    this.memorySnapshots.clear();
  }
}

// グローバルインスタンス（開発時のみ使用）
export const globalReporter = new PerformanceReporter();
