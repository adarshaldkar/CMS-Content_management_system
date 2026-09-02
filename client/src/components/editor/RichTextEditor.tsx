import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Undo,
  Redo,
  RemoveFormatting,
} from 'lucide-react';
import { MediaPickerModal } from './MediaPickerModal';
import { RichEmbedModal } from './RichEmbedModal';
import { embedsApi, type EmbedMetadataResponse } from '../../api/embeds.api';
import { formatEmbedHtml } from '../../utils/embedFormatter';
import { isValidUrl, detectEmbedInfo } from '../../utils/embedParser';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Begin your manuscript here. Type freely or select text to format…',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedModalUrl, setEmbedModalUrl] = useState('');
  const lastHtmlRef = useRef<string>('');

  // Synchronize incoming external value changes (async load from API, revision restores, initial mount)
  useEffect(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.innerHTML;
      const targetContent = value || '';
      if (currentContent !== targetContent && targetContent !== lastHtmlRef.current) {
        editorRef.current.innerHTML = targetContent;
        lastHtmlRef.current = targetContent;
      }
    }
  }, [value]);

  // Ensure initial mount populates editor content if value is provided
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML === '') {
      editorRef.current.innerHTML = value;
      lastHtmlRef.current = value;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastHtmlRef.current = html;
      onChange(html);
    }
  };

  // Execute formatting command while preserving cursor selection
  const executeCommand = (command: string, valueArg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, valueArg);
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle standard hotkeys
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        executeCommand('bold');
      } else if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        executeCommand('italic');
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        executeCommand('underline');
      } else if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          executeCommand('redo');
        } else {
          executeCommand('undo');
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        executeCommand('redo');
      }
    }
  };

  const handleLinkInsert = () => {
    const url = prompt('Enter link URL (e.g. https://example.com):');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleMediaSelected = (url: string) => {
    executeCommand('insertImage', url);
  };

  const handleEmbedInsert = (embedData: EmbedMetadataResponse) => {
    const embedHtml = formatEmbedHtml(embedData, {
      width: 'wide',
      caption: embedData.caption,
      displayMode: embedData.displayMode || 'embed',
    });
    executeCommand('insertHTML', embedHtml + '<p><br></p>');
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text/plain')?.trim();
    if (pastedText && isValidUrl(pastedText)) {
      const detected = detectEmbedInfo(pastedText);
      if (detected) {
        e.preventDefault();
        try {
          const scraped = await embedsApi.scrape(pastedText);
          handleEmbedInsert(scraped);
        } catch {
          const fallbackData: EmbedMetadataResponse = {
            url: pastedText,
            provider: detected.provider,
            providerName: detected.providerName,
            videoId: detected.videoId,
            embedUrl: detected.embedUrl || pastedText,
            title: `${detected.providerName} Media`,
            aspectRatio: '16:9',
            displayMode: detected.isMedia ? 'embed' : 'card',
            snapshottedAt: new Date().toISOString(),
          };
          handleEmbedInsert(fallbackData);
        }
      }
    }
  };

  // Format button helper that prevents mousedown from stealing focus
  const renderFormatButton = (
    title: string,
    icon: React.ReactNode,
    onClickAction: () => void,
  ) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClickAction();
      }}
      className="p-1.5 text-ink-secondary hover:text-ink-primary hover:bg-slate-100 transition-colors"
      style={{ borderRadius: 2 }}
    >
      {icon}
    </button>
  );

  return (
    <div
      className="flex flex-col bg-white border border-border-subtle focus-within:border-ink-primary transition-colors"
      style={{ borderRadius: 2 }}
    >
      {/* Editorial Minimalist Toolbar — strictly placed at the top of the box */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-canvas-paper border-b border-border-subtle">
        {renderFormatButton('Heading 2', <Heading2 className="w-3.5 h-3.5" />, () =>
          executeCommand('formatBlock', '<h2>'),
        )}
        {renderFormatButton('Heading 3', <Heading3 className="w-3.5 h-3.5" />, () =>
          executeCommand('formatBlock', '<h3>'),
        )}

        <div className="w-[1px] h-3.5 bg-border-subtle mx-1" />

        {renderFormatButton('Bold (Ctrl+B)', <Bold className="w-3.5 h-3.5" />, () =>
          executeCommand('bold'),
        )}
        {renderFormatButton('Italic (Ctrl+I)', <Italic className="w-3.5 h-3.5" />, () =>
          executeCommand('italic'),
        )}
        {renderFormatButton('Underline (Ctrl+U)', <Underline className="w-3.5 h-3.5" />, () =>
          executeCommand('underline'),
        )}
        {renderFormatButton('Strikethrough', <Strikethrough className="w-3.5 h-3.5" />, () =>
          executeCommand('strikeThrough'),
        )}
        {renderFormatButton('Code Block', <Code className="w-3.5 h-3.5" />, () =>
          executeCommand('formatBlock', '<pre>'),
        )}

        <div className="w-[1px] h-3.5 bg-border-subtle mx-1" />

        {renderFormatButton('Blockquote', <Quote className="w-3.5 h-3.5" />, () =>
          executeCommand('formatBlock', '<blockquote>'),
        )}
        {renderFormatButton('Bullet List', <List className="w-3.5 h-3.5" />, () =>
          executeCommand('insertUnorderedList'),
        )}
        {renderFormatButton('Numbered List', <ListOrdered className="w-3.5 h-3.5" />, () =>
          executeCommand('insertOrderedList'),
        )}

        <div className="w-[1px] h-3.5 bg-border-subtle mx-1" />

        {renderFormatButton('Insert Link', <LinkIcon className="w-3.5 h-3.5" />, handleLinkInsert)}
        {renderFormatButton(
          'Insert Image Asset',
          <ImageIcon className="w-3.5 h-3.5 text-accent-crimson" />,
          () => setMediaPickerOpen(true),
        )}
        {renderFormatButton(
          'Embed Video or Rich Link (YouTube, Vimeo, Loom, Spotify, X)',
          <Video className="w-3.5 h-3.5 text-indigo-600" />,
          () => {
            setEmbedModalUrl('');
            setEmbedModalOpen(true);
          },
        )}
        {renderFormatButton('Clear Formatting', <RemoveFormatting className="w-3.5 h-3.5" />, () =>
          executeCommand('removeFormat'),
        )}

        <div className="w-[1px] h-3.5 bg-border-subtle mx-1" />

        {renderFormatButton('Undo (Ctrl+Z)', <Undo className="w-3.5 h-3.5" />, () =>
          executeCommand('undo'),
        )}
        {renderFormatButton('Redo (Ctrl+Y)', <Redo className="w-3.5 h-3.5" />, () =>
          executeCommand('redo'),
        )}
      </div>

      {/* Editable Manuscript Canvas — directly beneath the toolbar */}
      <div
        ref={editorRef}
        contentEditable={true}
        suppressContentEditableWarning={true}
        spellCheck={true}
        onInput={handleInput}
        onBlur={handleInput}
        onKeyUp={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        style={{ minHeight: '480px', outline: 'none' }}
        className="manuscript-editor w-full p-8 text-ink-primary text-base sm:text-lg leading-relaxed font-sans cursor-text focus:outline-none"
      />

      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelected}
      />

      <RichEmbedModal
        isOpen={embedModalOpen}
        initialUrl={embedModalUrl}
        onClose={() => setEmbedModalOpen(false)}
        onInsert={handleEmbedInsert}
      />
    </div>
  );
};
