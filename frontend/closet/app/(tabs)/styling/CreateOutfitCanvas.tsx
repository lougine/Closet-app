import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import AuthenticatedImage from "../../../components/AuthenticatedImage";
import { s } from "../../../Styles/styling.styles";

const DRAG_CARD_W = 118;
const DRAG_CARD_H = 148;
const DRAG_MARGIN = 0;
const DRAG_EDGE_OVERFLOW = 220;
const MIN_ITEM_SCALE = 0.45;
const MAX_ITEM_SCALE = 5;
const TAP_SLOP = 6;

type TouchPoint = { pageX: number; pageY: number };

const getTouchDistance = (touches: TouchPoint[]) => {
  if (!touches || touches.length < 2) return 0;
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
};

const getTouchDistanceFromNativeEvent = (nativeEvent: any) => {
  const touches: TouchPoint[] = Array.isArray(nativeEvent?.touches) ? nativeEvent.touches : [];
  if (touches.length >= 2) return getTouchDistance(touches);

  const changedTouches: TouchPoint[] = Array.isArray(nativeEvent?.changedTouches)
    ? nativeEvent.changedTouches
    : [];
  if (changedTouches.length >= 2) return getTouchDistance(changedTouches);

  return 0;
};

export type CanvasSnapshot = {
  selected: string[];
  dragPositions: Record<string, { x: number; y: number }>;
  itemScales: Record<string, number>;
  itemOrder: string[];
};

type UseCreateOutfitLogicParams = {
  mode: string;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  selectedItems: any[];
};

export function useCreateOutfitLogic({ mode, selected, setSelected, selectedItems }: UseCreateOutfitLogicParams) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [itemScales, setItemScales] = useState<Record<string, number>>({});
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<CanvasSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<CanvasSnapshot[]>([]);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
  const pinchTargetItemIdRef = useRef<string | null>(null);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const pinchSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const pinchDidChangeRef = useRef(false);
  const dragSnapshotRef = useRef<CanvasSnapshot | null>(null);

  const createCanvasSnapshot = (): CanvasSnapshot => ({
    selected: [...selected],
    dragPositions: { ...dragPositions },
    itemScales: { ...itemScales },
    itemOrder: [...itemOrder],
  });

  const restoreCanvasSnapshot = (snapshot: CanvasSnapshot) => {
    setSelected(snapshot.selected);
    setDragPositions(snapshot.dragPositions);
    setItemScales(snapshot.itemScales);
    setItemOrder(snapshot.itemOrder);
    setSelectedCanvasItemId(null);
  };

  const pushUndoSnapshot = (snapshot: CanvasSnapshot) => {
    setUndoStack((prev) => [...prev, snapshot]);
    setRedoStack([]);
  };

  const bringItemToFront = (itemId: string) => {
    setItemOrder((prev) => {
      const withoutItem = prev.filter((id) => id !== itemId);
      return [...withoutItem, itemId];
    });
  };

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const currentSnapshot = createCanvasSnapshot();
      const previousSnapshot = prev[prev.length - 1];
      setRedoStack((redoPrev) => [...redoPrev, currentSnapshot]);
      restoreCanvasSnapshot(previousSnapshot);
      return prev.slice(0, -1);
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const currentSnapshot = createCanvasSnapshot();
      const nextSnapshot = prev[prev.length - 1];
      setUndoStack((undoPrev) => [...undoPrev, currentSnapshot]);
      restoreCanvasSnapshot(nextSnapshot);
      return prev.slice(0, -1);
    });
  };

  const getItemScale = (itemId: string) => itemScales[itemId] || 1;

  const clampDragPosition = (x: number, y: number, itemId: string) => {
    const scale = getItemScale(itemId);
    const itemW = DRAG_CARD_W * scale;
    const itemH = DRAG_CARD_H * scale;
    const maxX = Math.max(-DRAG_EDGE_OVERFLOW, canvasSize.width - itemW + DRAG_EDGE_OVERFLOW);
    const maxY = Math.max(-DRAG_EDGE_OVERFLOW, canvasSize.height - itemH + DRAG_EDGE_OVERFLOW);
    return {
      x: Math.min(maxX, Math.max(-DRAG_EDGE_OVERFLOW, x)),
      y: Math.min(maxY, Math.max(-DRAG_EDGE_OVERFLOW, y)),
    };
  };

  const resetPinchState = () => {
    pinchTargetItemIdRef.current = null;
    pinchStartDistanceRef.current = 0;
    pinchStartScaleRef.current = 1;
    pinchSnapshotRef.current = null;
    pinchDidChangeRef.current = false;
  };

  const onCanvasTouchStart = (evt: any) => {
    if (mode !== "Create outfit") return;
    const touchesCount = Array.isArray(evt?.nativeEvent?.touches) ? evt.nativeEvent.touches.length : 0;
    if (touchesCount < 2 || !selectedCanvasItemId) return;

    const distance = getTouchDistanceFromNativeEvent(evt.nativeEvent);
    if (distance <= 0) return;

    pinchTargetItemIdRef.current = selectedCanvasItemId;
    pinchStartDistanceRef.current = distance;
    pinchStartScaleRef.current = getItemScale(selectedCanvasItemId);
    pinchSnapshotRef.current = createCanvasSnapshot();
    pinchDidChangeRef.current = false;
  };

  const onCanvasTouchMove = (evt: any) => {
    const targetId = pinchTargetItemIdRef.current;
    if (!targetId) return;

    const touchesCount = Array.isArray(evt?.nativeEvent?.touches) ? evt.nativeEvent.touches.length : 0;
    if (touchesCount < 2) return;

    const currentDistance = getTouchDistanceFromNativeEvent(evt.nativeEvent);
    if (currentDistance <= 0 || pinchStartDistanceRef.current <= 0) return;

    const distanceRatio = currentDistance / pinchStartDistanceRef.current;
    const nextScale = Math.max(
      MIN_ITEM_SCALE,
      Math.min(MAX_ITEM_SCALE, pinchStartScaleRef.current * distanceRatio)
    );

    pinchDidChangeRef.current = true;
    setItemScales((prev) => ({ ...prev, [targetId]: nextScale }));
    setDragPositions((prev) => {
      const curr = prev[targetId] || { x: DRAG_MARGIN, y: DRAG_MARGIN };
      return { ...prev, [targetId]: clampDragPosition(curr.x, curr.y, targetId) };
    });
  };

  const onCanvasTouchEnd = (evt: any) => {
    const touchesCount = Array.isArray(evt?.nativeEvent?.touches) ? evt.nativeEvent.touches.length : 0;
    if (touchesCount < 2) {
      if (pinchDidChangeRef.current && pinchSnapshotRef.current) {
        pushUndoSnapshot(pinchSnapshotRef.current);
      }
      resetPinchState();
    }
  };

  useEffect(() => {
    if (mode !== "Create outfit") return;
    if (canvasSize.width <= 0 || canvasSize.height <= 0) return;

    setDragPositions((prev) => {
      const next: Record<string, { x: number; y: number }> = {};
      const selectedSet = new Set(selected);

      Object.entries(prev).forEach(([id, pos]) => {
        if (selectedSet.has(id)) next[id] = clampDragPosition(pos.x, pos.y, id);
      });

      let placementIndex = 0;
      selected.forEach((id) => {
        if (next[id]) return;
        const col = placementIndex % 2;
        const row = Math.floor(placementIndex / 2);
        const initialX = DRAG_MARGIN + col * (DRAG_CARD_W + 12);
        const initialY = DRAG_MARGIN + row * (DRAG_CARD_H + 12);
        next[id] = clampDragPosition(initialX, initialY, id);
        placementIndex += 1;
      });

      return next;
    });
  }, [mode, selected, canvasSize.width, canvasSize.height, itemScales]);

  useEffect(() => {
    if (mode !== "Create outfit") return;
    setItemOrder((prev) => {
      const selectedSet = new Set(selected);
      const kept = prev.filter((id) => selectedSet.has(id));
      const missing = selected.filter((id) => !kept.includes(id));
      return [...kept, ...missing];
    });
  }, [mode, selected]);

  const orderedSelectedItems = useMemo(() => {
    const itemOrderRank = new Map(itemOrder.map((id, index) => [id, index]));
    return [...selectedItems].sort((a, b) => {
      const rankA = itemOrderRank.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
      const rankB = itemOrderRank.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [selectedItems, itemOrder]);

  const toggleItem = (id: string) =>
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!next.includes(id) && selectedCanvasItemId === id) {
        setSelectedCanvasItemId(null);
      }
      return next;
    });

  const resetCreateState = () => {
    setItemOrder([]);
    setUndoStack([]);
    setRedoStack([]);
    setItemScales({});
    setDragPositions({});
    setSelectedCanvasItemId(null);
    setActiveDragId(null);
    resetPinchState();
  };

  return {
    orderedSelectedItems,
    canvasSize,
    dragPositions,
    itemScales,
    itemOrder,
    activeDragId,
    selectedCanvasItemId,
    setSelectedCanvasItemId,
    setActiveDragId,
    setDragPositions,
    setSelected,
    setItemScales,
    setItemOrder,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    createCanvasSnapshot,
    pushUndoSnapshot,
    bringItemToFront,
    clampDragPosition,
    getItemScale,
    dragSnapshotRef,
    tapSlop: TAP_SLOP,
    dragMargin: DRAG_MARGIN,
    dragCardW: DRAG_CARD_W,
    dragCardH: DRAG_CARD_H,
    onCanvasTouchStart,
    onCanvasTouchMove,
    onCanvasTouchEnd,
    setCanvasSize,
    toggleItem,
    resetCreateState,
  };
}

type Props = {
  canvasCaptureRef?: React.RefObject<View | null>;
  hideCanvasControls?: boolean;
  orderedSelectedItems: any[];
  dragPositions: Record<string, { x: number; y: number }>;
  activeDragId: string | null;
  selectedCanvasItemId: string | null;
  setSelectedCanvasItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveDragId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragPositions: React.Dispatch<React.SetStateAction<Record<string, { x: number; y: number }>>>;
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  setItemScales: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setItemOrder: React.Dispatch<React.SetStateAction<string[]>>;
  undoStack: any[];
  redoStack: any[];
  handleUndo: () => void;
  handleRedo: () => void;
  createCanvasSnapshot: () => any;
  pushUndoSnapshot: (snapshot: any) => void;
  bringItemToFront: (itemId: string) => void;
  clampDragPosition: (x: number, y: number, itemId: string) => { x: number; y: number };
  getItemScale: (itemId: string) => number;
  dragSnapshotRef: React.MutableRefObject<any>;
  tapSlop: number;
  dragMargin: number;
  dragCardW: number;
  dragCardH: number;
  onCanvasTouchStart: (evt: any) => void;
  onCanvasTouchMove: (evt: any) => void;
  onCanvasTouchEnd: (evt: any) => void;
};

export default function CreateOutfitCanvas(props: Props) {
  const {
    canvasCaptureRef,
    hideCanvasControls = false,
    orderedSelectedItems,
    dragPositions,
    activeDragId,
    selectedCanvasItemId,
    setSelectedCanvasItemId,
    setActiveDragId,
    setDragPositions,
    setSelected,
    setItemScales,
    setItemOrder,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    createCanvasSnapshot,
    pushUndoSnapshot,
    bringItemToFront,
    clampDragPosition,
    getItemScale,
    dragSnapshotRef,
    tapSlop,
    dragMargin,
    dragCardW,
    dragCardH,
    onCanvasTouchStart,
    onCanvasTouchMove,
    onCanvasTouchEnd,
  } = props;

  return (
    <View
      style={s.dragLayer}
      onTouchStart={onCanvasTouchStart}
      onTouchMove={onCanvasTouchMove}
      onTouchEnd={onCanvasTouchEnd}
    >
        <View
          ref={canvasCaptureRef}
          style={{ flex: 1, backgroundColor: hideCanvasControls ? "transparent" : undefined }}
          collapsable={false}
        >
          <TouchableWithoutFeedback onPress={() => setSelectedCanvasItemId(null)}>
            <View style={s.dragBlankTapArea} />
          </TouchableWithoutFeedback>
          {orderedSelectedItems.map((item, renderIndex) => {
        const itemId = String(item.id);
        const initialPos = dragPositions[itemId] || { x: dragMargin, y: dragMargin };
        let gestureStart = initialPos;
        let didPinch = false;
        let didMove = false;

        const panResponder = PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onStartShouldSetPanResponderCapture: () => true,
          onMoveShouldSetPanResponderCapture: () => true,
          onPanResponderTerminationRequest: () => false,
          onPanResponderGrant: () => {
            gestureStart = dragPositions[itemId] || initialPos;
            dragSnapshotRef.current = createCanvasSnapshot();
            didPinch = false;
            didMove = false;
            setActiveDragId(itemId);
            bringItemToFront(itemId);
          },
          onPanResponderMove: (_, gestureState) => {
            if (gestureState.numberActiveTouches >= 2) {
              didPinch = true;
              return;
            }

            if (Math.abs(gestureState.dx) >= tapSlop || Math.abs(gestureState.dy) >= tapSlop) {
              didMove = true;
            }

            const next = clampDragPosition(
              gestureStart.x + gestureState.dx,
              gestureStart.y + gestureState.dy,
              itemId
            );

            setDragPositions((prev) => ({
              ...prev,
              [itemId]: next,
            }));
          },
          onPanResponderRelease: (_, gestureState) => {
            const isTap = !didPinch && Math.abs(gestureState.dx) < tapSlop && Math.abs(gestureState.dy) < tapSlop;
            
            if (isTap) {
              if (dragSnapshotRef.current) {
                pushUndoSnapshot(dragSnapshotRef.current);
              }
              setSelectedCanvasItemId((prev) => (prev === itemId ? null : itemId));
              bringItemToFront(itemId);
            } else if (didMove && dragSnapshotRef.current) {
              pushUndoSnapshot(dragSnapshotRef.current);
              setSelectedCanvasItemId(itemId);
            } else {
              setSelectedCanvasItemId(itemId);
            }
            dragSnapshotRef.current = null;
            setActiveDragId(null);
          },
          onPanResponderTerminate: () => {
            dragSnapshotRef.current = null;
            setActiveDragId(null);
          },
        });

        const pos = dragPositions[itemId] || initialPos;
        const scale = getItemScale(itemId);

        return (
          <View
            key={itemId}
            style={[
              s.draggableItemCard,
              {
                left: pos.x,
                top: pos.y,
                width: dragCardW * scale,
                height: dragCardH * scale,
                backgroundColor: item.image ? "transparent" : item.bg,
                zIndex: renderIndex + 1,
              },
              activeDragId === itemId && s.draggableItemActive,
              !hideCanvasControls && selectedCanvasItemId === itemId && s.draggableItemSelected,
            ]}
          >
            <View {...panResponder.panHandlers} style={s.draggableItemMediaWrap}>
              {item.image
                ? <AuthenticatedImage source={{ uri: item.image }} style={s.selectedItemImage} resizeMode="contain" />
                : <Text style={s.selectedItemEmoji}>👗</Text>
              }
            </View>
            {!hideCanvasControls && selectedCanvasItemId === itemId && (
              <>
                <TouchableOpacity
                  style={s.canvasDeleteBtn}
                  onPress={() => {
                    pushUndoSnapshot(createCanvasSnapshot());
                    setSelected((prev) => prev.filter((id) => id !== itemId));
                    setDragPositions((prev) => {
                      const next = { ...prev };
                      delete next[itemId];
                      return next;
                    });
                    setItemScales((prev) => {
                      const next = { ...prev };
                      delete next[itemId];
                      return next;
                    });
                    setItemOrder((prev) => prev.filter((id) => id !== itemId));
                    setSelectedCanvasItemId(null);
                  }}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        );
          })}
        </View>
        {!hideCanvasControls && (
        <View style={s.canvasHistoryRow}>
          <TouchableOpacity
            style={[s.canvasHistoryBtn, undoStack.length === 0 && s.canvasHistoryBtnDisabled]}
            onPress={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Ionicons name="arrow-undo" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.canvasHistoryBtn, redoStack.length === 0 && s.canvasHistoryBtnDisabled]}
            onPress={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Ionicons name="arrow-redo" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        )}
    </View>
  );
}
