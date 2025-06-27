'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Image as ImageIcon, Zap, Download } from 'lucide-react';

interface ImagePreprocessorProps {
  originalImage: string;
  onProcessedImage: (processedImage: string) => void;
}

interface PreprocessingSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  backgroundRemoval: boolean;
  noiseReduction: number;
}

export function ImagePreprocessor({ originalImage, onProcessedImage }: ImagePreprocessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<PreprocessingSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sharpness: 100,
    backgroundRemoval: false,
    noiseReduction: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');

  useEffect(() => {
    if (originalImage) {
      processImage();
    }
  }, [originalImage, settings]);

  const processImage = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Load original image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = originalImage;
      });

      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply preprocessing filters
      await applyPreprocessing(ctx, img, settings);
      
      // Convert to data URL
      const processedUrl = canvas.toDataURL('image/png');
      setProcessedImageUrl(processedUrl);
      onProcessedImage(processedUrl);
      
    } catch (error) {
      console.error('Error preprocessing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPreprocessing = async (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    settings: PreprocessingSettings
  ) => {
    // Draw original image
    ctx.drawImage(img, 0, 0);
    
    // Get image data for pixel manipulation
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // Apply brightness, contrast, and saturation
    for (let i = 0; i < data.length; i += 4) {
      // Brightness adjustment
      const brightnessFactor = settings.brightness / 100;
      data[i] = Math.min(255, data[i] * brightnessFactor);     // Red
      data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor); // Green
      data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor); // Blue
      
      // Contrast adjustment
      const contrastFactor = settings.contrast / 100;
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
      
      // Saturation adjustment (simplified)
      if (settings.saturation !== 100) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const satFactor = settings.saturation / 100;
        data[i] = Math.min(255, Math.max(0, gray + (data[i] - gray) * satFactor));
        data[i + 1] = Math.min(255, Math.max(0, gray + (data[i + 1] - gray) * satFactor));
        data[i + 2] = Math.min(255, Math.max(0, gray + (data[i + 2] - gray) * satFactor));
      }
    }
    
    // Apply noise reduction (simplified blur)
    if (settings.noiseReduction > 0) {
      applyGaussianBlur(data, img.width, img.height, settings.noiseReduction / 10);
    }
    
    // Put processed image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Apply sharpening if needed
    if (settings.sharpness !== 100) {
      applySharpening(ctx, img.width, img.height, settings.sharpness / 100);
    }
  };

  const applyGaussianBlur = (data: Uint8ClampedArray, width: number, height: number, radius: number) => {
    // Simplified Gaussian blur implementation
    // In a real implementation, you'd use a proper Gaussian kernel
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Average with surrounding pixels
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborIdx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += tempData[neighborIdx];
              count++;
            }
          }
          
          data[idx + c] = Math.round(sum / count);
        }
      }
    }
  };

  const applySharpening = (ctx: CanvasRenderingContext2D, width: number, height: number, factor: number) => {
    // Simplified sharpening using unsharp mask technique
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const originalData = new Uint8ClampedArray(data);
    
    // Apply sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const neighborIdx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sum += originalData[neighborIdx] * kernel[kernelIdx];
            }
          }
          
          data[idx + c] = Math.min(255, Math.max(0, sum * factor + originalData[idx + c] * (1 - factor)));
        }
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const resetSettings = () => {
    setSettings({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpness: 100,
      backgroundRemoval: false,
      noiseReduction: 0,
    });
  };

  const downloadProcessed = () => {
    if (processedImageUrl) {
      const link = document.createElement('a');
      link.href = processedImageUrl;
      link.download = `preprocessed-image-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-purple-500" />
            <span>Image Preprocessing</span>
          </div>
          <Badge variant="outline" className="text-xs">
            <ImageIcon className="w-3 h-3 mr-1" />
            Enhanced Quality
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preview */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-auto border rounded-lg shadow-sm"
            style={{ maxHeight: '300px', objectFit: 'contain' }}
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <div className="text-white text-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm">Processing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Brightness</Label>
            <div className="mt-2">
              <Slider
                value={[settings.brightness]}
                onValueChange={(value) => setSettings({ ...settings, brightness: value[0] })}
                max={200}
                min={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>50%</span>
                <span className="font-medium">{settings.brightness}%</span>
                <span>200%</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Contrast</Label>
            <div className="mt-2">
              <Slider
                value={[settings.contrast]}
                onValueChange={(value) => setSettings({ ...settings, contrast: value[0] })}
                max={200}
                min={50}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>50%</span>
                <span className="font-medium">{settings.contrast}%</span>
                <span>200%</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Saturation</Label>
            <div className="mt-2">
              <Slider
                value={[settings.saturation]}
                onValueChange={(value) => setSettings({ ...settings, saturation: value[0] })}
                max={200}
                min={0}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0%</span>
                <span className="font-medium">{settings.saturation}%</span>
                <span>200%</span>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Noise Reduction</Label>
            <div className="mt-2">
              <Slider
                value={[settings.noiseReduction]}
                onValueChange={(value) => setSettings({ ...settings, noiseReduction: value[0] })}
                max={10}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>None</span>
                <span className="font-medium">{settings.noiseReduction}</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button onClick={resetSettings} variant="outline" className="flex-1">
            Reset
          </Button>
          <Button onClick={downloadProcessed} variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
