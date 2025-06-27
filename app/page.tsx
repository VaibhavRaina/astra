'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, Camera, Download, Zap, Gem, Eye, Wand2, User, ImageIcon, Info, Clock, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Simplified interface - no complex metadata or options needed
interface SimpleTryOnResult {
  processedImage: string;
  originalImage?: string;
  confidence: number;
  processingTime: number;
  method: 'photo' | 'prompt';
}

export default function Home() {
  const [jewelryImage, setJewelryImage] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [modelPrompt, setModelPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('photo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SimpleTryOnResult | null>(null);

  const jewelryInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleJewelryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setJewelryImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleModelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setModelImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleTryOn = async () => {
    if (!jewelryImage) return;

    // Check if we have the required inputs for each mode
    const hasPhotoInputs = activeTab === 'photo' && modelImage;
    const hasPromptInputs = activeTab === 'prompt' && modelPrompt.trim();

    if (!hasPhotoInputs && !hasPromptInputs) return;

    setIsProcessing(true);

    try {
      // Create FormData for the API call
      const formData = new FormData();

      // Convert base64 to blob for jewelry image
      const jewelryBlob = await fetch(jewelryImage).then(r => r.blob());
      formData.append('jewelryImage', jewelryBlob, 'jewelry.jpg');

      if (activeTab === 'photo' && modelImage) {
        // Photo mode: send both images
        const modelBlob = await fetch(modelImage).then(r => r.blob());
        formData.append('modelImage', modelBlob, 'model.jpg');
      } else if (activeTab === 'prompt') {
        // Prompt mode: send only jewelry image and prompt
        formData.append('prompt', modelPrompt);
      }

      formData.append('mode', activeTab);

      const response = await fetch('/api/jewelry-tryon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tryOnResult = await response.json();
      setResult({
        processedImage: `data:image/jpeg;base64,${tryOnResult.processedImage}`,
        originalImage: tryOnResult.originalImage ? `data:image/jpeg;base64,${tryOnResult.originalImage}` : undefined,
        confidence: tryOnResult.confidence,
        processingTime: tryOnResult.processingTime,
        method: activeTab as 'photo' | 'prompt'
      });
    } catch (error) {
      console.error('Try-on failed:', error);
      alert('Try-on failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result) {
      const link = document.createElement('a');
      link.href = result.processedImage;
      link.download = `jewelry-tryon-${result.method}-${Date.now()}.jpg`;
      link.click();
    }
  };

  const canGenerate = jewelryImage && (
    (activeTab === 'photo' && modelImage) ||
    (activeTab === 'prompt' && modelPrompt.trim())
  );

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'photo':
        return 'Upload both jewelry and model photos - AI will place the jewelry on the person';
      case 'prompt':
        return 'Upload jewelry only - AI will generate an Indian model wearing your jewelry';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                <Gem className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                AI Jewelry Studio
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                <Sparkles className="w-4 h-4 mr-1" />
                Powered by Advanced AI
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload & Controls */}
          <div className="space-y-6">
            {/* Jewelry Upload */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gem className="w-5 h-5 text-amber-500" />
                  <span>Upload Jewelry</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Step 1
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-amber-400 transition-colors cursor-pointer group"
                  onClick={() => jewelryInputRef.current?.click()}
                >
                  {jewelryImage ? (
                    <div className="space-y-3">
                      <img
                        src={jewelryImage}
                        alt="Jewelry"
                        className="w-32 h-32 object-cover mx-auto rounded-lg shadow-lg"
                      />
                      <p className="text-sm text-slate-600">Click to change jewelry image</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="w-12 h-12 text-slate-400 mx-auto group-hover:text-amber-500 transition-colors" />
                      <div>
                        <p className="font-medium text-slate-700">Drop your jewelry image here</p>
                        <p className="text-sm text-slate-500">or click to browse</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={jewelryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleJewelryUpload}
                  className="hidden"
                />


              </CardContent>
            </Card>



            {/* Model Input - Enhanced with Three Options */}
            <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-500" />
                  <span>Model Input</span>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Step 2
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="photo" className="flex items-center space-x-1 text-xs">
                      <ImageIcon className="w-3 h-3" />
                      <span>Photo</span>
                    </TabsTrigger>
                    <TabsTrigger value="prompt" className="flex items-center space-x-1 text-xs">
                      <Wand2 className="w-3 h-3" />
                      <span>Prompt</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Description for current tab */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <strong>{activeTab === 'photo' ? 'Photo Mode' : 'Prompt Mode'}:</strong> {getTabDescription(activeTab)}
                      </div>
                    </div>
                  </div>

                  <TabsContent value="photo" className="space-y-4">
                    <div
                      className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer group"
                      onClick={() => modelInputRef.current?.click()}
                    >
                      {modelImage ? (
                        <div className="space-y-3">
                          <img
                            src={modelImage}
                            alt="Model"
                            className="w-32 h-32 object-cover mx-auto rounded-lg shadow-lg"
                          />
                          <p className="text-sm text-slate-600">Click to change model image</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Camera className="w-12 h-12 text-slate-400 mx-auto group-hover:text-blue-500 transition-colors" />
                          <div>
                            <p className="font-medium text-slate-700">Upload model photo</p>
                            <p className="text-sm text-slate-500">High-quality portrait recommended</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <input
                      ref={modelInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleModelUpload}
                      className="hidden"
                    />
                  </TabsContent>

                  <TabsContent value="prompt" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="prompt" className="text-base font-medium">Describe your ideal model</Label>
                        <Badge variant="outline" className="text-xs">
                          <Wand2 className="w-3 h-3 mr-1" />
                          AI Powered
                        </Badge>
                      </div>
                      <Textarea
                        id="prompt"
                        placeholder="Describe the perfect model for your jewelry... (e.g., Professional Indian woman in her 30s, elegant pose, neutral background, studio lighting for jewelry display)"
                        value={modelPrompt}
                        onChange={(e) => setModelPrompt(e.target.value)}
                        className="min-h-[120px] text-sm"
                      />
                      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                        <strong>Pro tip:</strong> Include details about ethnicity, age, style, pose, lighting, and background for best results. Be specific about the setting that would showcase your jewelry beautifully.
                      </div>
                    </div>
                  </TabsContent>


                </Tabs>
              </CardContent>
            </Card>

            {/* Processing Steps */}
            {isProcessing && (
              <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-lg font-medium text-slate-700">
                      {activeTab === 'photo' ? 'Placing jewelry on model...' : 'Generating Indian model with jewelry...'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleTryOn}
              disabled={!canGenerate || isProcessing}
              className="w-full h-14 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Magic...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Generate Virtual Try-On</span>
                </div>
              )}
            </Button>
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Result Display */}
                <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Eye className="w-5 h-5 text-green-500" />
                        <span>Try-On Result</span>
                        <Badge variant="outline" className="text-xs">
                          {result.method === 'prompt' ? 'AI Generated' : 'AI Placed'}
                        </Badge>
                      </div>
                      <Button
                        onClick={downloadResult}
                        variant="outline"
                        size="sm"
                        className="hover:bg-green-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative overflow-hidden rounded-xl">
                        <img
                          src={result.processedImage}
                          alt="Try-on result"
                          className="w-full h-auto shadow-lg"
                        />
                        <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
                          {result.method === 'prompt' ? 'AI Generated' : 'AI Placed'}
                        </div>
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium text-slate-700">
                          {(result.confidence * 100).toFixed(0)}% Confidence
                        </div>
                      </div>

                      {/* Processing Stats */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 text-slate-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Processing Time</span>
                          </div>
                          <div className="font-semibold text-slate-800">{(result.processingTime / 1000).toFixed(1)}s</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 text-slate-600 mb-1">
                            <Target className="w-4 h-4" />
                            <span className="text-xs">Accuracy</span>
                          </div>
                          <div className="font-semibold text-slate-800">{(result.confidence * 100).toFixed(0)}%</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1 text-slate-600 mb-1">
                            <Gem className="w-4 h-4" />
                            <span className="text-xs">Method</span>
                          </div>
                          <div className="font-semibold text-slate-800 capitalize">{result.method}</div>
                        </div>
                      </div>

                      {/* Before/After Comparison - only show if we have original image */}
                      {result.originalImage && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">Original Photo</p>
                            <img
                              src={result.originalImage}
                              alt="Original"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-600 mb-2">With Jewelry</p>
                            <img
                              src={result.processedImage}
                              alt="With jewelry"
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>


              </>
            ) : (
              <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-700">Ready to Create Magic</h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                      Upload your jewelry image and choose from three powerful options: enhance existing photos, generate AI models, or place jewelry on uploaded photos.
                    </p>
                    <div className="flex items-center justify-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <ImageIcon className="w-4 h-4" />
                        <span>Photo Mode</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Wand2 className="w-4 h-4" />
                        <span>Prompt Mode</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Photo Mode</h3>
            <p className="text-sm text-slate-500">Upload jewelry and model photos - AI places jewelry on the person with realistic results.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
              <Wand2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Prompt Mode</h3>
            <p className="text-sm text-slate-500">Upload jewelry only - AI generates a beautiful Indian model wearing your jewelry.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto">
              <Download className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-700">High-Quality Results</h3>
            <p className="text-sm text-slate-500">Download professional images perfect for marketing and e-commerce.</p>
          </div>
        </div>
      </main>
    </div>
  );
}