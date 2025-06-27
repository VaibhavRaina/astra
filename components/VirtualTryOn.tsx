'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMediaPipeLandmarks } from '@/hooks/use-mediapipe-landmarks';
import { JewelryAnalysis } from './JewelryAnalysis';
import { JewelryMetadata, TryOnRequest, TryOnResult } from '@/lib/types';

export function VirtualTryOn() {
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [jewelryImage, setJewelryImage] = useState<string | null>(null);
  const [jewelryMetadata, setJewelryMetadata] = useState<JewelryMetadata>({
    width: 20,
    height: 20,
    type: 'earrings'
  });
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const modelFileRef = useRef<HTMLInputElement>(null);
  const jewelryFileRef = useRef<HTMLInputElement>(null);

  const {
    isInitialized,
    isProcessing: isMediaPipeProcessing,
    error: mediaPipeError,
    initializeMediaPipe,
    processImage
  } = useMediaPipeLandmarks();

  const handleFileUpload = useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (image: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleTryOn = useCallback(async () => {
    if (!modelImage || !jewelryImage) {
      setError('Please upload both model and jewelry images');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Initialize MediaPipe if needed
      setProcessingStep('Initializing AI models...');
      setProgress(10);
      
      if (!isInitialized) {
        await initializeMediaPipe();
      }

      // Step 2: Process landmarks
      setProcessingStep('Detecting landmarks...');
      setProgress(30);
      
      const landmarkResult = await processImage(modelImage, jewelryMetadata.type);
      
      if (!landmarkResult.landmarks) {
        throw new Error(landmarkResult.error || 'Failed to detect landmarks');
      }

      // Step 3: Send to server for processing
      setProcessingStep('Generating virtual try-on...');
      setProgress(60);

      const request: TryOnRequest = {
          modelImage,
          jewelryImage,
          jewelryMetadata,
          landmarks: landmarkResult.landmarks,
          modelPrompt: `A person wearing ${jewelryMetadata.type}, photorealistic, high quality`,
          method: 'upload'
      };

      const response = await fetch('/api/try-on', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to process try-on');
      }

      const tryOnResult: TryOnResult = await response.json();
      
      setProcessingStep('Finalizing result...');
      setProgress(100);
      
      setResult(tryOnResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Try-on error:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      setProgress(0);
    }
  }, [modelImage, jewelryImage, jewelryMetadata, isInitialized, initializeMediaPipe, processImage]);

  const resetAll = useCallback(() => {
    setModelImage(null);
    setJewelryImage(null);
    setResult(null);
    setError(null);
    if (modelFileRef.current) modelFileRef.current.value = '';
    if (jewelryFileRef.current) jewelryFileRef.current.value = '';
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Virtual Jewelry Try-On
        </h1>
        <p className="text-gray-600">
          Upload your photo and jewelry to see how it looks with advanced AI technology
        </p>
      </div>

      {/* MediaPipe Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            {isInitialized ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700">AI models ready</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-amber-700">AI models will initialize on first use</span>
              </>
            )}
          </div>
          {mediaPipeError && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{mediaPipeError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="w-5 h-5" />
                <span>Upload Images</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Model Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="model-image">Model Photo</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {modelImage ? (
                    <div className="space-y-2">
                      <img
                        src={modelImage}
                        alt="Model"
                        className="max-h-32 mx-auto rounded"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => modelFileRef.current?.click()}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 mx-auto text-gray-400" />
                      <Button
                        variant="outline"
                        onClick={() => modelFileRef.current?.click()}
                      >
                        Upload Model Photo
                      </Button>
                      <p className="text-xs text-gray-500">
                        Clear photo showing face/hands for best results
                      </p>
                    </div>
                  )}
                  <input
                    ref={modelFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, setModelImage)}
                  />
                </div>
              </div>

              {/* Jewelry Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="jewelry-image">Jewelry Image</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  {jewelryImage ? (
                    <div className="space-y-2">
                      <img
                        src={jewelryImage}
                        alt="Jewelry"
                        className="max-h-32 mx-auto rounded"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => jewelryFileRef.current?.click()}
                      >
                        Change Image
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Sparkles className="w-8 h-8 mx-auto text-gray-400" />
                      <Button
                        variant="outline"
                        onClick={() => jewelryFileRef.current?.click()}
                      >
                        Upload Jewelry
                      </Button>
                      <p className="text-xs text-gray-500">
                        Clear image with transparent background preferred
                      </p>
                    </div>
                  )}
                  <input
                    ref={jewelryFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, setJewelryImage)}
                  />
                </div>
              </div>

              {/* Jewelry Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={jewelryMetadata.type}
                    onValueChange={(value: JewelryMetadata['type']) =>
                      setJewelryMetadata(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="earrings">Earrings</SelectItem>
                      <SelectItem value="necklace">Necklace</SelectItem>
                      <SelectItem value="ring">Ring</SelectItem>
                      <SelectItem value="bracelet">Bracelet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={jewelryMetadata.width}
                    onChange={(e) =>
                      setJewelryMetadata(prev => ({
                        ...prev,
                        width: parseInt(e.target.value) || 20
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Height (mm)</Label>
                <Input
                  type="number"
                  value={jewelryMetadata.height}
                  onChange={(e) =>
                    setJewelryMetadata(prev => ({
                      ...prev,
                      height: parseInt(e.target.value) || 20
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handleTryOn}
              disabled={!modelImage || !jewelryImage || isProcessing || isMediaPipeProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Try On Jewelry'}
            </Button>
            <Button variant="outline" onClick={resetAll}>
              Reset
            </Button>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{processingStep}</span>
                    <Badge variant="secondary">{progress}%</Badge>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {jewelryMetadata && (
            <JewelryAnalysis metadata={jewelryMetadata} />
          )}

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span>Virtual Try-On Result</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <img
                    src={result.processedImage}
                    alt="Try-on result"
                    className="w-full rounded-lg shadow-lg"
                  />
                  <Badge className="absolute top-2 right-2 bg-green-500">
                    {Math.round(result.confidence * 100)}% Confidence
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Processing Time:</span>
                    <br />
                    {(result.processingTime / 1000).toFixed(1)}s
                  </div>
                  <div>
                    <span className="font-medium">Method:</span>
                    <br />
                    <Badge variant="outline" className="capitalize">
                      {result.method}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
