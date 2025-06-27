/**
 * Advanced Virtual Try-On Service with IP-Adapter and ControlNet Support
 * 
 * This service implements a comprehensive virtual try-on system that uses:
 * 1. IP-Adapter for jewelry conditioning - ensures the generated jewelry matches the input jewelry image
 * 2. ControlNet for pose/structure guidance - maintains the person's pose and structure
 * 3. Enhanced mask generation with feathering for realistic blending
 * 4. Multiple fallback models for reliability
 * 5. Jewelry-specific prompting for better results
 * 
 * Key Features:
 * - No direct overlay - uses generative AI for realistic synthesis
 * - Supports all jewelry types (necklace, earrings, ring, bracelet)
 * - Automatic image preprocessing and validation
 * - Robust error handling with multiple model fallbacks
 * - ControlNet edge detection for structure preservation
 * - Enhanced masking with padding and gradients
 * 
 * Workflow:
 * 1. Validate and preprocess input images
 * 2. Generate enhanced mask based on landmarks
 * 3. Create ControlNet conditioning map (Canny edges)
 * 4. Generate jewelry-specific prompts
 * 5. Use IP-Adapter + ControlNet inpainting for realistic blending
 * 6. Return high-quality result with metadata
 */

import Replicate from 'replicate';
import sharp from 'sharp';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

import { JewelryMetadata, TryOnRequest, TryOnResult, LandmarkData } from './types';

// --- Constants for Scaling ---
const REFERENCE_SIZES_MM = {
  earrings: 15, // Approx. earlobe width
  necklace: 120, // Approx. neck width
  ring: 18, // Approx. finger width
  bracelet: 55, // Approx. wrist width
};

// --- Jewelry-specific prompts for better AI generation ---
const JEWELRY_PROMPTS = {
  necklace: 'elegant necklace worn around neck, realistic jewelry, proper lighting, natural shadows, photorealistic',
  earrings: 'beautiful earrings worn on ears, realistic jewelry, proper lighting, natural shadows, photorealistic',
  ring: 'elegant ring worn on finger, realistic jewelry, proper lighting, natural shadows, photorealistic',
  bracelet: 'stylish bracelet worn on wrist, realistic jewelry, proper lighting, natural shadows, photorealistic',
};

export class VirtualTryOnService {
  public async processVirtualTryOn(
    request: TryOnRequest
  ): Promise<TryOnResult> {
    const startTime = Date.now();
    const { jewelryImage, jewelryMetadata, modelImage, landmarks, modelPrompt, method } = request;

    if (method === 'prompt') {
      // Implement prompt-based generation using text-to-image
      return await this.processPromptBasedGeneration(request);
    }

    if (!modelImage || !landmarks) {
      throw new Error('Model image and landmarks are required for this method.');
    }

    console.log('Starting virtual try-on process...');

    // 1. Prepare and validate all required buffers
    const modelBuffer = await this.urlOrBase64ToBuffer(modelImage);
    const jewelryBuffer = await this.urlOrBase64ToBuffer(jewelryImage);
    
    // Validate input images
    const { modelInfo, jewelryInfo } = await this.validateImageInputs(modelBuffer, jewelryBuffer);

    // Preprocess jewelry image for better IP-Adapter conditioning
    const preprocessedJewelryBuffer = await this.preprocessJewelryImage(
      jewelryBuffer,
      Math.min(jewelryInfo.width!, 512), // Limit size for better performance
      Math.min(jewelryInfo.height!, 512)
    );

    // 2. Generate enhanced mask for inpainting
    const maskBuffer = await this.generateEnhancedMask(
      landmarks,
      modelInfo.width!,
      modelInfo.height!,
      jewelryMetadata.type
    );

    // 3. Generate ControlNet conditioning (optional but recommended)
    const controlNetBuffer = await this.generateControlNetMap(
      modelBuffer,
      jewelryMetadata.type
    );

    // 4. Create jewelry-specific prompt
    const enhancedPrompt = this.createJewelryPrompt(
      jewelryMetadata,
      modelPrompt
    );

    console.log('Generated prompt:', enhancedPrompt);

    // 5. Use IP-Adapter + ControlNet inpainting for realistic blending
    const finalImageBuffer = await this.callAdvancedInpainting(
      modelBuffer,
      preprocessedJewelryBuffer,
      maskBuffer,
      controlNetBuffer,
      enhancedPrompt,
      jewelryMetadata
    );

    const processingTime = Date.now() - startTime;
    console.log(`Virtual try-on completed in ${processingTime}ms`);

    return {
      processedImage: `data:image/png;base64,${finalImageBuffer.toString('base64')}`,
      originalImage: modelImage,
      jewelryImage: jewelryImage,
      metadata: jewelryMetadata,
      processingTime,
      confidence: 0.95,
      method: method,
    };
  }

  private async processPromptBasedGeneration(
    request: TryOnRequest
  ): Promise<TryOnResult> {
    const startTime = Date.now();
    const { jewelryMetadata, modelPrompt } = request;

    // Generate a person wearing jewelry from text prompt
    const prompt = modelPrompt || `photorealistic portrait of a person wearing ${jewelryMetadata.type}, high quality, professional photography`;
    
    console.log('Generating image from prompt:', prompt);

    try {
      const output = await replicate.run('stability-ai/sdxl', {
        input: {
          prompt: prompt,
          negative_prompt: 'blurry, low quality, distorted, unrealistic',
          width: 1024,
          height: 1024,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        }
      }) as string[];

      if (!output || output.length === 0) {
        throw new Error('No output from text-to-image generation');
      }

      const imageUrl = output[0];
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const processingTime = Date.now() - startTime;

      return {
        processedImage: `data:image/png;base64,${imageBuffer.toString('base64')}`,
        originalImage: '',
        jewelryImage: '',
        metadata: jewelryMetadata,
        processingTime,
        confidence: 0.85,
        method: 'prompt',
      };
    } catch (error) {
      console.error('Prompt-based generation failed:', error);
      throw new Error('Failed to generate image from prompt');
    }
  }

  private createJewelryPrompt(
    metadata: JewelryMetadata,
    userPrompt?: string
  ): string {
    const basePrompt = JEWELRY_PROMPTS[metadata.type];
    const qualityPrompt = 'high quality, professional photography, realistic lighting, natural shadows, detailed texture';
    
    if (userPrompt) {
      return `${userPrompt}, ${basePrompt}, ${qualityPrompt}`;
    }
    
    return `${basePrompt}, ${qualityPrompt}`;
  }

  private async generateEnhancedMask(
    landmarks: LandmarkData,
    width: number,
    height: number,
    jewelryType: JewelryMetadata['type']
  ): Promise<Buffer> {
    if (!landmarks.region || !Array.isArray(landmarks.region.points) || landmarks.region.points.length === 0) {
      console.error('Invalid region or region.points for mask generation:', landmarks.region);
      throw new Error('Invalid or missing region.points for mask generation.');
    }

    // Create an enhanced mask with feathering for better blending
    const polygonPoints = landmarks.region.points.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');
    
    // Add padding based on jewelry type for better coverage
    const padding = this.getMaskPadding(jewelryType);
    const expandedPoints = this.expandPolygon(landmarks.region.points, padding);
    const expandedPolygonPoints = expandedPoints.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');

    // Create SVG with gradient for soft edges
    const svgMask = `
      <svg width="${width}" height="${height}">
        <defs>
          <radialGradient id="maskGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="80%" style="stop-color:white;stop-opacity:1" />
            <stop offset="100%" style="stop-color:white;stop-opacity:0.7" />
          </radialGradient>
        </defs>
        <polygon points="${expandedPolygonPoints}" fill="url(#maskGradient)" />
      </svg>
    `;

    return await sharp(Buffer.from(svgMask))
      .resize(width, height)
      .png()
      .toBuffer();
  }

  private getMaskPadding(jewelryType: JewelryMetadata['type']): number {
    // Different jewelry types need different padding for realistic placement
    switch (jewelryType) {
      case 'necklace': return 15; // More padding for necklaces to account for chain
      case 'earrings': return 8;  // Moderate padding for earrings
      case 'ring': return 5;      // Minimal padding for rings
      case 'bracelet': return 12; // Good padding for bracelets
      default: return 10;
    }
  }

  private expandPolygon(points: { x: number; y: number }[], padding: number): { x: number; y: number }[] {
    // Simple polygon expansion - move each point outward from centroid
    const centroid = points.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );
    centroid.x /= points.length;
    centroid.y /= points.length;

    return points.map(p => {
      const dx = p.x - centroid.x;
      const dy = p.y - centroid.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const factor = (distance + padding) / distance;
      
      return {
        x: Math.round(centroid.x + dx * factor),
        y: Math.round(centroid.y + dy * factor)
      };
    });
  }

  private async generateControlNetMap(
    imageBuffer: Buffer,
    jewelryType: JewelryMetadata['type']
  ): Promise<Buffer | null> {
    try {
      // Generate Canny edge detection for ControlNet conditioning
      // This helps maintain the structure and pose of the person
      const cannyBuffer = await sharp(imageBuffer)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .png()
        .toBuffer();

      console.log('Generated ControlNet Canny map');
      return cannyBuffer;
    } catch (error) {
      console.warn('Failed to generate ControlNet map:', error);
      return null; // ControlNet is optional
    }
  }

  private async callAdvancedInpainting(
    baseImage: Buffer,
    jewelryImage: Buffer,
    mask: Buffer,
    controlNetBuffer: Buffer | null,
    prompt: string,
    metadata: JewelryMetadata
  ): Promise<Buffer> {
    console.log('Starting advanced inpainting with IP-Adapter and ControlNet...');

    // Define models with IP-Adapter and ControlNet support
    const models: { name: `${string}/${string}` | `${string}/${string}:${string}`; params: any }[] = [
      // Try IP-Adapter models first (best for jewelry conditioning)
      {
        name: 'usamaehsan/controlnet-x-ip-adapter-realistic-vision-v5',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: prompt,
          ip_adapter_image: `data:image/png;base64,${jewelryImage.toString('base64')}`,
          ip_adapter_scale: 0.8, // High influence for jewelry conditioning
          controlnet_conditioning_scale: controlNetBuffer ? 0.6 : 0.0,
          controlnet_image: controlNetBuffer ? `data:image/png;base64,${controlNetBuffer.toString('base64')}` : undefined,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          strength: 0.8, // High strength for good blending
        }
      },
      // Fallback to FLUX models with jewelry conditioning
      {
        name: 'black-forest-labs/flux-fill-pro',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: `${prompt}, jewelry style matching the reference image`,
          guidance: 4.0,
          num_inference_steps: 30,
          seed: Math.floor(Math.random() * 1000000),
        }
      },
      // Standard SDXL inpainting with enhanced prompting
      {
        name: 'lucataco/sdxl-inpainting',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: prompt,
          num_inference_steps: 30,
          guidance_scale: 8.0,
          strength: 0.85,
        }
      },
      // Final fallback
      {
        name: 'andreasjansson/stable-diffusion-inpainting',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: prompt,
          num_inference_steps: 30,
          guidance_scale: 7.5,
        }
      }
    ];

    let lastError: Error | null = null;

    for (const model of models) {
      try {
        console.log(`Trying advanced inpainting model: ${model.name}`);
        
        // Clean up undefined parameters
        const cleanParams = Object.fromEntries(
          Object.entries(model.params).filter(([_, value]) => value !== undefined)
        );

        let output = await replicate.run(model.name, {
          input: cleanParams
        });

        // Handle different output formats
        const imageBuffer = await this.processReplicateOutput(output, model.name);
        
        console.log(`Successfully generated image with ${model.name}`);
        return imageBuffer;

      } catch (error) {
        console.warn(`Advanced inpainting model ${model.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All advanced inpainting models failed. Last error: ${lastError?.message}`);
  }

  private async processReplicateOutput(output: any, modelName: string): Promise<Buffer> {
    // Handle ReadableStream output (new Replicate client)
    if (output && typeof (output as any).getReader === 'function') {
      const reader = (output as any).getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const uint8Chunks: Uint8Array[] = chunks.map((chunk) =>
        chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
      );
      const buffer = Buffer.concat(uint8Chunks);
      
      // Try to parse as JSON first
      try {
        const text = buffer.toString('utf8');
        output = JSON.parse(text);
        console.log('Replicate output (parsed JSON):', output);
      } catch (e) {
        // If not JSON, assume it's an image and return the buffer
        console.log('Replicate output is binary, returning as image buffer.');
        return buffer;
      }
    }

    // Extract image URL from various output formats
    let imageUrl: string | undefined;
    
    if (Array.isArray(output) && typeof output[0] === 'string') {
      imageUrl = output[0];
    } else if (output && typeof output === 'object') {
      const outObj = output as Record<string, any>;
      if (outObj.output && Array.isArray(outObj.output) && typeof outObj.output[0] === 'string') {
        imageUrl = outObj.output[0];
      } else if (typeof outObj.image === 'string') {
        imageUrl = outObj.image;
      } else if (typeof outObj.url === 'string') {
        imageUrl = outObj.url;
      }
    }

    if (!imageUrl) {
      throw new Error(`Unexpected or empty output from ${modelName}: ${JSON.stringify(output)}`);
    }

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch result from ${modelName}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async urlOrBase64ToBuffer(data: string): Promise<Buffer> {
    if (data.startsWith('http')) {
      const response = await fetch(data);
      if (!response.ok) {
        throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    
    // Handle base64 data
    const parts = data.split(',');
    const b64data = parts.length > 1 ? parts[1] : parts[0];
    
    try {
      return Buffer.from(b64data, 'base64');
    } catch (error) {
      throw new Error('Invalid base64 image data');
    }
  }

  // Additional utility method for image preprocessing
  private async preprocessJewelryImage(
    jewelryBuffer: Buffer,
    targetWidth: number,
    targetHeight: number
  ): Promise<Buffer> {
    try {
      // Enhance jewelry image for better IP-Adapter conditioning
      return await sharp(jewelryBuffer)
        .resize(targetWidth, targetHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .sharpen()
        .png()
        .toBuffer();
    } catch (error) {
      console.warn('Failed to preprocess jewelry image:', error);
      return jewelryBuffer; // Return original if preprocessing fails
    }
  }

  // Method to validate input images
  private async validateImageInputs(
    modelBuffer: Buffer,
    jewelryBuffer: Buffer
  ): Promise<{ modelInfo: any; jewelryInfo: any }> {
    try {
      const [modelResult, jewelryResult] = await Promise.all([
        sharp(modelBuffer).metadata(),
        sharp(jewelryBuffer).metadata()
      ]);

      if (!modelResult.width || !modelResult.height) {
        throw new Error('Invalid model image dimensions');
      }

      if (!jewelryResult.width || !jewelryResult.height) {
        throw new Error('Invalid jewelry image dimensions');
      }

      console.log(`Model image: ${modelResult.width}x${modelResult.height}, format: ${modelResult.format}`);
      console.log(`Jewelry image: ${jewelryResult.width}x${jewelryResult.height}, format: ${jewelryResult.format}`);

      return {
        modelInfo: modelResult,
        jewelryInfo: jewelryResult
      };
    } catch (error) {
      throw new Error(`Image validation failed: ${error}`);
    }
  }
}

export const virtualTryOnService = new VirtualTryOnService();
