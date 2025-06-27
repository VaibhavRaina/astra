'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ruler, Target, Lightbulb } from 'lucide-react';
import { JewelryMetadata } from '@/lib/virtual-tryon';
import { virtualTryOnService } from '@/lib/virtual-tryon';

interface JewelryAnalysisProps {
  metadata: JewelryMetadata;
}

export function JewelryAnalysis({ metadata }: JewelryAnalysisProps) {
  const analysis = virtualTryOnService.analyzeJewelryPlacement(metadata);

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-blue-700">
          <Target className="w-5 h-5" />
          <span>AI Analysis</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-slate-700">Dimensions</span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>Width: {metadata.width}mm</div>
              <div>Height: {metadata.height}mm</div>
              <div>Depth: {metadata.depth}mm</div>
              {metadata.circumference && (
                <div>Circumference: {metadata.circumference}mm</div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-slate-700">Placement</span>
            </div>
            <div className="space-y-1">
              <Badge variant="secondary" className="text-xs">
                {analysis.suggestedPosition}
              </Badge>
              <div className="text-xs text-slate-600">
                Scale: {(analysis.scalingFactor * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700">AI Tips</span>
          </div>
          <div className="space-y-1">
            {analysis.placementTips.map((tip, index) => (
              <div key={index} className="text-xs text-slate-600 flex items-start space-x-2">
                <span className="w-1 h-1 bg-amber-400 rounded-full mt-2 flex-shrink-0" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}