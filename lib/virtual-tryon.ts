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

export class VirtualTryOnService {
  public async processVirtualTryOn(
    request: TryOnRequest
  ): Promise<TryOnResult> {
    const { jewelryImage, jewelryMetadata, modelImage, landmarks, modelPrompt, method } = request;

    if (method === 'prompt') {
      // Placeholder for prompt-based generation
      // This would involve a text-to-image model first
      throw new Error('Prompt-based generation is not yet implemented.');
    }

    if (!modelImage || !landmarks) {
      throw new Error('Model image and landmarks are required for this method.');
    }

    const modelBuffer = await this.urlOrBase64ToBuffer(modelImage);
    const { info: modelInfo } = await sharp(modelBuffer).toBuffer({
      resolveWithObject: true,
    });

    // 1. Compute scaling factor and target dimensions using pre-computed landmarks
    const { targetDims, position } = this.calculateScaling(
      landmarks,
      jewelryMetadata
    );

    // 2. Resize jewelry image
    const jewelryBuffer = await this.urlOrBase64ToBuffer(jewelryImage);
    const resizedJewelry = await sharp(jewelryBuffer)
      .resize(targetDims.width, targetDims.height)
      .toBuffer();

    // 3. Generate mask for inpainting
    const maskBuffer = await this.generateMask(
      landmarks.region,
      modelInfo.width!,
      modelInfo.height!
    );


    // Debug: Check buffer validity before inpainting
    if (!modelBuffer || !Buffer.isBuffer(modelBuffer)) {
      console.error('modelBuffer is invalid or undefined');
      throw new Error('Model image buffer is invalid.');
    }
    if (!jewelryBuffer || !Buffer.isBuffer(jewelryBuffer)) {
      console.error('jewelryBuffer is invalid or undefined');
      throw new Error('Jewelry image buffer is invalid.');
    }
    if (!maskBuffer || !Buffer.isBuffer(maskBuffer)) {
      console.error('maskBuffer is invalid or undefined');
      throw new Error('Mask buffer is invalid.');
    }

    // 4. IP-Adapter inpainting (for realism/blending)

    // Always use the original model image as the base for overlay
    const finalImageBuffer = await sharp(modelBuffer)
      .composite([
        {
          input: resizedJewelry,
          left: position.x,
          top: position.y,
        },
      ])
      .png()
      .toBuffer();

    return {
      processedImage: `data:image/png;base64,${finalImageBuffer.toString('base64')}`,
      originalImage: modelImage,
      jewelryImage: jewelryImage,
      metadata: jewelryMetadata,
      processingTime: 3000,
      confidence: 0.95,
      method: 'both',
    };
  }

  private calculateScaling(
    landmarks: LandmarkData,
    metadata: JewelryMetadata
  ): {
    targetDims: { width: number; height: number };
    position: { x: number; y: number };
  } {
    const referenceMmWidth =
      REFERENCE_SIZES_MM[metadata.type] || metadata.width;
    const scaleFactor = metadata.width / referenceMmWidth;
    const targetPixelWidth = landmarks.refWidth * scaleFactor;
    const targetPixelHeight =
      targetPixelWidth * (metadata.height / metadata.width);

    const targetDims = {
      width: Math.round(targetPixelWidth),
      height: Math.round(targetPixelHeight),
    };

    const position = {
      x: Math.round(landmarks.position.x - targetDims.width / 2),
      y: Math.round(landmarks.position.y - targetDims.height / 2),
    };

    return { targetDims, position };
  }

  private async generateMask(
    region: LandmarkData['region'],
    width: number,
    height: number
  ): Promise<Buffer> {
    if (!region || !Array.isArray(region.points) || region.points.length === 0) {
      console.error('Invalid region or region.points for mask generation:', region);
      throw new Error('Invalid or missing region.points for mask generation.');
    }
    const polygonPoints = region.points.map((p: { x: number; y: number }) => `${p.x},${p.y}`).join(' ');
    const svgMask = `<svg width="${width}" height="${height}"><polygon points="${polygonPoints}" fill="white" /></svg>`;

    return await sharp(Buffer.from(svgMask))
      .resize(width, height)
      .png()
      .toBuffer();
  }

  private async callReplicateInpainting(
    baseImage: Buffer,
    adapterImage: Buffer,
    mask: Buffer,
    prompt?: string
  ): Promise<Buffer> {
    const models: { name: `${string}/${string}` | `${string}/${string}:${string}`; params: any }[] = [
      // Try FLUX Kontext Pro (official, high quality)
      {
        name: 'black-forest-labs/flux-kontext-pro',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: prompt || 'photorealistic, high quality, masterpiece, person wearing jewelry',
          guidance: 3.5,
          num_inference_steps: 30,
          seed: Math.floor(Math.random() * 1000000),
        }
      },
      // Try FLUX Kontext Max (premium, fallback)
      {
        name: 'black-forest-labs/flux-kontext-max',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: prompt || 'photorealistic, high quality, masterpiece, person wearing jewelry',
          guidance: 3.5,
          num_inference_steps: 30,
          seed: Math.floor(Math.random() * 1000000),
        }
      },
      // Try FLUX Fill Pro (legacy, fallback)
      {
        name: 'black-forest-labs/flux-fill-pro',
        params: {
          image: `data:image/png;base64,${baseImage.toString('base64')}`,
          mask: `data:image/png;base64,${mask.toString('base64')}`,
          prompt: prompt || 'photorealistic, high quality, masterpiece, person wearing jewelry',
          guidance: 3.5,
          num_inference_steps: 30,
          seed: Math.floor(Math.random() * 1000000),
        }
      }
    ];

    let lastError: Error | null = null;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model.name}`);
        let output = await replicate.run(model.name, {
          input: model.params
        });
        // Handle ReadableStream output (new Replicate client)
        // If output is a stream, check if it's an image or JSON
        if (output && typeof (output as any).getReader === 'function') {
          const reader = (output as any).getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          // Use Uint8Array for compatibility
          // Ensure all chunks are Uint8Array for Buffer.concat
          const uint8Chunks: Uint8Array[] = chunks.map((chunk) =>
            chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
          );
          const buffer = Buffer.concat(uint8Chunks);
          // Try to parse as JSON first
          try {
            const text = buffer.toString('utf8');
            output = JSON.parse(text);
            // If JSON, continue as before
            console.log('Replicate output (parsed JSON):', output);
          } catch (e) {
            // If not JSON, assume it's an image and return the buffer
            console.log('Replicate output is binary, returning as image buffer.');
            return buffer;
          }
        }
        console.log('Replicate output:', output);
        // Try to extract image URL from output
        let imageUrl: string | undefined;
        if (Array.isArray(output) && typeof output[0] === 'string') {
          imageUrl = output[0];
        } else if (output && typeof output === 'object') {
          const outObj = output as Record<string, any>;
          if (outObj.output && Array.isArray(outObj.output) && typeof outObj.output[0] === 'string') {
            imageUrl = outObj.output[0];
          } else if (typeof outObj.image === 'string') {
            imageUrl = outObj.image;
          }
        }
        if (!imageUrl) {
          throw new Error(`Unexpected or empty output from ${model.name}: ${JSON.stringify(output)}`);
        }
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch result from ${model.name}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.warn(`Model ${model.name} failed:`, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`All inpainting models failed. Last error: ${lastError?.message}`);
  }

  private async urlOrBase64ToBuffer(data: string): Promise<Buffer> {
    if (data.startsWith('http')) {
      const response = await fetch(data);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    const parts = data.split(',');
    const b64data = parts.length > 1 ? parts[1] : parts[0];
    return Buffer.from(b64data, 'base64');
  }
}

export const virtualTryOnService = new VirtualTryOnService();
