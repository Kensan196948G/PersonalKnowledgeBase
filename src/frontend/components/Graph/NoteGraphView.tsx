/**
 * ノートグラフビュー - D3.js Force-Directed Graph
 */

import { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3";
import { useNavigate } from "react-router-dom";
import { useGraphData } from "../../hooks/useGraphData";
import { GraphControls } from "./GraphControls";
import type {
  GraphNode,
  GraphLink,
  NoteGraphViewProps,
  GraphFilter,
} from "../../types/graph";

export function NoteGraphView({
  noteId,
  depth = 2,
  width = 800,
  height = 600,
}: NoteGraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const navigate = useNavigate();
  const { nodes, links, isLoading, error } = useGraphData(noteId, depth);

  const [filter, setFilter] = useState<GraphFilter>({
    showPinnedOnly: false,
    showFavoritesOnly: false,
    minLinkCount: 0,
  });

  const [zoom, setZoom] = useState<d3.ZoomBehavior<
    SVGSVGElement,
    unknown
  > | null>(null);

  // フィルター適用
  const filteredNodes = nodes.filter((node) => {
    if (filter.showPinnedOnly && !node.isPinned) return false;
    if (filter.showFavoritesOnly && !node.isFavorite) return false;
    if (node.linkCount < filter.minLinkCount) return false;
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter(
    (link) =>
      filteredNodeIds.has(
        typeof link.source === "string" ? link.source : link.source.id,
      ) &&
      filteredNodeIds.has(
        typeof link.target === "string" ? link.target : link.target.id,
      ),
  );

  // ノードの色を取得
  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (node.id === noteId) return "#3B82F6"; // 選択中：青
      if (node.isPinned) return "#EF4444"; // ピン留め：赤
      if (node.isFavorite) return "#F59E0B"; // お気に入り：オレンジ
      return "#6B7280"; // デフォルト：グレー
    },
    [noteId],
  );

  // ノードのサイズを取得（リンク数に応じて）
  const getNodeRadius = useCallback((node: GraphNode) => {
    return Math.min(8 + node.linkCount * 2, 24);
  }, []);

  // リンクの太さを取得
  const getLinkWidth = useCallback((link: GraphLink) => {
    return link.bidirectional ? 3 : 1;
  }, []);

  // ズームコントロール
  const handleZoomIn = useCallback(() => {
    if (zoom && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoom.scaleBy, 1.3);
    }
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    if (zoom && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoom.scaleBy, 0.7);
    }
  }, [zoom]);

  const handleReset = useCallback(() => {
    if (zoom && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoom.transform, d3.zoomIdentity);
    }
  }, [zoom]);

  // D3.js グラフ描画
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // SVGグループ
    const g = svg.append("g");

    // ズーム設定
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);
    setZoom(zoomBehavior);

    // Force Simulation
    const simulation = d3
      .forceSimulation<GraphNode>(filteredNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(filteredLinks)
          .id((d) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<GraphNode>().radius((d) => getNodeRadius(d) + 5),
      );

    // 矢印マーカー定義
    const defs = svg.append("defs");

    // 単方向リンク用の矢印
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // リンク描画
    const link = g
      .append("g")
      .selectAll("line")
      .data(filteredLinks)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", getLinkWidth)
      .attr("marker-end", (d) => (d.bidirectional ? "" : "url(#arrowhead)"));

    // ノード描画
    const node = g
      .append("g")
      .selectAll("g")
      .data(filteredNodes)
      .join("g")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any,
      );

    // ノード円
    node
      .append("circle")
      .attr("r", getNodeRadius)
      .attr("fill", getNodeColor)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        navigate(`/notes/${d.id}`);
      })
      .on("mouseover", function (event, d) {
        // ノードをハイライト
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 3);

        // ツールチップ表示
        const tooltip = d3
          .select("body")
          .append("div")
          .attr("class", "graph-tooltip")
          .style("position", "absolute")
          .style("background", "white")
          .style("border", "1px solid #ccc")
          .style("border-radius", "4px")
          .style("padding", "8px")
          .style("pointer-events", "none")
          .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
          .style("z-index", "1000")
          .html(
            `
            <div class="font-bold">${d.title}</div>
            <div class="text-xs text-gray-600 mt-1">
              リンク: ${d.linkCount} | タグ: ${d.tagCount}
            </div>
            ${d.isPinned ? '<div class="text-xs text-red-600">📌 ピン留め</div>' : ""}
            ${d.isFavorite ? '<div class="text-xs text-orange-600">⭐ お気に入り</div>' : ""}
          `,
          )
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px");

        // マウス移動時にツールチップを追従
        d3.select("body").on("mousemove.tooltip", (e) => {
          tooltip
            .style("left", e.pageX + 10 + "px")
            .style("top", e.pageY - 10 + "px");
        });
      })
      .on("mouseout", function () {
        // ノードのハイライトを解除
        d3.select(this).attr("stroke", "#fff").attr("stroke-width", 2);

        // ツールチップを削除
        d3.selectAll(".graph-tooltip").remove();
        d3.select("body").on("mousemove.tooltip", null);
      });

    // ノードラベル
    node
      .append("text")
      .text((d) => d.title)
      .attr("x", 0)
      .attr("y", (d) => getNodeRadius(d) + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .style("pointer-events", "none")
      .style("user-select", "none");

    // シミュレーション更新
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      node.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // クリーンアップ
    return () => {
      simulation.stop();
      d3.selectAll(".graph-tooltip").remove();
    };
  }, [
    filteredNodes,
    filteredLinks,
    width,
    height,
    getNodeColor,
    getNodeRadius,
    getLinkWidth,
    navigate,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">グラフを読み込んでいます...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500">エラー: {error.message}</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">表示するノートがありません</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-50 rounded-lg overflow-hidden">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
      <GraphControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onFilterChange={setFilter}
        filter={filter}
      />
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600">
        ノード: {filteredNodes.length} / {nodes.length} | リンク:{" "}
        {filteredLinks.length} / {links.length}
      </div>
    </div>
  );
}
