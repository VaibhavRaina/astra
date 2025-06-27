'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Target, Zap } from 'lucide-react';

interface MediaPipeProcessorProps {
  imageUrl: string;
  jewelryType: string;
  onLandmarksDetected: (landmarks: any) => void;
}

export function MediaPipeProcessor({ imageUrl, jewelryType, onLandmarksDetected }: MediaPipeProcessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [landmarks, setLandmarks] = useState<any>(null);
  const [confidence, setConfidence] = useState<number>(0);

  useEffect(() => {
    if (imageUrl) {
      processImage();
    }
  }, [imageUrl, jewelryType]);

  const processImage = async () => {
    setIsProcessing(true);
    
    try {
      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Set up canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Process with MediaPipe (simplified mock implementation)
      const detectedLandmarks = await detectLandmarks(img, jewelryType);
      
      // Draw landmarks on canvas
      drawLandmarks(ctx, detectedLandmarks);
      
      setLandmarks(detectedLandmarks);
      setConfidence(0.85 + Math.random() * 0.1);
      onLandmarksDetected(detectedLandmarks);
      
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const detectLandmarks = async (image: HTMLImageElement, type: string): Promise<any> => {
    // This would integrate with actual MediaPipe libraries
    // For now, we'll simulate landmark detection
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
    
    const width = image.width;
    const height = image.height;
    
    switch (type.toLowerCase()) {
      case 'earrings':
        return {
          type: 'face',
          landmarks: [
            { x: width * 0.15, y: height * 0.35, label: 'left_ear' },
            { x: width * 0.85, y: height * 0.35, label: 'right_ear' },
            { x: width * 0.50, y: height * 0.30, label: 'nose_tip' },
            { x: width * 0.50, y: height * 0.70, label: 'chin' },
          ],
          confidence: 0.92
        };
      
      case 'necklace':
        return {
          type: 'pose',
          landmarks: [
            { x: width * 0.35, y: height * 0.75, label: 'neck_left' },
            { x: width * 0.50, y: height * 0.80, label: 'neck_center' },
            { x: width * 0.65, y: height * 0.75, label: 'neck_right' },
            { x: width * 0.30, y: height * 0.40, label: 'shoulder_left' },
            { x: width * 0.70, y: height * 0.40, label: 'shoulder_right' },
          ],
          confidence: 0.88
        };
      
      case 'ring':
        return {
          type: 'hand',
          landmarks: [
            { x: width * 0.45, y: height * 0.70, label: 'index_finger' },
            { x: width * 0.50, y: height * 0.68, label: 'middle_finger' },
            { x: width * 0.55, y: height * 0.70, label: 'ring_finger' },
            { x: width * 0.60, y: height * 0.75, label: 'pinky_finger' },
            { x: width * 0.35, y: height * 0.78, label: 'thumb' },
          ],
          confidence: 0.90
        };
      
      case 'bracelet':
        return {
          type: 'hand',
          landmarks: [
            { x: width * 0.40, y: height * 0.85, label: 'wrist_left' },
            { x: width * 0.60, y: height * 0.85, label: 'wrist_right' },
            { x: width * 0.50, y: height * 0.80, label: 'palm_center' },
          ],
          confidence: 0.87
        };
      
      default:
        return {
          type: 'unknown',
          landmarks: [],
          confidence: 0.5
        };
    }
  };

  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any) => {
    if (!landmarks || !landmarks.landmarks) return;
    
    ctx.fillStyle = '#ff6b6b';
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    
    landmarks.landmarks.forEach((landmark: any, index: number) => {
      // Draw landmark point
      ctx.beginPath();
      ctx.arc(landmark.x, landmark.y, 4, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(landmark.label || `Point ${index}`, landmark.x + 8, landmark.y - 8);
      ctx.fillStyle = '#ff6b6b';
    });
    
    // Draw connections for specific jewelry types
    if (landmarks.type === 'face' && landmarks.landmarks.length >= 2) {
      // Connect ears for earrings
      const leftEar = landmarks.landmarks.find((l: any) => l.label === 'left_ear');
      const rightEar = landmarks.landmarks.find((l: any) => l.label === 'right_ear');
      if (leftEar && rightEar) {
        ctx.beginPath();
        ctx.moveTo(leftEar.x, leftEar.y);
        ctx.lineTo(rightEar.x, rightEar.y);
        ctx.stroke();
      }
    }
    
    if (landmarks.type === 'pose') {
      // Connect neck points for necklaces
      const neckPoints = landmarks.landmarks.filter((l: any) => l.label.includes('neck'));
      for (let i = 0; i < neckPoints.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(neckPoints[i].x, neckPoints[i].y);
        ctx.lineTo(neckPoints[i + 1].x, neckPoints[i + 1].y);
        ctx.stroke();
      }
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span>Landmark Detection</span>
          </div>
          <Badge variant={landmarks ? "default" : "secondary"} className="text-xs">
            {landmarks ? `${(confidence * 100).toFixed(0)}% Confidence` : 'Processing...'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-auto border rounded-lg shadow-sm"
            style={{ maxHeight: '400px', objectFit: 'contain' }}
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Detecting landmarks...</p>
              </div>
            </div>
          )}
        </div>
        
        {landmarks && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-600 mb-1">
                <Eye className="w-4 h-4" />
                <span className="text-xs">Landmarks Found</span>
              </div>
              <div className="font-semibold text-slate-800">{landmarks.landmarks?.length || 0}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 text-slate-600 mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-xs">Detection Type</span>
              </div>
              <div className="font-semibold text-slate-800 capitalize">{landmarks.type}</div>
            </div>
          </div>
        )}
        
        <Button 
          onClick={processImage}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>Re-detect Landmarks</span>
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
