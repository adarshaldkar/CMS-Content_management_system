import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  Settings,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Slider } from '../ui/slider';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  aspectRatio?: '16:9' | '4:3' | '9:16' | '1:1';
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title,
  aspectRatio = '16:9',
  autoplay = false,
  loop = false,
  muted = false,
  controls = true,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(muted ? 0 : 1);
  const [isMuted, setIsMuted] = useState(muted);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial Autoplay & Muted Enforcer
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      if (autoplay) {
        videoRef.current.muted = true;
        setIsMuted(true);
        videoRef.current.play().catch(() => {});
      }
    }
  }, [src]);

  // Sync Video Events
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBuffered(bufferedEnd);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const targetTime = value[0];
    if (videoRef.current && typeof targetTime === 'number') {
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVol = value[0] / 100;
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      setVolume(newVol);
      if (newVol === 0) {
        videoRef.current.muted = true;
        setIsMuted(true);
      } else if (isMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextState = !isMuted;
      videoRef.current.muted = nextState;
      setIsMuted(nextState);
      if (!nextState && volume === 0) {
        setVolume(0.8);
        videoRef.current.volume = 0.8;
      }
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  };

  // Keep the fullscreen button icon truthful when the user exits with Esc.
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Auto-hide controls on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Keyboard Shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Do not intercept keys when the user is typing in an input, or when the
    // event originated inside a contentEditable subtree (e.g. rich-text editor).
    if (e.nativeEvent.composed) {
      const composedTarget = e.nativeEvent.composedPath()[0] as HTMLElement | undefined;
      if (composedTarget?.closest?.('[contenteditable="true"]')) return;
    }
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if ((e.target as HTMLElement).closest?.('[contenteditable="true"]')) return;

    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleSeek([Math.max(0, currentTime - 5)]);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleSeek([Math.min(duration, currentTime + 5)]);
    } else if (e.key === 'm') {
      e.preventDefault();
      toggleMute();
    } else if (e.key === 'f') {
      e.preventDefault();
      toggleFullscreen();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const aspectClass =
    aspectRatio === '4:3'
      ? 'aspect-4/3'
      : aspectRatio === '9:16'
      ? 'aspect-9/16'
      : aspectRatio === '1:1'
      ? 'aspect-square'
      : 'aspect-video';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative w-full rounded-md overflow-hidden bg-slate-950 border border-slate-800 shadow-md group focus:outline-none select-none',
        aspectClass,
        className,
      )}
    >
      {/* HTML5 Native Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop={loop}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          // Bug #2 fix: reset play state and show overlay when video finishes
          setIsPlaying(false);
          setShowControls(true);
        }}
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Play/Pause Overlay Icon */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs transition-opacity hover:bg-black/40"
        >
          <div className="w-16 h-16 rounded-full bg-accent-crimson text-white flex items-center justify-center shadow-lg transition-transform transform hover:scale-110">
            <Play size={28} className="translate-x-0.5" />
          </div>
        </button>
      )}

      {/* Overlay Title Bar */}
      {title && showControls && (
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white animate-fade-in pointer-events-none">
          <span className="font-serif font-bold text-sm tracking-tight truncate">
            {title}
          </span>
          <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded text-slate-200">
            Native Stream
          </span>
        </div>
      )}

      {/* Custom Control Bar powered by shadcn UI */}
      {controls && (
        <div
          className={cn(
            'absolute bottom-0 inset-x-0 p-3.5 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 transition-opacity duration-300',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none',
          )}
        >
          {/* Timeline Scrubber Slider (shadcn) */}
          <div className="relative w-full flex items-center">
            <Slider
              value={[currentTime]}
              min={0}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>

          {/* Controls Bar Actions */}
          <div className="flex items-center justify-between text-white text-xs font-mono">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 hover:text-accent-crimson transition-colors"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 hover:text-accent-crimson transition-colors"
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <div className="w-16 hidden sm:block">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                  />
                </div>
              </div>

              {/* Time Indicator */}
              <span className="text-[11px] text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Playback Speed Menu (shadcn DropdownMenu) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-[11px] font-mono transition-colors flex items-center gap-1"
                  >
                    <span>{playbackRate}x</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-white">
                  <DropdownMenuLabel>Playback Speed</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-800" />
                  {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onClick={() => handleRateChange(rate)}
                      className={cn(
                        'cursor-pointer text-xs font-mono',
                        playbackRate === rate ? 'text-accent-crimson font-bold' : '',
                      )}
                    >
                      {rate}x {rate === 1.0 && '(Normal)'}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Picture-in-Picture */}
              <button
                type="button"
                onClick={togglePiP}
                className="p-1 hover:text-accent-crimson transition-colors"
                title="Picture in Picture"
              >
                <PictureInPicture size={16} />
              </button>

              {/* Fullscreen */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 hover:text-accent-crimson transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
