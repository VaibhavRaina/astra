'use client';

import { useState, useCallback, useRef } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import { JewelryMetadata, LandmarkData, MediaPipeProcessingResult } from '@/lib/types';

// Constants for Scaling
const REFERENCE_SIZES_MM = {
  earrings: 15, // Approx. earlobe width
  necklace: 120, // Approx. neck width
  ring: 18, // Approx. finger width
  bracelet: 55, // Approx. wrist width
};

export function useMediaPipeLandmarks() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);

  const initializeMediaPipe = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      setError(null);
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      
      faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
      });
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numHands: 2,
      });
      
      setIsInitialized(true);
      console.log('MediaPipe initialized successfully on client-side.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize MediaPipe';
      setError(errorMessage);
      console.error('Failed to initialize MediaPipe:', err);
    }
  }, [isInitialized]);

  const processImage = useCallback(async (
    imageFile: File | string,
    jewelryType: JewelryMetadata['type']
  ): Promise<MediaPipeProcessingResult> => {
    if (!isInitialized) {
      await initializeMediaPipe();
      if (!isInitialized) {
        return { landmarks: null, error: 'MediaPipe not initialized', confidence: 0 };
      }
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert image to HTMLImageElement
      const img = await loadImage(imageFile);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Detect landmarks based on jewelry type
      let landmarks: LandmarkData | null = null;
      
      if (jewelryType === 'earrings' || jewelryType === 'necklace') {
        if (!faceLandmarkerRef.current) {
          throw new Error('Face landmarker not initialized');
        }
        const result = faceLandmarkerRef.current.detect(img);
        console.log('Face detection result:', result);
        if (result.faceLandmarks.length > 0) {
          landmarks = extractFaceLandmarks(
            result.faceLandmarks[0],
            jewelryType,
            img.width,
            img.height
          );
        }
      } else if (jewelryType === 'ring' || jewelryType === 'bracelet') {
        if (!handLandmarkerRef.current) {
          throw new Error('Hand landmarker not initialized');
        }
        const result = handLandmarkerRef.current.detect(img);
        console.log('Hand detection result:', result);
        if (result.landmarks.length > 0) {
          for (const handLandmarks of result.landmarks) {
            landmarks = extractHandLandmarks(
              handLandmarks,
              jewelryType,
              img.width,
              img.height
            );
            if (landmarks) break; // Stop if landmarks are found for any hand
          }
        }
      }

      if (!landmarks) {
        throw new Error(`No landmarks detected for jewelry type: ${jewelryType}. Ensure the subject is clearly visible.`);
      }

      const confidence = landmarks ? 0.95 : 0;
      return { landmarks, confidence };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      return { landmarks: null, error: errorMessage, confidence: 0 };
    } finally {
      setIsProcessing(false);
    }
  }, [isInitialized, initializeMediaPipe]);

  return {
    isInitialized,
    isProcessing,
    error,
    initializeMediaPipe,
    processImage,
  };
}

// Helper functions
async function loadImage(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(source);
    }
  });
}

function extractFaceLandmarks(
  landmarks: NormalizedLandmark[],
  type: 'earrings' | 'necklace',
  imgWidth: number,
  imgHeight: number
): LandmarkData | null {
  if (type === 'earrings') {
    const earLandmarks = [
      landmarks[132],
      landmarks[135],
      landmarks[165],
      landmarks[150],
    ]; // Left earlobe region
    if (earLandmarks.some(l => !l)) return null;

    const pixelLandmarks = earLandmarks.map(l => ({
      x: l.x * imgWidth,
      y: l.y * imgHeight,
    }));
    const refWidth = Math.abs(pixelLandmarks[0].x - pixelLandmarks[2].x) * 1.2;
    const position = {
      x: (pixelLandmarks[0].x + pixelLandmarks[2].x) / 2,
      y: (pixelLandmarks[0].y + pixelLandmarks[2].y) / 2,
    };

    return {
      position,
      refWidth,
      region: createRegionFromPoints(pixelLandmarks, 1.5),
      imageWidth: imgWidth,
      imageHeight: imgHeight,
    };
  }
  
  if (type === 'necklace') {
    const p1 = { x: landmarks[205].x * imgWidth, y: landmarks[205].y * imgHeight }; // Left side
    const p2 = { x: landmarks[425].x * imgWidth, y: landmarks[425].y * imgHeight }; // Right side
    const p3 = { x: landmarks[152].x * imgWidth, y: (landmarks[152].y + 0.1) * imgHeight }; // Bottom

    const refWidth = Math.abs(p1.x - p2.x);
    const position = { 
      x: landmarks[152].x * imgWidth, 
      y: landmarks[152].y * imgHeight + refWidth * 0.2 
    };

    return {
      position,
      refWidth,
      region: createRegionFromPoints([p1, p2, p3], 1.2),
      imageWidth: imgWidth,
      imageHeight: imgHeight,
    };
  }
  
  return null;
}

function extractHandLandmarks(
  landmarks: NormalizedLandmark[],
  type: 'ring' | 'bracelet',
  imgWidth: number,
  imgHeight: number
): LandmarkData | null {
  if (type === 'ring') {
    // Try to find a suitable finger for the ring (ring, middle, or index finger)
    const fingerOptions = [
      { base: 13, mid: 14 }, // RING_FINGER_MCP, RING_FINGER_PIP
      { base: 9, mid: 10 },  // MIDDLE_FINGER_MCP, MIDDLE_FINGER_PIP
      { base: 5, mid: 6 },   // INDEX_FINGER_MCP, INDEX_FINGER_PIP
    ];

    for (const finger of fingerOptions) {
      const fingerBase = landmarks[finger.base];
      const fingerMid = landmarks[finger.mid];

      if (fingerBase && fingerMid) {
        const pBase = { x: fingerBase.x * imgWidth, y: fingerBase.y * imgHeight };
        const pMid = { x: fingerMid.x * imgWidth, y: fingerMid.y * imgHeight };

        const refWidth = Math.abs(pBase.x - pMid.x) * 2.5; // Approx finger width
        const position = { x: (pBase.x + pMid.x) / 2, y: (pBase.y + pMid.y) / 2 };

        return {
          position,
          refWidth,
          region: createRegionFromPoints([pBase, pMid], 3),
          imageWidth: imgWidth,
          imageHeight: imgHeight,
        };
      }
    }
    return null; // No suitable finger found
  }
  
  if (type === 'bracelet') {
    const wrist1 = landmarks[0]; // WRIST
    const wrist2 = landmarks[5]; // INDEX_FINGER_MCP
    const wrist3 = landmarks[17]; // PINKY_MCP
    if (!wrist1 || !wrist2 || !wrist3) return null;

    const p1 = { x: wrist1.x * imgWidth, y: wrist1.y * imgHeight };
    const p2 = { x: wrist2.x * imgWidth, y: wrist2.y * imgHeight };
    const p3 = { x: wrist3.x * imgWidth, y: wrist3.y * imgHeight };

    const refWidth = Math.abs(p2.x - p3.x);
    const position = { x: p1.x, y: p1.y };

    return {
      position,
      refWidth,
      region: createRegionFromPoints([
        p2, 
        p3, 
        {x: p3.x, y: p3.y + refWidth * 0.5}, 
        {x: p2.x, y: p2.y + refWidth * 0.5}
      ], 1.2),
      imageWidth: imgWidth,
      imageHeight: imgHeight,
    };
  }
  
  return null;
}

function createRegionFromPoints(
  points: { x: number; y: number }[],
  paddingFactor: number = 1.0
) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = (maxX - minX) * paddingFactor;
  const height = (maxY - minY) * paddingFactor;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const expandedMinX = centerX - width / 2;
  const expandedMinY = centerY - height / 2;

  // Create a bounding box as the region
  const regionPoints = [
    { x: expandedMinX, y: expandedMinY },
    { x: expandedMinX + width, y: expandedMinY },
    { x: expandedMinX + width, y: expandedMinY + height },
    { x: expandedMinX, y: expandedMinY + height },
  ];

  return {
    points: regionPoints,
    width: Math.round(width),
    height: Math.round(height),
    minX: Math.round(expandedMinX),
    minY: Math.round(expandedMinY),
  };
}
