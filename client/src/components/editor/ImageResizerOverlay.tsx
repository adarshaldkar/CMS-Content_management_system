import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  MessageSquare,
  Move,
  ArrowUp,
  ArrowDown,
  Minus,
  Plus,
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

  // Helper: Find enclosing block element (figure or paragraph)
  const getEnclosingImageBlock = useCallback((img: HTMLImageElement): HTMLElement => {
    const figure = img.closest('figure');
    if (figure && editorRef.current?.contains(figure)) return figure;
    const p = img.closest('p, div, blockquote, section');
    if (p && p !== editorRef.current && editorRef.current?.contains(p)) {
      return p as HTMLElement;
    }
    return img;
  }, [editorRef]);

  // Update bounding box coordinates relative to container (or editor)
  const updateRect = useCallback(() => {
    if (!selectedImg || !selectedImg.isConnected) {
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

  // Re-calculate position when image changes or layout reflows
  useEffect(() => {
    if (selectedImg) {
      updateRect();
      const raf = requestAnimationFrame(updateRect);
      return () => cancelAnimationFrame(raf);
    } else {
      setRect(null);
    }
  }, [selectedImg, updateRect]);

  // ─── Keyboard Arrow Key Resizing & Moving (Arrow keys or Shift/Alt + Arrows) ──
  useEffect(() => {
    if (!selectedImg) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImg || !editorRef.current) return;

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

      // Alt+Up / Alt+Down: Move image block up or down
      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault();
        moveImageBlock('up');
        return;
      }
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        moveImageBlock('down');
        return;
      }

      // Quick keyboard step sizing: + or = increases, - decreases
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        adjustSizeStep(50);
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        adjustSizeStep(-50);
        return;
      }

      const step = e.shiftKey ? 50 : 25;

      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        if (!isTypingText || e.shiftKey || e.ctrlKey) {
          e.preventDefault();
          adjustSizeStep(step);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        if (!isTypingText || e.shiftKey || e.ctrlKey) {
          e.preventDefault();
          adjustSizeStep(-step);
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
    startWidthRef.current = selectedImg.getBoundingClientRect().width || rect?.width || 300;
    startHeightRef.current = selectedImg.getBoundingClientRect().height || rect?.height || 200;
    aspectRatioRef.current = startWidthRef.current / (startHeightRef.current || 1);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!selectedImg) return;

      const deltaX = moveEvent.clientX - startXRef.current;
      const deltaY = moveEvent.clientY - startYRef.current;
      let newWidth = startWidthRef.current;

      switch (handle) {
        case 'top-left': {
          const effectiveDelta = -(deltaX + deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'top-right': {
          const effectiveDelta = (deltaX - deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'bottom-left': {
          const effectiveDelta = (-deltaX + deltaY * aspectRatioRef.current) / 2;
          newWidth = Math.max(80, startWidthRef.current + effectiveDelta);
          break;
        }
        case 'bottom-right': {
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
      newWidth = Math.min(maxWidth, Math.max(80, Math.round(newWidth)));

      selectedImg.style.width = `${newWidth}px`;
      selectedImg.style.height = 'auto';
      selectedImg.style.maxWidth = '100%';
      selectedImg.removeAttribute('width');
      selectedImg.removeAttribute('height');

      updateRect();
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveHandle(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      requestAnimationFrame(() => {
        updateRect();
        onContentChange();
      });
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
      if (!editorRef.current || !referenceEl || !selectedImg) return;

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
        const itemToMove = getEnclosingImageBlock(selectedImg);
        const { parent, nextSibling } = dropTargetNodeRef.current;

        if (parent && itemToMove !== nextSibling && itemToMove.nextSibling !== nextSibling) {
          parent.insertBefore(itemToMove, nextSibling);
          setTimeout(() => {
            updateRect();
            onContentChange();
          }, 30);
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
    const block = getEnclosingImageBlock(selectedImg);
    const parent = block.parentElement;
    if (!parent) return;

    if (direction === 'up') {
      const prev = block.previousElementSibling;
      if (prev) {
        parent.insertBefore(block, prev);
        setTimeout(() => {
          updateRect();
          onContentChange();
        }, 30);
      }
    } else {
      const next = block.nextElementSibling;
      if (next) {
        parent.insertBefore(block, next.nextElementSibling);
        setTimeout(() => {
          updateRect();
          onContentChange();
        }, 30);
      }
    }
  };

  // ─── Quick Size Adjustment Buttons (+ / -) ───────────────────────────────
  const adjustSizeStep = (delta: number) => {
    if (!selectedImg || !editorRef.current) return;
    const currentWidth = selectedImg.getBoundingClientRect().width || selectedImg.offsetWidth || 300;
    const maxWidth = editorRef.current.clientWidth - 40;
    const newWidth = Math.min(maxWidth, Math.max(80, Math.round(currentWidth + delta)));
    
    selectedImg.style.width = `${newWidth}px`;
    selectedImg.style.height = 'auto';
    selectedImg.style.maxWidth = '100%';
    selectedImg.removeAttribute('width');
    selectedImg.removeAttribute('height');

    requestAnimationFrame(() => {
      updateRect();
      onContentChange();
    });
  };

  // ─── Quick Preset Percentage Actions ─────────────────────────────────────
  const setPercentageWidth = (pct: number) => {
    if (!selectedImg) return;
    selectedImg.style.width = `${pct}%`;
    selectedImg.style.height = 'auto';
    selectedImg.style.maxWidth = '100%';
    selectedImg.removeAttribute('width');
    selectedImg.removeAttribute('height');

    requestAnimationFrame(() => {
      updateRect();
      onContentChange();
    });
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
    requestAnimationFrame(() => {
      updateRect();
      onContentChange();
    });
  };

  const handleDeleteImage = () => {
    if (!selectedImg) return;
    const parentFigure = selectedImg.closest('figure');
    if (parentFigure && parentFigure.contains(selectedImg)) {
      parentFigure.remove();
    } else {
      const parentP = selectedImg.parentElement;
      selectedImg.remove();
      if (parentP && parentP !== editorRef.current && parentP.innerHTML.trim() === '') {
        parentP.remove();
      }
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
    requestAnimationFrame(() => {
      updateRect();
      onContentChange();
    });
  };

  if (!selectedImg || !rect) return null;

  return (
    <>
      {/* Visual Drop Line Indicator when moving */}
      {isDraggingToMove && dropIndicator && (
        <div
          style={{
            top: `${dropIndicator.top}px`,
            left: `${dropIndicator.left}px`,
            width: `${dropIndicator.width}px`,
          }}
          className="absolute h-1 bg-accent-crimson rounded-full shadow-lg pointer-events-none z-50 animate-pulse"
        />
      )}

      {/* Main Resizer Overlay Box */}
      <div
        style={{
          top: `${rect.top}px`,
          left: `${rect.left}px`,
          width: `${rect.width}px`,
          height: `${rect.height}px`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className={`cms-image-resizer-overlay absolute pointer-events-none border-2 border-accent-crimson z-40 transition-all ${
          isResizing || isDraggingToMove ? 'opacity-90' : 'opacity-100'
        }`}
      >
        {/* Central "Move Image" Drag Badge */}
        <div
          onMouseDown={handleStartDragMove}
          title="Click and drag to reposition image anywhere in story flow"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-white border border-accent-crimson/80 rounded-md shadow-2xl cursor-grab active:cursor-grabbing pointer-events-auto flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all select-none z-50"
        >
          <Move size={14} className="text-accent-crimson animate-pulse" />
          <span className="text-xs font-mono font-medium tracking-wide">Move Image</span>
        </div>

        {/* Floating Dimension Tooltip Badge */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/95 text-white rounded text-[11px] font-mono shadow-md whitespace-nowrap pointer-events-none flex items-center gap-1 border border-slate-700">
          <span>{currentDisplaySize.width} × {currentDisplaySize.height} px</span>
          <span className="text-slate-400 text-[10px]">
            (Drag corner / Move / Arrow keys)
          </span>
        </div>

        {/* Floating Quick Action Toolbar (Smartly positioned so it's NEVER covered by sticky ribbon) */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            top: rect.top < 65 ? '12px' : '-52px',
          }}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1 p-1.5 bg-slate-900/98 text-white border border-slate-600 rounded-md shadow-2xl text-xs font-mono select-none shrink-0 whitespace-nowrap z-[60]"
        >

          {/* Reorder Up / Down */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveImageBlock('up'); }}
            title="Move Image Up (Above Previous Block / Alt+Up)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowUp size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveImageBlock('down'); }}
            title="Move Image Down (Below Next Block / Alt+Down)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <ArrowDown size={13} />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAlignment('left'); }}
            title="Float Left (Wrap Text)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <AlignLeft size={13} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAlignment('center'); }}
            title="Align Center (Full Block)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <AlignCenter size={13} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAlignment('right'); }}
            title="Float Right (Wrap Text)"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <AlignRight size={13} />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Step resize buttons (- / +) */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); adjustSizeStep(-60); }}
            title="Shrink image (-60px / - key)"
            className="p-1.5 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer font-bold"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); adjustSizeStep(60); }}
            title="Enlarge image (+60px / + key)"
            className="p-1.5 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer font-bold"
          >
            <Plus size={13} />
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Quick Preset Widths */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPercentageWidth(25); }}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            25%
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPercentageWidth(50); }}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            50%
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPercentageWidth(75); }}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            75%
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPercentageWidth(100); }}
            className="px-1.5 py-0.5 text-[10px] hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            100%
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5" />

          {/* Add Caption */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddCaption(); }}
            title="Add / Edit Caption"
            className="p-1 hover:bg-slate-800 rounded-xs text-slate-300 hover:text-white cursor-pointer"
          >
            <MessageSquare size={13} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteImage(); }}
            title="Delete Image (Del/Backspace)"
            className="p-1 hover:bg-rose-950 text-slate-300 hover:text-rose-400 rounded-xs cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* ─── 4 Corner Drag Handles (Mouse Resize) ─── */}
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

        {/* ─── 4 Edge Drag Handles (Mouse Resize) ─── */}
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
