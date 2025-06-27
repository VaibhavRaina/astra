export interface JewelryMetadata {
  width: number; // in mm
  height: number; // in mm
  type: 'necklace' | 'ring' | 'earrings' | 'bracelet';
}

export interface LandmarkData {
  position: { x: number; y: number }; // Center point for overlay
  refWidth: number; // Reference width in pixels for scaling
  region: {
    points: { x: number; y: number }[];
    width: number;
    height: number;
    minX: number;
    minY: number;
  };
  imageWidth: number;
  imageHeight: number;
}

export interface TryOnRequest {
  jewelryImage: string; // URL or base64
  jewelryMetadata: JewelryMetadata;
  modelImage?: string; // URL or base64
  landmarks?: LandmarkData; // Pre-computed landmarks from client
  modelPrompt?: string;
  method: 'prompt' | 'upload' | 'both';
}

export interface TryOnResult {
  processedImage: string; // base64
  originalImage: string;
  jewelryImage: string;
  metadata: JewelryMetadata;
  processingTime: number;
  confidence: number;
  method: 'prompt' | 'upload' | 'both';
}

export interface MediaPipeProcessingResult {
  landmarks: LandmarkData | null;
  error?: string;
  confidence: number;
}
