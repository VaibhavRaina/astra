'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, Camera, Settings, Download, Zap, Gem, Eye, Wand2, User, ImageIcon, Info, Clock, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ProcessingSteps } from '@/components/ProcessingSteps';
import { JewelryAnalysis } from '@/components/JewelryAnalysis';
import { MediaPipeProcessor } from '@/components/MediaPipeProcessor';
import { ImagePreprocessor } from '@/components/ImagePreprocessor';
import { virtualTryOnService, JewelryMetadata, TryOnResult, TryOnRequest } from '@/lib/virtual-tryon';

const promptSuggestions = [
  "Professional Indian woman in her 30s, elegant pose, neutral background, studio lighting",
  "Young Indian man with clean style, casual portrait, good lighting for jewelry display",
  "Elegant Indian bride with traditional hairstyle, soft romantic lighting, white background",
  "Fashion model with modern Indian style, dramatic lighting, professional photography",
  "Business professional Indian woman, confident pose, corporate headshot style",
  "Traditional Indian woman in ethnic wear, natural lighting, artistic portrait"
];

const ethnicityOptions = [
  { value: 'indian', label: 'Indian' },
  { value: 'asian', label: 'Asian' },
  { value: 'caucasian', label: 'Caucasian' },
  { value: 'african', label: 'African' },
  { value: 'hispanic', label: 'Hispanic' },
  { value: 'middle-eastern', label: 'Middle Eastern' }
];

export default function Home() {
  const [jewelryImage, setJewelryImage] = useState<string | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [modelPrompt, setModelPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  const [jewelryMetadata, setJewelryMetadata] = useState<JewelryMetadata>({
    width: 20,
    height: 25,
    depth: 5,
    circumference: 60,
    type: 'ring'
  });
  const [styleOptions, setStyleOptions] = useState({
    photographyStyle: '',
    lighting: '',
    ethnicity: '',
    age: '',
    gender: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [sizeAdjustment, setSizeAdjustment] = useState([100]);
  const [positionAdjustment, setPositionAdjustment] = useState([50]);
  const [showPreprocessing, setShowPreprocessing] = useState(false);
  const [showLandmarkDetection, setShowLandmarkDetection] = useState(false);
  const [preprocessedImage, setPreprocessedImage] = useState<string | null>(null);
  const [detectedLandmarks, setDetectedLandmarks] = useState<any>(null);

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

  const handlePromptSuggestion = (suggestion: string) => {
    setModelPrompt(suggestion);
  };

  const handleTryOn = async () => {
    if (!jewelryImage) return;

    // Check if we have the required inputs for each mode
    const hasUploadInputs = activeTab === 'upload' && modelImage;
    const hasPromptInputs = activeTab === 'prompt' && modelPrompt.trim();
    const hasBothInputs = activeTab === 'both' && modelImage;

    if (!hasUploadInputs && !hasPromptInputs && !hasBothInputs) return;

    setIsProcessing(true);

    try {
      const request: TryOnRequest = {
        jewelryImage,
        jewelryMetadata,
        modelImage: (activeTab === 'upload' || activeTab === 'both') ? modelImage || undefined : undefined,
        modelPrompt: activeTab === 'prompt' ? modelPrompt : undefined,
        styleOptions,
        mode: activeTab as 'upload' | 'prompt' | 'both'
      };

      const tryOnResult = await virtualTryOnService.processVirtualTryOn(request);
      setResult(tryOnResult);
    } catch (error) {
      console.error('Try-on failed:', error);
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
    (activeTab === 'upload' && modelImage) ||
    (activeTab === 'prompt' && modelPrompt.trim()) ||
    (activeTab === 'both' && modelImage)
  );

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'upload':
        return 'Upload a person\'s photo and AI will enhance it by adding your jewelry';
      case 'prompt':
        return 'Describe your ideal model and AI will generate them wearing your jewelry';
      case 'both':
        return 'Upload a person\'s photo and AI will realistically place your jewelry on them';
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

                {/* Jewelry Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jewelryType">Jewelry Type</Label>
                    <Select
                      value={jewelryMetadata.type}
                      onValueChange={(value) => setJewelryMetadata({ ...jewelryMetadata, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ring">Ring</SelectItem>
                        <SelectItem value="necklace">Necklace</SelectItem>
                        <SelectItem value="earrings">Earrings</SelectItem>
                        <SelectItem value="bracelet">Bracelet</SelectItem>
                        <SelectItem value="watch">Watch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="circumference">Circumference (mm)</Label>
                    <Input
                      id="circumference"
                      type="number"
                      value={jewelryMetadata.circumference}
                      onChange={(e) => setJewelryMetadata({ ...jewelryMetadata, circumference: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="width">Width (mm)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={jewelryMetadata.width}
                      onChange={(e) => setJewelryMetadata({ ...jewelryMetadata, width: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="height">Height (mm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={jewelryMetadata.height}
                      onChange={(e) => setJewelryMetadata({ ...jewelryMetadata, height: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="depth">Depth (mm)</Label>
                    <Input
                      id="depth"
                      type="number"
                      value={jewelryMetadata.depth}
                      onChange={(e) => setJewelryMetadata({ ...jewelryMetadata, depth: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {jewelryImage && (
              <JewelryAnalysis metadata={jewelryMetadata} />
            )}

            {/* Image Preprocessing */}
            {modelImage && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-700">Advanced Processing</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant={showPreprocessing ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowPreprocessing(!showPreprocessing)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Preprocessing
                    </Button>
                    <Button
                      variant={showLandmarkDetection ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowLandmarkDetection(!showLandmarkDetection)}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Landmarks
                    </Button>
                  </div>
                </div>

                {showPreprocessing && (
                  <ImagePreprocessor
                    originalImage={modelImage}
                    onProcessedImage={setPreprocessedImage}
                  />
                )}

                {showLandmarkDetection && (
                  <MediaPipeProcessor
                    imageUrl={preprocessedImage || modelImage}
                    jewelryType={jewelryMetadata.type}
                    onLandmarksDetected={setDetectedLandmarks}
                  />
                )}
              </div>
            )}

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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upload" className="flex items-center space-x-1 text-xs">
                      <ImageIcon className="w-3 h-3" />
                      <span>Photo Only</span>
                    </TabsTrigger>
                    <TabsTrigger value="prompt" className="flex items-center space-x-1 text-xs">
                      <Wand2 className="w-3 h-3" />
                      <span>AI Generate</span>
                    </TabsTrigger>
                    <TabsTrigger value="both" className="flex items-center space-x-1 text-xs">
                      <Users className="w-3 h-3" />
                      <span>Photo + AI</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Description for current tab */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <strong>{activeTab === 'upload' ? 'Photo Enhancement' : activeTab === 'prompt' ? 'AI Generation' : 'Photo + AI Placement'}:</strong> {getTabDescription(activeTab)}
                      </div>
                    </div>
                  </div>

                  <TabsContent value="upload" className="space-y-4">
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

                  <TabsContent value="prompt" className="space-y-6">
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

                    {/* Quick Suggestions */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-slate-700">Quick Suggestions</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {promptSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handlePromptSuggestion(suggestion)}
                            className="text-left p-3 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 group"
                          >
                            <div className="flex items-start space-x-2">
                              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5 group-hover:text-blue-600" />
                              <span className="text-slate-700 group-hover:text-slate-900">{suggestion}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
                      <Label className="text-sm font-medium text-slate-700">Advanced Options</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ethnicity" className="text-xs">Ethnicity</Label>
                          <Select value={styleOptions.ethnicity} onValueChange={(value) => setStyleOptions({ ...styleOptions, ethnicity: value })}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select ethnicity" />
                            </SelectTrigger>
                            <SelectContent>
                              {ethnicityOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="age" className="text-xs">Age Range</Label>
                          <Select value={styleOptions.age} onValueChange={(value) => setStyleOptions({ ...styleOptions, age: value })}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select age" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="20s">20s</SelectItem>
                              <SelectItem value="30s">30s</SelectItem>
                              <SelectItem value="40s">40s</SelectItem>
                              <SelectItem value="50s">50s</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="style" className="text-xs">Photography Style</Label>
                          <Select value={styleOptions.photographyStyle} onValueChange={(value) => setStyleOptions({ ...styleOptions, photographyStyle: value })}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="glamour">Glamour</SelectItem>
                              <SelectItem value="artistic">Artistic</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="lighting" className="text-xs">Lighting</Label>
                          <Select value={styleOptions.lighting} onValueChange={(value) => setStyleOptions({ ...styleOptions, lighting: value })}>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="Select lighting" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="studio">Studio</SelectItem>
                              <SelectItem value="natural">Natural</SelectItem>
                              <SelectItem value="dramatic">Dramatic</SelectItem>
                              <SelectItem value="soft">Soft</SelectItem>
                              <SelectItem value="golden-hour">Golden Hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="both" className="space-y-4">
                    <div
                      className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer group"
                      onClick={() => modelInputRef.current?.click()}
                    >
                      {modelImage ? (
                        <div className="space-y-3">
                          <img
                            src={modelImage}
                            alt="Model"
                            className="w-32 h-32 object-cover mx-auto rounded-lg shadow-lg"
                          />
                          <p className="text-sm text-slate-600">Click to change person image</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Users className="w-12 h-12 text-slate-400 mx-auto group-hover:text-green-500 transition-colors" />
                          <div>
                            <p className="font-medium text-slate-700">Upload person's photo</p>
                            <p className="text-sm text-slate-500">AI will place jewelry on this person</p>
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

                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start space-x-2">
                        <Users className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-700">
                          <strong>Photo + AI Mode:</strong> Upload a person's photo and AI will intelligently place your jewelry on them with realistic sizing, lighting, and positioning.
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Processing Steps */}
            {isProcessing && (
              <ProcessingSteps isProcessing={isProcessing} method={activeTab as 'prompt' | 'upload' | 'both'} />
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
                          {result.method === 'prompt' ? 'AI Generated' : result.method === 'both' ? 'AI Placed' : 'Photo Enhanced'}
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
                          {result.method === 'prompt' ? 'AI Generated' : result.method === 'both' ? 'AI Placed' : 'AI Enhanced'}
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

                      {/* Before/After Comparison */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-2">
                            {result.method === 'prompt' ? 'AI Generated Base' : 'Original Photo'}
                          </p>
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
                    </div>
                  </CardContent>
                </Card>

                {/* Adjustment Controls */}
                <Card className="border-0 shadow-xl bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-purple-500" />
                      <span>Fine-Tune Result</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Size Adjustment</Label>
                      <div className="mt-2">
                        <Slider
                          value={sizeAdjustment}
                          onValueChange={setSizeAdjustment}
                          max={150}
                          min={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-slate-500 mt-1">
                          <span>50%</span>
                          <span className="font-medium">{sizeAdjustment[0]}%</span>
                          <span>150%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Position Adjustment</Label>
                      <div className="mt-2">
                        <Slider
                          value={positionAdjustment}
                          onValueChange={setPositionAdjustment}
                          max={100}
                          min={0}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-slate-500 mt-1">
                          <span>Left</span>
                          <span className="font-medium">Center</span>
                          <span>Right</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-purple-500 hover:bg-purple-600"
                      onClick={() => {
                        // Apply adjustments logic here
                        console.log('Applying adjustments:', { sizeAdjustment, positionAdjustment });
                      }}
                    >
                      Apply Adjustments
                    </Button>
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
                        <span>Photo Only</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Wand2 className="w-4 h-4" />
                        <span>AI Generate</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>Photo + AI</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="mt-16 grid md:grid-cols-4 gap-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-700">AI-Powered Precision</h3>
            <p className="text-sm text-slate-500">Advanced AI ensures realistic placement and perfect sizing for any jewelry type.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto">
              <Wand2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Triple Mode Support</h3>
            <p className="text-sm text-slate-500">Photo enhancement, AI generation, or intelligent jewelry placement on existing photos.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto">
              <Settings className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-700">Fine-Tune Controls</h3>
            <p className="text-sm text-slate-500">Adjust size, position, and lighting to achieve the perfect try-on result.</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto">
              <Download className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-700">High-Quality Export</h3>
            <p className="text-sm text-slate-500">Download production-ready images perfect for marketing and e-commerce.</p>
          </div>
        </div>
      </main>
    </div>
  );
}