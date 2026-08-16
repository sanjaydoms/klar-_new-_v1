import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RotateCw, Check } from 'lucide-react';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  documentType: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onCapture,
  documentType,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // Start with rear camera

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
      setError('');
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError('');

      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image as data URL
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(imageDataUrl);

        // Stop camera preview
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      // Convert data URL to File
      fetch(capturedImage)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `${documentType}_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          onCapture(file);
          onClose();
        });
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
          <h3 className="text-white font-semibold text-lg">
            {capturedImage ? 'Review Photo' : 'Take Photo'}
          </h3>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {error ? (
          <div className="text-center p-6">
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
              <p className="text-white text-lg font-semibold mb-2">Camera Error</p>
              <p className="text-white/80 text-sm mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          // Preview captured image
          <img
            src={capturedImage}
            alt="Captured"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          // Live camera preview
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
          />
        )}

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
        {capturedImage ? (
          // Captured image controls
          <div className="flex items-center justify-center gap-6">
            <button onClick={retakePhoto} className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <RotateCw size={28} className="text-white" />
              </div>
              <span className="text-white text-sm font-medium">Retake</span>
            </button>

            <button onClick={confirmPhoto} className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors shadow-lg">
                <Check size={36} className="text-white" />
              </div>
              <span className="text-white text-sm font-medium">Use Photo</span>
            </button>
          </div>
        ) : (
          // Camera controls
          <div className="flex items-center justify-between">
            <div className="w-16" /> {/* Spacer */}
            <button
              onClick={capturePhoto}
              disabled={!!error}
              className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <div className="w-16 h-16 rounded-full border-4 border-black" />
            </button>
            <button
              onClick={switchCamera}
              disabled={!!error}
              className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <RotateCw size={24} className="text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Guide overlay */}
      {!capturedImage && !error && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="border-2 border-white/50 rounded-xl w-[90%] h-[70%] max-w-md" />
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
