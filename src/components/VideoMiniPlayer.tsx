import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface VideoMiniPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string;
  startTime?: number; // Start time in seconds
}

export function VideoMiniPlayer({ isOpen, onClose, videoSrc, startTime }: VideoMiniPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragControls = useDragControls();
  const { t } = useTranslation();

  // Reset position and expanded state when closing
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Set start time when video opens
  useEffect(() => {
    if (isOpen && videoRef.current && startTime !== undefined) {
      videoRef.current.currentTime = startTime;
    }
  }, [isOpen, startTime]);

  // Pause video when minimizing or closing
  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onClose();
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Reset position when expanding
    if (!isExpanded) {
      setPosition({ x: 0, y: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay when expanded */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={handleClose}
            />
          )}

          {/* Video player container */}
          <motion.div
            drag={!isExpanded}
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              setPosition({
                x: position.x + info.offset.x,
                y: position.y + info.offset.y,
              });
            }}
            initial={{
              opacity: 0,
              scale: 0.8,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: isExpanded ? 0 : position.x,
              y: isExpanded ? 0 : position.y,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
            }}
            className={cn(
              "fixed z-50",
              isExpanded
                ? "inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[80vw] md:max-w-5xl md:h-auto"
                : "bottom-24 right-6 w-80 md:w-96"
            )}
          >
            <div
              className={cn(
                "bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10",
                "flex flex-col"
              )}
            >
              {/* Header bar - only show in mini mode for dragging */}
              {!isExpanded && (
                <div
                  className="flex items-center justify-between px-3 py-2 bg-white/5 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="flex items-center gap-2 text-white/60">
                    <GripHorizontal className="w-4 h-4" />
                    <span className="text-xs">Video Tutorial</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleToggleExpand}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      aria-label={t('videoPlayer.expand')}
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      aria-label={t('videoPlayer.close')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Video element */}
              <div className={cn("relative", isExpanded ? "aspect-video" : "aspect-video")}>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  controls
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                  playsInline
                >
                  Your browser does not support the video element.
                </video>

                {/* Expanded mode controls overlay */}
                {isExpanded && (
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                      onClick={handleToggleExpand}
                      className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
                      aria-label={t('videoPlayer.minimize')}
                    >
                      <Minimize2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleClose}
                      className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
                      aria-label={t('videoPlayer.close')}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
