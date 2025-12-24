
import React, { useEffect, useRef } from 'react';

interface HandTrackerProps {
  onMove: (lane: number) => void;
  onLost: () => void;
  onReady: () => void;
}

const HandTracker: React.FC<HandTrackerProps> = ({ onMove, onLost, onReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Use MediaPipe from global scope (loaded via script tags in index.html)
    const { Hands, Camera, drawConnectors, drawLandmarks, HAND_CONNECTIONS } = (window as any);
    
    if (!Hands) {
      console.error("MediaPipe Hands not found in global scope");
      return;
    }

    const hands = new Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });

    hands.onResults((results: any) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !canvasRef.current) return;

      // Clear and draw preview
      ctx.save();
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Draw skeleton for visual feedback
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 });

        // Calculate horizontal center of hand (using wrist index 0 and palm index 9)
        const wristX = landmarks[0].x;
        const middlePalmX = landmarks[9].x;
        const handCenterX = (wristX + middlePalmX) / 2;

        /**
         * Mapping horizontal position to lanes:
         * 0.0 - 0.4: Right (Camera is mirrored, so x=0 is right from user perspective)
         * 0.4 - 0.6: Center
         * 0.6 - 1.0: Left
         * Note: handCenterX is 0.0 to 1.0 (left to right in video frame)
         * Since webcam is usually mirrored, we need to handle that.
         */
        
        // Inverting for user-natural movement (Left hand movement -> Left lane)
        const normalizedX = 1 - handCenterX; 

        let lane = 1; // Default center
        if (normalizedX < 0.38) lane = 0;
        else if (normalizedX > 0.62) lane = 2;
        
        onMove(lane);
      } else {
        onLost();
      }
      ctx.restore();
    });

    handsRef.current = hands;

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        await hands.send({ image: videoRef.current! });
      },
      width: 640,
      height: 480,
    });
    
    cameraRef.current = camera;
    camera.start().then(() => {
      onReady();
    });

    return () => {
      camera.stop();
      hands.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full object-cover scale-x-[-1]"
        width={320}
        height={240}
      />
    </div>
  );
};

export default HandTracker;
