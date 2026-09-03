import React, { useState, useEffect } from 'react';
import { Upload, Film, Check, AlertCircle, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { cn } from '../../lib/utils';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (videoData: {
    url: string;
    posterUrl?: string;
    caption?: string;
    width: 'standard' | 'wide' | 'full';
    autoplay: boolean;
    loop: boolean;
  }) => void;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [width, setWidth] = useState<'standard' | 'wide' | 'full'>('wide');
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [libraryVideos, setLibraryVideos] = useState<Array<{ id: string; url: string; originalName: string; size: number }>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setVideoUrl('');
      setPosterUrl('');
      setCaption('');
      setErrorMsg(null);
      setUploadProgress(0);
      fetchLibraryVideos();
    }
  }, [isOpen]);

  const fetchLibraryVideos = async () => {
    try {
      setLoadingLibrary(true);
      const { data } = await apiClient.get('/media?limit=50');
      const items = Array.isArray(data) ? data : data?.items || [];
      const videos = items.filter((m: any) => m.mimeType?.startsWith('video/') || m.filename?.startsWith('video-'));
      setLibraryVideos(videos);
    } catch {
      // Fallback
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const validExts = ['.mp4', '.webm', '.mov'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExts.includes(ext)) {
      setErrorMsg('Invalid file format. Please upload an MP4, WebM, or MOV clip.');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('Video exceeds the maximum allowable limit of 100 MB.');
      return;
    }

    setErrorMsg(null);
    setSelectedFile(file);
  };

  const handleUploadAndInsert = async () => {
    if (activeTab === 'upload' && selectedFile) {
      setIsUploading(true);
      setErrorMsg(null);
      setUploadProgress(10);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const { data } = await apiClient.post('/media/video/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total) {
              const pct = Math.round((evt.loaded * 90) / evt.total);
              setUploadProgress(10 + pct);
            }
          },
        });

        setUploadProgress(100);
        const finalStreamUrl = data.url || `/api/media/stream/${data.id}`;

        onInsert({
          url: finalStreamUrl,
          posterUrl: posterUrl.trim() || undefined,
          caption: caption.trim() || undefined,
          width,
          autoplay,
          loop,
        });

        onClose();
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || 'Video upload failed.');
      } finally {
        setIsUploading(false);
      }
    } else if (videoUrl) {
      onInsert({
        url: videoUrl,
        posterUrl: posterUrl.trim() || undefined,
        caption: caption.trim() || undefined,
        width,
        autoplay,
        loop,
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-6 bg-white border border-border-subtle shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-ink-primary">
              <Film size={16} />
            </div>
            <div>
              <DialogTitle className="font-serif font-bold text-base text-ink-primary">
                Insert Self-Hosted Video Asset
              </DialogTitle>
              <DialogDescription className="text-xs font-mono text-ink-secondary">
                Upload MP4, WebM, or MOV clips with byte-range streaming support
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabbed interface (shadcn Tabs) */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="upload" className="flex items-center gap-1.5">
              <Upload size={13} />
              <span>Upload Video</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-1.5">
              <Film size={13} />
              <span>Media Library</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Upload */}
          <TabsContent value="upload" className="space-y-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className="border-2 border-dashed border-slate-200 hover:border-accent-crimson/50 rounded-sm p-6 text-center bg-slate-50/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
                className="hidden"
                id="video-file-input"
              />
              <label htmlFor="video-file-input" className="cursor-pointer block space-y-2">
                <Upload size={24} className="mx-auto text-slate-400" />
                <div className="text-xs font-mono text-ink-primary font-medium">
                  {selectedFile ? (
                    <span className="text-accent-crimson font-bold">{selectedFile.name}</span>
                  ) : (
                    'Click to select or drag & drop video clip here'
                  )}
                </div>
                <div className="text-[10px] font-mono text-ink-secondary">
                  MP4, WebM, MOV up to 100 MB
                </div>
              </label>
            </div>

            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-mono text-ink-secondary">
                  <span>Uploading &amp; validating video headers...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Media Library */}
          <TabsContent value="library" className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {loadingLibrary ? (
              <div className="py-8 text-center text-xs font-mono text-ink-secondary flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" /> Loading library videos...
              </div>
            ) : libraryVideos.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-ink-secondary">
                No video assets found in Media Library. Upload a video clip above.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {libraryVideos.map((v) => {
                  const isSelected = videoUrl === v.url;
                  return (
                    <div
                      key={v.id}
                      onClick={() => {
                        setVideoUrl(v.url);
                        setSelectedFile(null);
                      }}
                      className={cn(
                        'p-2.5 border rounded cursor-pointer transition-all flex items-center gap-2 text-xs font-mono',
                        isSelected
                          ? 'border-accent-crimson bg-rose-50/50 text-accent-crimson font-bold'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-ink-primary',
                      )}
                    >
                      <Film size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate flex-1">{v.originalName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Video Block Customization Settings */}
        <div className="border-t border-border-subtle pt-4 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary block">
            Playback &amp; Layout Settings
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-mono text-ink-secondary">Width Alignment</Label>
              <div className="flex gap-1 mt-1">
                {(['standard', 'wide', 'full'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidth(w)}
                    className={cn(
                      'px-2.5 py-1 text-[11px] font-mono rounded capitalize transition-colors',
                      width === w
                        ? 'bg-ink-primary text-white font-medium'
                        : 'bg-slate-100 text-ink-secondary hover:bg-slate-200',
                    )}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay-switch" className="text-[11px] font-mono text-ink-secondary cursor-pointer">
                  Autoplay (Muted)
                </Label>
                <Switch
                  id="autoplay-switch"
                  checked={autoplay}
                  onCheckedChange={setAutoplay}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="loop-switch" className="text-[11px] font-mono text-ink-secondary cursor-pointer">
                  Loop Video
                </Label>
                <Switch
                  id="loop-switch"
                  checked={loop}
                  onCheckedChange={setLoop}
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-mono text-ink-secondary">Optional Caption</Label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Figure 2: Highlights of the key address..."
              className="h-8 text-xs font-sans mt-1"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleUploadAndInsert}
            disabled={isUploading || (!selectedFile && !videoUrl)}
            className="bg-accent-crimson hover:bg-rose-900 text-white font-mono text-xs flex items-center gap-1.5"
          >
            {isUploading ? <LoadingSpinner size="sm" /> : <Check size={14} />}
            <span>Insert Video</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
