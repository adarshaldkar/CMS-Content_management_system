import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Trash2,
  MessageSquare,
  Move,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
  GripVertical,
} from 'lucide-react';

interface ImageResizerOverlayProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onContentChange: () => void;
}

interface ImageRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type HandleType =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top'
  | 'bottom'
  | 'right'
  | 'left';

export const ImageResizerOverlay: React.FC<ImageResizerOverlayProps> = ({
  editorRef,
  containerRef,
  onContentChange,
}) => {
  const [selectedImg, setSelectedImg] = useState<HTMLImageElement | null>(null);
  const [rect, setRect] = useState<ImageRect | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingToMove, setIsDraggingToMove] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [currentDisplaySize, setCurrentDisplaySize] = useState({ width: 0, height: 0 });

  // Drop target placeholder indicator
  const [dropIndicator, setDropIndicator] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropTargetNodeRef = useRef<{ parent: Node; nextSibling: Node | null } | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const aspectRatioRef = useRef(1);

  // Update bounding box coordinates relative to container (or editor)
  const updateRect = useCallback(() => {
    if (!selectedImg) {
      setRect(null);
      return;
    }

    const referenceEl = containerRef?.current || editorRef.current;
    if (!referenceEl) {
      setRect(null);
      return;
    }

    const imgRect = selectedImg.getBoundingClientRect();
    const parentRect = referenceEl.getBoundingClientRect();

    const top = imgRect.top - parentRect.top + referenceEl.scrollTop;
    const left = imgRect.left - parentRect.left + referenceEl.scrollLeft;
    const width = imgRect.width;
    const height = imgRect.height;

    setRect({ top, left, width, height });
    setCurrentDisplaySize({ width: Math.round(width), height: Math.round(height) });
  }, [selectedImg, containerRef, editorRef]);

  // Click on image inside editor to select
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName && target.tagName.toLowerCase() === 'img') {
        const img = target as HTMLImageElement;
        setSelectedImg(img);
      } else if (!target.closest('.cms-image-resizer-overlay')) {
        setSelectedImg(null);
      }
    };

    editor.addEventListener('click', handleEditorClick);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      editor.removeEventListener('click', handleEditorClick);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [editorRef, updateRect]);

  // Re-calculate position when image changes
  useEffect(() => {
    if (selectedImg) {
      updateRect();
    } else {
      setRect(null);
    }
  }, [selectedImg, updateRect]);

  // ─── Keyboard Arrow Key Resizing (Arrow keys or Shift/Ctrl + Arrows) ───────
  useEffect(() => {
    if (!selectedImg) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImg) return;

      const activeEl = document.activeElement;
      const isTypingText =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl === editorRef.current && !e.shiftKey && !e.ctrlKey && !e.altKey));

      if (e.key === 'Escape') {
        setSelectedImg(null);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!isTypingText) {
          e.preventDefault();
          handleDeleteImage();
        }
        return;
      }

      const step = e.shiftKey ? 30 : 15;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        if (!isTypingText || e.shiftKey || e.ctrlKey) {
          e.preventDefault();
          const currentWidth = selectedImg.offsetWidth || 300;
          const maxWidth = editorRef.current ? editorRef.current.clientWidth - 40 : 1200;
          const newWidth = Math.min(maxWidth, currentWidth + step);
          selectedImg.style.width = `${newWidth}px`;
          selectedImg.style.height = 'auto';
          selectedImg.style.maxWidth = '100%';
          updateRect();
          onContentChange();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        if (!isTypingText || e.shiftKey || e.ctrlKey) {
          e.preventDefault();
          const currentWidth = selectedImg.offsetWidth || 300;
          const newWidth = Math.max(60, currentWidth - step);
          selectedImg.style.width = `${newWidth}px`;
          selectedImg.style.height = 'auto';
          selectedImg.style.maxWidth = '100%';
          updateRect();
          onContentChange();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImg, updateRect, onContentChange, editorRef]);

  // ─── Mouse Drag Resizing Handlers (ALL 8 Handles Including Top-Left) ──────
  const handleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImg) return;

    setIsResizing(true);
    setActiveHandle(handle);

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = selectedImg.offsetWidth || rect?.width || 300;
    startHeightRef.current = selectedImg.offsetHeight || rect?.height || 200;
    aspectRatioRef.current = startWidthRef.current / (startHeightRef.current || 1);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedImg) return;

      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaY = moveEvent.clientY - startYRef.current;
      let newWidth = startWidthRef.current;

      switch (handle) {
        case 'top-left': {
          // Dragging towards top-left (deltaX < 0, deltaY < 0) grows the image
          const effectiveDelta = -(deltaX + deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'top-right': {
          // Dragging towards top-right (deltaX > 0, deltaY < 0) grows the image
          const effectiveDelta = (deltaX - deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'bottom-left': {
          // Dragging towards bottom-left (deltaX < 0, deltaY > 0) grows the image
          const effectiveDelta = (-deltaX + deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'bottom-right': {
          // Dragging towards bottom-right (deltaX > 0, deltaY > 0) grows the image
          const effectiveDelta = (deltaX + deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'left':
          newWidth = Math.max(80, startWidthRef.current - deltaX);
          break;
        case 'right':
          newWidth = Math.max(80, startWidthRef.current + deltaX);
          break;
        case 'top': {
          const targetHeight = Math.max(50, startHeightRef.current - deltaY);
          newWidth = targetHeight * aspectRatioRef.current;
          break;
        }
        case 'bottom': {
          const targetHeight = Math.max(50, startHeightRef.current + deltaY);
          newWidth = targetHeight * aspectRatioRef.current;
          break;
        }
      }

      // Constrain within editor bounds
      const maxWidth = editorRef.current ? editorRef.current.clientWidth - 40 : 1200;
      newWidth = Math.min(maxWidth, Math.max(80, newWidth));

      selectedImg.style.width = `${Math.round(newWidth)}px`;
      selectedImg.style.height = 'auto';
      selectedImg.style.maxWidth = '100%';

      updateRect();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveHandle(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onContentChange();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ─── Drag to Move / Reposition Image in Document Flow ─────────────────────
  const handleStartDragMove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedImg || !editorRef.current) return;

    setIsDraggingToMove(true);

    const referenceEl = containerRef?.current || editorRef.current;

    const handleMouseMoveMove = (moveEvent: MouseEvent) => {
      if (!editorRef.current || !referenceEl) return;

      // Find element under cursor inside the editor
      const elementsUnder = document.elementsFromPoint(moveEvent.clientX, moveEvent.clientY);
      const targetBlock = elementsUnder.find(
        (el) =>
          editorRef.current?.contains(el) &&
          el !== editorRef.current &&
          !el.closest('.cms-image-resizer-overlay') &&
          el !== selectedImg &&
          !selectedImg.contains(el)
      );

      if (targetBlock) {
        const blockRect = targetBlock.getBoundingClientRect();
        const parentRect = referenceEl.getBoundingClientRect();
        const isUpperHalf = moveEvent.clientY < blockRect.top + blockRect.height / 2;

        const lineTop =
          (isUpperHalf ? blockRect.top : blockRect.bottom) -
          parentRect.top +
          referenceEl.scrollTop;
        const lineLeft = blockRect.left - parentRect.left + referenceEl.scrollLeft;

        setDropIndicator({
          top: lineTop,
          left: lineLeft,
          width: blockRect.width,
        });

        if (targetBlock.parentNode) {
          dropTargetNodeRef.current = {
            parent: targetBlock.parentNode,
            nextSibling: isUpperHalf ? targetBlock : targetBlock.nextSibling,
          };
        }
      }
    };

    const handleMouseUpMove = () => {
      setIsDraggingToMove(false);
      setDropIndicator(null);
      window.removeEventListener('mousemove', handleMouseMoveMove);
      window.removeEventListener('mouseup', handleMouseUpMove);

      if (dropTargetNodeRef.current && selectedImg) {
        const itemToMove = selectedImg.closest('figure') || selectedImg;
        const { parent, nextSibling } = dropTargetNodeRef.current;

        if (parent && itemToMove !== nextSibling && itemToMove.nextSibling !== nextSibling) {
          parent.insertBefore(itemToMove, nextSibling);
          updateRect();
          onContentChange();
        }
        dropTargetNodeRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMoveMove);
    window.addEventListener('mouseup', handleMouseUpMove);
  };

  // ─── Move Up / Move Down Block Reordering ─────────────────────────────────
  const moveImageBlock = (direction: 'up' | 'down') => {
    if (!selectedImg || !editorRef.current) return;
    const itemToMove = selectedImg.closest('figure') || selectedImg;
    const parent = itemToMove.parentNode;
    if (!parent) return;

    if (direction === 'up') {
      const prev = itemToMove.previousElementSibling;
      if (prev) {
        parent.insertBefore(itemToMove, prev);
        updateRect();
        onContentChange();
      }
    } else {
      const next = itemToMove.nextElementSibling;
      if (next) {
        parent.insertBefore(itemToMove, next.nextElementSibling);
        updateRect();
        onContentChange();
      }
    }
  };

  // ─── Quick Size Adjustment Buttons ───────────────────────────────────────
  const adjustSizeStep = (delta: number) => {
    if (!selectedImg) return;
    const currentWidth = selectedImg.offsetWidth || 300;
    const maxWidth = editorRef.current ? editorRef.current.clientWidth - 40 : 1200;
    const newWidth = Math.min(maxWidth, Math.max(80, currentWidth + delta));
    selectedImg.style.width = `${newWidth}px`;
    selectedImg.style.height = 'auto';
    selectedImg.style.maxWidth = '100%';
    updateRect();
    onContentChange();
  };

  // ─── Quick Preset Actions ────────────────────────────────────────────────
  const setPercentageWidth = (pct: number) => {
    if (!selectedImg) return;
    selectedImg.style.width = `${pct}%`;
    selectedImg.style.height = 'auto';
    selectedImg.style.maxWidth = '100%';
    updateRect();
    onContentChange();
  };

  const setAlignment = (align: 'left' | 'center' | 'right') => {
    if (!selectedImg) return;
    if (align === 'center') {
      selectedImg.style.display = 'block';
      selectedImg.style.margin = '1.5rem auto';
      selectedImg.style.float = 'none';
      selectedImg.style.clear = 'both';
    } else if (align === 'left') {
      selectedImg.style.display = 'inline-block';
      selectedImg.style.margin = '0.5rem 1.5rem 1rem 0';
      selectedImg.style.float = 'left';
      selectedImg.style.clear = 'left';
    } else if (align === 'right') {
      selectedImg.style.display = 'inline-block';
      selectedImg.style.margin = '0.5rem 0 1rem 1.5rem';
      selectedImg.style.float = 'right';
      selectedImg.style.clear = 'right';
    }
    updateRect();
    onContentChange();
  };

  const handleDeleteImage = () => {
    if (!selectedImg) return;
    const parentFigure = selectedImg.closest('figure');
    if (parentFigure && parentFigure.contains(selectedImg)) {
      parentFigure.remove();
    } else {
      selectedImg.remove();
    }
    setSelectedImg(null);
    setRect(null);
    onContentChange();
  };

  const handleAddCaption = () => {
    if (!selectedImg) return;
    const parentFigure = selectedImg.closest('figure');
    if (parentFigure) {
      let caption = parentFigure.querySelector('figcaption');
      if (!caption) {
        caption = document.createElement('figcaption');
        caption.className =
          'cms-embed-caption text-center text-xs font-serif text-ink-secondary italic mt-2.5';
        caption.innerHTML = 'Add image caption or source…';
        parentFigure.appendChild(caption);
      }
    } else {
      const figure = document.createElement('figure');
      figure.className = 'my-6 text-center';
      selectedImg.replaceWith(figure);
      figure.appendChild(selectedImg);
      const caption = document.createElement('figcaption');
      caption.className =
        'cms-embed-caption text-center text-xs font-serif text-ink-secondary italic mt-2.5';
      caption.innerHTML = 'Add image caption or source…';
      figure.appendChild(caption);
    }
    updateRect();
    onContentChange();
  };

  if (!selectedImg || !rect) return null;

  return (
    <>
      {/* Live Drop Insertion Indicator Bar */}
      {dropIndicator && (
        <div
          className="absolute z-50 pointer-events-none transition-all duration-75 flex items-center"
          style={{
            top: `${dropIndicator.top - 2}px`,
            left: `${dropIndicator.left}px`,
            width: `${dropIndicator.width}px`,
            height: '4px',
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-accent-crimson -ml-1 shadow-sm" />
          <div className="flex-1 h-1 bg-accent-crimson rounded-full shadow-md animate-pulse" />
          <div className="w-2.5 h-2.5 rounded-full bg-accent-crimson -mr-1 shadow-sm" />
        </div>
      )}

      {/* Main Resizer & Move Overlay */}
      <div
        className="cms-image-resizer-overlay absolute pointer-events-none z-40"
        style={{
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        }}
      >
        {/* Visual Bounding Outline */}
        <div
          className={`absolute inset-0 border-2 ${
            isResizing || isDraggingToMove
              ? 'border-accent-crimson shadow-lg ring-2 ring-accent-crimson/30'
              : 'border-accent-crimson/80'
          } rounded-xs`}
        />

        {/* Center Drag & Move Handle Badge (Drag Anywhere in Document) */}
        <div
          onMouseDown={handleStartDragMove}
          title="Click and drag to move image anywhere in manuscript"
          className="absolute inset-0 m-auto w-32 h-9 bg-slate-900/90 hover:bg-slate-900 text-white rounded-md shadow-xl flex items-center justify-center gap-1.5 pointer-events-auto cursor-grab active:cursor-grabbing border border-slate-700 transition-transform hover:scale-105 select-none z-30"
        >
          <GripVertical size={14} className="text-slate-400" />
          <span className="text-xs font-mono font-medium">Move Image</span>
          <Move size={12} className="text-accent-crimson" />
        </div>

        {/* Floating Dimension Tooltip Badge */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/95 text-white rounded text-[11px] font-mono shadow-md whitespace-nowrap pointer-events-none flex items-center gap-1 border border-slate-700">
          <span>{currentDisplaySize.width} × {currentDisplaySize.height} px</span>
          <span className="text-slate-400 text-[10px]">
            (Drag corner / Move / Arrow keys)
          </span>
        </div>

        {/* Floating Quick Action Toolbar (Situated High Enough to Never Block Top Handles) */}
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 p-1 bg-slate-900 text-white border border-slate-700 rounded shadow-xl text-xs font-mono animate-in fade-in zoom-in-95 duration-100 select-none shrink-0 whitespace-nowrap z-50">
          {/* Reorder Up / Down */}
          <button
            type="button"
            onClick={() => moveImageBlock('up')}
            title="Move Image Up (Above Previous Paragraph)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onClick={() => moveImageBlock('down')}
            title="Move Image Down (Below Next Paragraph)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowDown size={13} />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => setAlignment('left')}
            title="Float Left (Wrap Text)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <AlignLeft size={13} />
          </button>

          <button
            type="button"
            onClick={() => setAlignment('center')}
            title="Align Center (Full Block)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <AlignCenter size={13} />
          </button>

          <button
            type="button"
            onClick={() => setAlignment('right')}
            title="Float Right (Wrap Text)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <AlignRight size={13} />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Step resize buttons (- / +) */}
          <button
            type="button"
            onClick={() => adjustSizeStep(-30)}
            title="Shrink image (Left / Down Arrow)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <Minus size={12} />
          </button>
          <button
            type="button"
            onClick={() => adjustSizeStep(30)}
            title="Enlarge image (Right / Up Arrow)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <Plus size={12} />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Quick Sizes */}
          <button
            type="button"
            onClick={() => setPercentageWidth(25)}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => setPercentageWidth(50)}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => setPercentageWidth(75)}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => setPercentageWidth(100)}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            100%
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Add Caption */}
          <button
            type="button"
            onClick={handleAddCaption}
            title="Add / Edit Caption"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <MessageSquare size={13} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={handleDeleteImage}
            title="Delete Image (Del/Backspace)"
            className="p-1 hover:bg-rose-950 text-slate-300 hover:text-rose-400 rounded-xs cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* ─── 4 Corner Drag Handles (Mouse Resize with High z-index & Touch Targets) ─── */}
        {/* Top Left */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'top-left')}
          title="Drag top-left corner to resize"
          className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-accent-crimson rounded-full pointer-events-auto cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 bg-accent-crimson rounded-full" />
        </div>

        {/* Top Right */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'top-right')}
          title="Drag top-right corner to resize"
          className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-accent-crimson rounded-full pointer-events-auto cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 bg-accent-crimson rounded-full" />
        </div>

        {/* Bottom Left */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'bottom-left')}
          title="Drag bottom-left corner to resize"
          className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-accent-crimson rounded-full pointer-events-auto cursor-nesw-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 bg-accent-crimson rounded-full" />
        </div>

        {/* Bottom Right */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'bottom-right')}
          title="Drag bottom-right corner to resize"
          className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-accent-crimson rounded-full pointer-events-auto cursor-nwse-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="w-1.5 h-1.5 bg-accent-crimson rounded-full" />
        </div>

        {/* ─── 4 Edge Drag Handles (Mouse Resize) ────────────────────────────── */}
        {/* Left Edge */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'left')}
          title="Drag left edge to resize"
          className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-4 h-7 bg-white border-2 border-accent-crimson rounded-xs pointer-events-auto cursor-ew-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="w-0.5 h-3 bg-accent-crimson" />
        </div>

        {/* Right Edge */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'right')}
          title="Drag right edge to resize"
          className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-7 bg-white border-2 border-accent-crimson rounded-xs pointer-events-auto cursor-ew-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="w-0.5 h-3 bg-accent-crimson" />
        </div>

        {/* Top Edge */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'top')}
          title="Drag top edge to resize"
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-4 bg-white border-2 border-accent-crimson rounded-xs pointer-events-auto cursor-ns-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="h-0.5 w-3 bg-accent-crimson" />
        </div>

        {/* Bottom Edge */}
        <div
          onMouseDown={(e) => handleMouseDown(e, 'bottom')}
          title="Drag bottom edge to resize"
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-7 h-4 bg-white border-2 border-accent-crimson rounded-xs pointer-events-auto cursor-ns-resize shadow-md hover:scale-125 transition-transform z-50 flex items-center justify-center"
        >
          <div className="h-0.5 w-3 bg-accent-crimson" />
        </div>
      </div>
    </>
  );
};
