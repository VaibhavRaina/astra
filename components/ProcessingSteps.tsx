'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';

interface ProcessingStep {
  id: string;
  label: string;
  completed: boolean;
  active: boolean;
}

interface ProcessingStepsProps {
  isProcessing: boolean;
  method: 'prompt' | 'upload' | 'both';
}

export function ProcessingSteps({ isProcessing, method }: ProcessingStepsProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([]);

  useEffect(() => {
    const baseSteps = [
      { id: 'analyze', label: 'Analyzing jewelry dimensions', completed: false, active: false },
      { id: 'process', label: 'Processing jewelry image', completed: false, active: false },
    ];

    let methodSteps: ProcessingStep[] = [];
    
    switch (method) {
      case 'prompt':
        methodSteps = [
          { id: 'generate', label: 'Generating AI model', completed: false, active: false },
          { id: 'placement', label: 'Calculating optimal placement', completed: false, active: false },
          { id: 'lighting', label: 'Applying realistic lighting', completed: false, active: false },
        ];
        break;
      case 'upload':
        methodSteps = [
          { id: 'analyze-person', label: 'Analyzing person image', completed: false, active: false },
          { id: 'enhance', label: 'Enhancing photo quality', completed: false, active: false },
          { id: 'lighting', label: 'Applying realistic lighting', completed: false, active: false },
        ];
        break;
      case 'both':
        methodSteps = [
          { id: 'analyze-anatomy', label: 'Analyzing person anatomy', completed: false, active: false },
          { id: 'calculate-placement', label: 'Calculating jewelry placement', completed: false, active: false },
          { id: 'match-lighting', label: 'Matching lighting conditions', completed: false, active: false },
          { id: 'blend', label: 'Blending jewelry seamlessly', completed: false, active: false },
        ];
        break;
    }

    const finalStep = { id: 'render', label: 'Rendering final result', completed: false, active: false };

    setSteps([...baseSteps, ...methodSteps, finalStep]);
  }, [method]);

  useEffect(() => {
    if (!isProcessing) {
      setSteps(prev => prev.map(step => ({ ...step, completed: false, active: false })));
      return;
    }

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          completed: index < currentStep,
          active: index === currentStep
        })));
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isProcessing, steps.length]);

  if (!isProcessing) return null;

  return (
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
      <h4 className="font-medium text-slate-700 mb-3">Processing Steps</h4>
      {steps.map((step) => (
        <div key={step.id} className="flex items-center space-x-3">
          {step.completed ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : step.active ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          ) : (
            <Circle className="w-5 h-5 text-slate-300" />
          )}
          <span className={`text-sm ${
            step.completed ? 'text-green-700' : 
            step.active ? 'text-blue-700 font-medium' : 
            'text-slate-500'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}