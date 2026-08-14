import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IntroVideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VIDEO_ID = 'fEPXBxGTyco';

// Minimal typings for the YouTube IFrame API we use.
type YTPlayer = { destroy: () => void };
declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLIFrameElement,
        opts: {
          events: {
            onStateChange: (e: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const loadYouTubeApi = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.dataset.ytIframeApi = '1';
      document.body.appendChild(s);
    }
  });
};

const IntroVideoModal = ({ open, onOpenChange }: IntroVideoModalProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    if (!open || !iframeRef.current) return;
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !iframeRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(iframeRef.current, {
        events: {
          onStateChange: (e) => {
            if (e.data === window.YT?.PlayerState.ENDED) {
              onOpenChange(false);
            }
          },
        },
      });
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [open, onOpenChange]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?si=5bABAMf0JVwVkk3K&controls=1&autoplay=1&mute=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome — please watch this short intro</DialogTitle>
          <DialogDescription>
            Please watch the whole video. It will autoplay (muted by default — unmute using the player controls). You can close this anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md overflow-hidden border border-border bg-black">
          <iframe
            ref={iframeRef}
            src={src}
            referrerPolicy="strict-origin-when-cross-origin"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="w-full aspect-video"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntroVideoModal;
