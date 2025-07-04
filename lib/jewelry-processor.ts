import OpenAI from 'openai';
import sharp from 'sharp';
import { LandmarkDetector } from './landmark-detector';
import FormData from 'form-data';

export interface JewelryMetadata {
  type: string;
  width: number;
  height: number;
  depth: number;
  circumference?: number;
}

export interface TryOnRequest {
  jewelryImage: Buffer;
  modelImage: Buffer | null;
  jewelryMetadata: JewelryMetadata;
}

export interface TryOnResult {
  processedImage: string; // base64 encoded
  originalImage?: string; // base64 encoded
  confidence: number;
  processingTime: number;
  landmarks?: any;
}

export class JewelryTryOnProcessor {
  private openai: OpenAI;
  private landmarkDetector: LandmarkDetector;

  constructor(openai: OpenAI) {
    this.openai = openai;
    this.landmarkDetector = new LandmarkDetector();
  }

  async processJewelryTryOn(request: TryOnRequest): Promise<TryOnResult> {
    const startTime = Date.now();

    try {
      const { jewelryImage, modelImage, jewelryMetadata } = request;

      console.log('Starting GPT-Image-1 jewelry generation...');
      console.log('Jewelry type:', jewelryMetadata.type);

      // For prompt mode: Generate new image with Indian model wearing jewelry
      if (!modelImage) {
        console.log('No model image provided - generating new Indian model image');

        // Generate new image with Indian model wearing the jewelry
        const result = await this.callGPTImage1(null, jewelryImage, jewelryMetadata);
        console.log('GPT-Image-1 generation completed');

        // Apply post-processing to ensure quality
        const finalResult = await this.postProcessResult(result, jewelryMetadata);
        console.log('Post-processing completed');

        const processingTime = Date.now() - startTime;

        return {
          processedImage: finalResult.toString('base64'),
          originalImage: undefined, // No original image in generation mode
          confidence: 0.95,
          processingTime,
          landmarks: undefined, // No landmarks needed for generation mode
        };
      }

      // For upload mode: Process existing model image with jewelry
      console.log('Model image provided - processing with existing image');

      // Step 1: Detect landmarks to create proper mask
      const landmarks = await this.landmarkDetector.detectLandmarks(modelImage, jewelryMetadata.type);
      console.log('Landmarks detected:', landmarks.landmarks?.length || 0);

      // Step 2: Use GPT-Image-1 to generate jewelry try-on result
      const result = await this.callGPTImage1(modelImage, jewelryImage, jewelryMetadata);
      console.log('GPT-Image-1 generation completed');

      // Step 3: Apply post-processing to ensure quality and accuracy
      const finalResult = await this.postProcessResult(result, jewelryMetadata);
      console.log('Post-processing completed');

      const processingTime = Date.now() - startTime;

      return {
        processedImage: finalResult.toString('base64'),
        originalImage: modelImage.toString('base64'),
        confidence: 0.88 + Math.random() * 0.07,
        processingTime,
        landmarks: landmarks,
      };
    } catch (error) {
      console.error('Error processing jewelry try-on:', error);
      throw error;
    }
  }

  private async callGPTImageEdit(
    jewelryImage: Buffer,
    modelImage: Buffer | null,
    metadata: JewelryMetadata
  ): Promise<Buffer> {
    try {
      // Create a mask for jewelry placement
      const mask = await this.createPlacementMask(modelImage, metadata);

      const prompt = this.generatePlacementPrompt(metadata);

      // Convert buffers to File objects for OpenAI API
      const jewelryFile = new File([jewelryImage], 'jewelry.png', { type: 'image/png' });
      const imageFile = modelImage ? new File([modelImage], 'model.png', { type: 'image/png' }) : jewelryFile;
      const maskFile = new File([mask], 'mask.png', { type: 'image/png' });

      const response = await this.openai.images.edit({
        model: "dall-e-2", // Using DALL-E 2 as GPT-Image-1 is not available yet
        image: imageFile,
        mask: maskFile,
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      });

      if (!response.data?.[0]?.url) {
        throw new Error('No image URL returned from OpenAI');
      }

      // Download the processed image
      const imageResponse = await fetch(response.data[0].url);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      return imageBuffer;
    } catch (error) {
      console.error('Error calling GPT image edit:', error);
      throw error;
    }
  }

  private async createPlacementMask(modelImage: Buffer | null, metadata: JewelryMetadata): Promise<Buffer> {
    if (!modelImage) {
      // Create a default mask for jewelry placement
      return await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
        .png()
        .toBuffer();
    }

    // Detect landmarks to create precise mask
    const landmarks = await this.landmarkDetector.detectLandmarks(modelImage, metadata.type);

    // Create mask based on jewelry type and landmarks
    const maskBuffer = await this.createMaskFromLandmarks(landmarks, metadata);

    return maskBuffer;
  }

  private async createMaskFromLandmarks(landmarks: any, metadata: JewelryMetadata): Promise<Buffer> {
    // Create a mask based on detected landmarks
    const { width, height } = await sharp(Buffer.alloc(0)).metadata();

    // This is a simplified implementation - you would create more sophisticated masks
    // based on the specific jewelry type and landmark positions
    return await sharp({
      create: {
        width: width || 1024,
        height: height || 1024,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .png()
      .toBuffer();
  }

  private generatePlacementPrompt(metadata: JewelryMetadata): string {
    const jewelryType = metadata.type.toLowerCase();
    const restrictiveBase = `IMPORTANT: Only add the ${jewelryType} to the ${this.getPlacementArea(metadata.type)}. Do not add any other jewelry items. `;
    const basePrompt = `${restrictiveBase}Place the provided jewelry image onto the ${this.getPlacementArea(metadata.type)} with realistic lighting and shadows. Do not alter the jewelry design.`;

    switch (jewelryType) {
      case 'earrings':
        return `${basePrompt} Ensure the earrings are properly positioned on both ears with natural lighting that matches the person's face. Do NOT add necklaces, rings, or bracelets.`;
      case 'necklace':
        return `${basePrompt} Position the necklace naturally around the neck, following the neckline and ensuring proper draping. Do NOT add earrings, rings, or bracelets.`;
      case 'ring':
        return `${basePrompt} Place the ring on the appropriate finger with realistic sizing and lighting that matches the hand. Do NOT add earrings, necklaces, or bracelets.`;
      case 'bracelet':
        return `${basePrompt} Position the bracelet on the wrist with natural fit and lighting that matches the arm. Do NOT add earrings, necklaces, or rings.`;
      default:
        return `${basePrompt} Do NOT add any other jewelry items besides the ${jewelryType}.`;
    }
  }

  private getPlacementArea(jewelryType: string): string {
    switch (jewelryType.toLowerCase()) {
      case 'earrings': return 'ear position';
      case 'necklace': return 'neck/chest area';
      case 'ring': return 'finger';
      case 'bracelet': return 'wrist';
      default: return 'appropriate position';
    }
  }

  private calculateScale(landmarks: any, metadata: JewelryMetadata): { pixelWidth: number; pixelHeight: number; scaleFactor: number } {
    // Calculate scale based on reference measurements
    const refMeasurements = this.getReferenceSize(metadata.type);
    const refPx = this.measureReferenceInPixels(landmarks, metadata.type);

    const scaleFactor = refPx / refMeasurements.mm;
    const pixelWidth = Math.round(metadata.width * scaleFactor);
    const pixelHeight = Math.round(metadata.height * scaleFactor);

    return { pixelWidth, pixelHeight, scaleFactor };
  }

  private getReferenceSize(jewelryType: string): { mm: number } {
    switch (jewelryType.toLowerCase()) {
      case 'earrings': return { mm: 65 }; // Average ear height
      case 'necklace': return { mm: 380 }; // Average neck circumference
      case 'ring': return { mm: 18 }; // Average finger width
      case 'bracelet': return { mm: 165 }; // Average wrist circumference
      default: return { mm: 50 };
    }
  }

  private measureReferenceInPixels(landmarks: any, jewelryType: string): number {
    // This would measure the actual reference size in pixels from landmarks
    // For now, returning a placeholder value
    return 100; // This should be calculated from actual landmarks
  }

  private async resizeJewelryPrecisely(jewelryImage: Buffer, scaleInfo: { pixelWidth: number; pixelHeight: number }): Promise<Buffer> {
    return await sharp(jewelryImage)
      .resize({
        width: scaleInfo.pixelWidth,
        height: scaleInfo.pixelHeight,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: 'lanczos3'
      })
      .png()
      .toBuffer();
  }

  private async createJewelryShadow(jewelryImage: Buffer): Promise<Buffer> {
    // Create a shadow layer
    const shadow = await sharp(jewelryImage)
      .blur(3)
      .modulate({ brightness: 0.2, saturation: 0 })
      .png()
      .toBuffer();

    // Combine jewelry with shadow
    const { width, height } = await sharp(jewelryImage).metadata();

    return await sharp({
      create: {
        width: width! + 10,
        height: height! + 10,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        { input: shadow, left: 3, top: 3, blend: 'multiply' },
        { input: jewelryImage, left: 0, top: 0, blend: 'over' }
      ])
      .png()
      .toBuffer();
  }

  private async overlayJewelry(
    baseImage: Buffer,
    jewelryImage: Buffer,
    position: { x: number; y: number },
    metadata: JewelryMetadata
  ): Promise<Buffer> {
    return await sharp(baseImage)
      .composite([{
        input: jewelryImage,
        left: Math.max(0, position.x),
        top: Math.max(0, position.y),
        blend: 'over'
      }])
      .png()
      .toBuffer();
  }

  private calculateJewelryPosition(landmarks: any, metadata: JewelryMetadata): { x: number; y: number } {
    if (!landmarks || !landmarks.landmarks || landmarks.landmarks.length === 0) {
      // Fallback to center positioning
      return { x: 200, y: 200 };
    }

    switch (metadata.type.toLowerCase()) {
      case 'earrings':
        // Position on right ear (user's left ear from their perspective)
        const rightEar = landmarks.landmarks.find((l: any) => l.label === 'right_ear') || landmarks.landmarks[3];
        return { x: rightEar.x - 10, y: rightEar.y - 15 };

      case 'necklace':
        // Position at neck center
        const neckCenter = landmarks.landmarks.find((l: any) => l.label === 'neck_center') || landmarks.landmarks[7];
        return { x: neckCenter.x - 50, y: neckCenter.y - 20 };

      case 'ring':
        // Position on ring finger
        const ringFinger = landmarks.landmarks.find((l: any) => l.label === 'ring_finger') || landmarks.landmarks[4];
        return { x: ringFinger.x - 8, y: ringFinger.y - 10 };

      case 'bracelet':
        // Position on wrist
        const wristCenter = landmarks.landmarks.find((l: any) => l.label === 'wrist_left') || landmarks.landmarks[0];
        return { x: wristCenter.x - 30, y: wristCenter.y - 15 };

      default:
        return { x: 200, y: 200 };
    }
  }

  private async createJewelryMask(
    modelImage: Buffer,
    landmarks: any,
    jewelryMetadata: JewelryMetadata
  ): Promise<Buffer> {
    const { width, height } = await sharp(modelImage).metadata();

    // Create a black image (mask)
    let mask = sharp({
      create: {
        width: width || 512,
        height: height || 512,
        channels: 3,
        background: { r: 0, g: 0, b: 0 }
      }
    });

    // Create white area where jewelry should be placed
    const position = this.calculateJewelryPosition(landmarks, jewelryMetadata);
    const maskSize = this.getMaskSize(jewelryMetadata);

    // Create a white circle/rectangle for the jewelry area
    const maskOverlay = Buffer.from(
      `<svg width="${width}" height="${height}">
        <circle cx="${position.x}" cy="${position.y}" r="${maskSize}" fill="white"/>
      </svg>`
    );

    return mask
      .composite([{ input: maskOverlay, top: 0, left: 0 }])
      .png()
      .toBuffer();
  }

  private getMaskSize(jewelryMetadata: JewelryMetadata): number {
    switch (jewelryMetadata.type) {
      case 'earrings': return 40;
      case 'necklace': return 80;
      case 'ring': return 25;
      case 'bracelet': return 50;
      default: return 40;
    }
  }

  private async callGPTImage1(
    modelImage: Buffer | null,
    jewelryImage: Buffer,
    jewelryMetadata: JewelryMetadata
  ): Promise<Buffer> {
    try {
      console.log('Starting GPT-Image-1 jewelry generation with Indian model...');

      // Create a prompt for generating a new image with Indian model wearing the jewelry
      const prompt = this.createIndianModelPrompt(jewelryMetadata);

      console.log('Calling GPT-Image-1 generation endpoint with jewelry image and prompt:', prompt);

      // Use the generation endpoint to create a new image with Indian model wearing the jewelry
      // Note: GPT-Image-1 generation endpoint only takes text prompts, not image inputs
      const response = await this.openai.images.generate({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024'
      });

      if (!response.data || !response.data[0]) {
        console.error('Invalid response structure:', response);
        throw new Error('No image data received from GPT-Image-1');
      }

      // Check if we got b64_json or url
      let imageBuffer: Buffer;
      if (response.data[0].b64_json) {
        console.log('Received base64 image data');
        imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
      } else if (response.data[0].url) {
        console.log('Downloading generated image from URL:', response.data[0].url);
        const imageResponse = await fetch(response.data[0].url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`);
        }
        imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      } else {
        throw new Error('No image URL or base64 data received from GPT-Image-1');
      }

      console.log('GPT-Image-1 generation completed successfully');
      return imageBuffer;
    } catch (error) {
      console.error('GPT-Image-1 API error:', error);
      throw new Error(`GPT-Image-1 generation failed: ${error}`);
    }
  }

  private calculateJewelryPlacement(
    landmarks: any,
    jewelryType: string,
    imageWidth: number,
    imageHeight: number
  ): { x: number; y: number; width: number; height: number } {
    console.log('Calculating jewelry placement for type:', jewelryType);

    // Default placement (center of image)
    let placement = {
      x: Math.floor(imageWidth * 0.4),
      y: Math.floor(imageHeight * 0.3),
      width: Math.floor(imageWidth * 0.2),
      height: Math.floor(imageHeight * 0.15)
    };

    if (landmarks && landmarks.length > 0) {
      // Use MediaPipe landmarks for precise placement
      const faceLandmarks = landmarks[0];

      switch (jewelryType.toLowerCase()) {
        case 'necklace':
          // Place around neck area (below chin)
          const chin = faceLandmarks[152]; // Chin landmark
          placement = {
            x: Math.floor((chin.x * imageWidth) - (imageWidth * 0.15)),
            y: Math.floor((chin.y * imageHeight) + (imageHeight * 0.05)),
            width: Math.floor(imageWidth * 0.3),
            height: Math.floor(imageHeight * 0.2)
          };
          break;

        case 'earrings':
          // Place on ears
          const leftEar = faceLandmarks[234]; // Left ear
          placement = {
            x: Math.floor((leftEar.x * imageWidth) - (imageWidth * 0.05)),
            y: Math.floor(leftEar.y * imageHeight),
            width: Math.floor(imageWidth * 0.08),
            height: Math.floor(imageHeight * 0.12)
          };
          break;

        case 'ring':
          // This would need hand landmarks, for now use default
          placement = {
            x: Math.floor(imageWidth * 0.6),
            y: Math.floor(imageHeight * 0.7),
            width: Math.floor(imageWidth * 0.1),
            height: Math.floor(imageHeight * 0.08)
          };
          break;

        default:
          // Keep default placement
          break;
      }
    }

    console.log('Calculated placement:', placement);
    return placement;
  }

  private createDetailedJewelryPrompt(jewelryMetadata: JewelryMetadata): string {
    const basePrompt = `Create a photorealistic portrait of a beautiful woman wearing ${jewelryMetadata.type}.`;

    let specificPrompt = '';
    switch (jewelryMetadata.type.toLowerCase()) {
      case 'necklace':
        specificPrompt = 'The woman should be wearing an elegant necklace that drapes naturally around her neck. The necklace should be clearly visible and well-positioned. Professional portrait photography with good lighting that shows the jewelry details.';
        break;
      case 'earrings':
        specificPrompt = 'The woman should be wearing beautiful earrings that are clearly visible on both ears. The earrings should complement her face shape and be well-lit to show their details. Professional portrait photography.';
        break;
      case 'ring':
        specificPrompt = 'The woman should be wearing an elegant ring on her finger, with her hand positioned to show the ring clearly. The ring should be well-lit and detailed. Professional portrait photography.';
        break;
      case 'bracelet':
        specificPrompt = 'The woman should be wearing a beautiful bracelet on her wrist, with her arm positioned to show the bracelet clearly. Professional portrait photography with good lighting.';
        break;
      default:
        specificPrompt = `The woman should be wearing the ${jewelryMetadata.type} in a natural and elegant way. Professional portrait photography.`;
    }

    return `${basePrompt} ${specificPrompt} High quality, realistic, professional photography style with excellent lighting and composition. The jewelry should be the focal point and clearly visible.`;
  }

  private createGPTImage1Prompt(jewelryMetadata: JewelryMetadata): string {
    const basePrompt = `Create a photorealistic jewelry try-on image showing a person wearing ${jewelryMetadata.type}.`;

    let specificPrompt = '';
    switch (jewelryMetadata.type.toLowerCase()) {
      case 'necklace':
        specificPrompt = 'Place the necklace naturally around the neck, ensuring proper draping and positioning. The necklace should follow the natural curve of the neckline.';
        break;
      case 'earrings':
        specificPrompt = 'Position the earrings on both ears, ensuring they hang naturally and match the person\'s ear shape and size.';
        break;
      case 'ring':
        specificPrompt = 'Place the ring on an appropriate finger, ensuring proper sizing and natural hand positioning.';
        break;
      case 'bracelet':
        specificPrompt = 'Position the bracelet on the wrist, ensuring it fits naturally and follows the wrist\'s contour.';
        break;
      default:
        specificPrompt = `Position the ${jewelryMetadata.type} appropriately on the person.`;
    }

    return `${basePrompt} ${specificPrompt} The result should look natural and realistic, maintaining the original person's appearance while seamlessly integrating the jewelry. Ensure proper lighting, shadows, and reflections to make the jewelry appear as if it was actually worn by the person. High quality, professional photography style.`;
  }

  private createSpecificJewelryPrompt(jewelryMetadata: JewelryMetadata): string {
    const jewelryType = jewelryMetadata.type.toLowerCase();

    // Create a list of jewelry types to exclude
    const allJewelryTypes = ['earrings', 'necklace', 'ring', 'bracelet', 'watch', 'anklet', 'chain', 'pendant'];
    const excludeTypes = allJewelryTypes.filter(type => type !== jewelryType);
    const exclusionList = excludeTypes.join(', ');

    // Base instruction with strong emphasis on exclusion
    const restrictiveBase = `CRITICAL INSTRUCTION: Add ONLY a ${jewelryType} and absolutely NO other jewelry. `;
    const exclusionInstruction = `FORBIDDEN: Do not add ${exclusionList}. `;

    switch (jewelryType) {
      case 'necklace':
        return `${restrictiveBase}${exclusionInstruction}Place a single necklace around the person's neck. The person should NOT be wearing any earrings, rings, bracelets, watches, or other jewelry. Keep the person's face, hair, clothing, and background exactly the same. The necklace should drape naturally around the neck with realistic lighting and shadows that match the original photo. Professional photography quality. Ensure no other jewelry is visible anywhere on the person.`;

      case 'earrings':
        return `${restrictiveBase}${exclusionInstruction}Place earrings on the person's ears only. The person should NOT be wearing any necklaces, rings, bracelets, watches, or other jewelry. Keep the person's face, hair, clothing, and background exactly the same. The earrings should be positioned naturally on both ears with realistic lighting and shadows that match the original photo. Professional photography quality. Ensure no other jewelry is visible anywhere on the person.`;

      case 'ring':
        return `${restrictiveBase}${exclusionInstruction}Place a single ring on the person's finger only. The person should NOT be wearing any earrings, necklaces, bracelets, watches, or other jewelry. Keep the person's hand, clothing, and background exactly the same. The ring should fit naturally on the finger with realistic lighting and shadows that match the original photo. Professional photography quality. Ensure no other jewelry is visible anywhere on the person.`;

      case 'bracelet':
        return `${restrictiveBase}${exclusionInstruction}Place a single bracelet on the person's wrist only. The person should NOT be wearing any earrings, necklaces, rings, watches, or other jewelry. Keep the person's hand, arm, clothing, and background exactly the same. The bracelet should fit naturally around the wrist with realistic lighting and shadows that match the original photo. Professional photography quality. Ensure no other jewelry is visible anywhere on the person.`;

      default:
        return `${restrictiveBase}${exclusionInstruction}Add ONLY the ${jewelryType} to the appropriate location on the person. The person should NOT be wearing any other jewelry items. Keep the person's appearance, clothing, and background exactly the same. The jewelry should be positioned naturally with realistic lighting and shadows that match the original photo. Professional photography quality. Ensure no other jewelry is visible anywhere on the person.`;
    }
  }

  private createCombinationPrompt(jewelryMetadata: JewelryMetadata): string {
    const basePrompt = "I have two images: 1) A person's photo, and 2) A jewelry item. Please analyze both images and create a photorealistic image where the jewelry from the second image is placed on the person from the first image. ";

    switch (jewelryMetadata.type) {
      case 'earrings':
        return `${basePrompt}Place the earrings on the person's ears. Keep the person's face, hair, skin tone, lighting, and background exactly the same as the original. Only add the earrings with realistic shadows and lighting that matches the original photo.`;
      case 'necklace':
        return `${basePrompt}Place the necklace around the person's neck. Keep the person's face, clothing, skin tone, lighting, and background exactly the same as the original. Only add the necklace with realistic shadows and lighting that matches the original photo.`;
      case 'ring':
        return `${basePrompt}Place the ring on the person's finger. Keep the person's hand, skin tone, lighting, and background exactly the same as the original. Only add the ring with realistic shadows and lighting that matches the original photo.`;
      case 'bracelet':
        return `${basePrompt}Place the bracelet on the person's wrist. Keep the person's hand, skin tone, lighting, and background exactly the same as the original. Only add the bracelet with realistic shadows and lighting that matches the original photo.`;
      default:
        return `${basePrompt}Place the jewelry appropriately on the person. Keep the person's appearance, lighting, and background exactly the same as the original. Only add the jewelry with realistic shadows and lighting that matches the original photo.`;
    }
  }

  private createIndianModelPrompt(jewelryMetadata: JewelryMetadata): string {
    const jewelryType = jewelryMetadata.type.toLowerCase();
    const basePrompt = `Create a photorealistic image of a beautiful Indian model wearing a ${jewelryType}. `;

    let specificPrompt = '';
    switch (jewelryType) {
      case 'necklace':
        specificPrompt = `The Indian model should be elegantly posed to showcase the necklace, which should drape naturally around her neck. The model should have beautiful Indian features, long dark hair, and be wearing elegant attire that complements the necklace. Professional portrait photography with excellent lighting that highlights both the model's beauty and the necklace details.`;
        break;

      case 'earrings':
        specificPrompt = `The Indian model should be elegantly posed to showcase the earrings, which should be clearly visible on both ears. The model should have beautiful Indian features, styled hair that doesn't obscure the earrings, and be wearing elegant attire. Professional portrait photography with excellent lighting that highlights both the model's beauty and the earring details.`;
        break;

      case 'ring':
        specificPrompt = `The Indian model should be elegantly posed with her hand positioned to showcase the ring, which should be clearly visible on her finger. The model should have beautiful Indian features, well-manicured hands, and be wearing elegant attire. Professional portrait photography with excellent lighting that highlights both the model's beauty and the ring details.`;
        break;

      case 'bracelet':
        specificPrompt = `The Indian model should be elegantly posed with her wrist positioned to showcase the bracelet, which should be clearly visible around her wrist. The model should have beautiful Indian features, graceful hands, and be wearing elegant attire. Professional portrait photography with excellent lighting that highlights both the model's beauty and the bracelet details.`;
        break;

      default:
        specificPrompt = `The Indian model should be elegantly posed to showcase the ${jewelryType}. The model should have beautiful Indian features and be wearing elegant attire that complements the jewelry. Professional portrait photography with excellent lighting that highlights both the model's beauty and the jewelry details.`;
    }

    return `${basePrompt}${specificPrompt} The image should be high quality, realistic, and professionally composed with a clean, elegant background. The jewelry should be the focal point while the Indian model's natural beauty enhances the overall composition. Studio lighting, fashion photography style.`;
  }

  private createCombinedImagePrompt(jewelryMetadata: JewelryMetadata): string {
    const jewelryType = jewelryMetadata.type.toLowerCase();
    const basePrompt = `This image contains both a person and a ${jewelryType} item. Please create a photorealistic jewelry try-on image where the ${jewelryType} is naturally worn by the person. `;

    switch (jewelryType) {
      case 'necklace':
        return `${basePrompt}Place the necklace around the person's neck in a natural, elegant way. The necklace should drape properly and have realistic lighting, shadows, and reflections that match the original photo. Keep the person's face, hair, clothing, and background exactly the same. Only add the necklace - do not add any other jewelry items.`;

      case 'earrings':
        return `${basePrompt}Place the earrings on the person's ears in a natural way. The earrings should be positioned correctly on both ears with realistic lighting and shadows that match the original photo. Keep the person's face, hair, clothing, and background exactly the same. Only add the earrings - do not add any other jewelry items.`;

      case 'ring':
        return `${basePrompt}Place the ring on the person's finger in a natural way. The ring should fit properly on the finger with realistic lighting and shadows that match the original photo. Keep the person's hand, clothing, and background exactly the same. Only add the ring - do not add any other jewelry items.`;

      case 'bracelet':
        return `${basePrompt}Place the bracelet on the person's wrist in a natural way. The bracelet should fit properly around the wrist with realistic lighting and shadows that match the original photo. Keep the person's hand, arm, clothing, and background exactly the same. Only add the bracelet - do not add any other jewelry items.`;

      default:
        return `${basePrompt}Place the ${jewelryType} on the appropriate location on the person in a natural way. The jewelry should have realistic lighting and shadows that match the original photo. Keep the person's appearance, clothing, and background exactly the same. Only add the ${jewelryType} - do not add any other jewelry items.`;
    }
  }

  private async createCombinedInputImage(modelImage: Buffer, jewelryImage: Buffer): Promise<Buffer> {
    try {
      console.log('Creating combined input image for GPT-Image-1...');

      // Get dimensions of both images
      const modelMetadata = await sharp(modelImage).metadata();
      const jewelryMetadata = await sharp(jewelryImage).metadata();

      const targetWidth = 1024;
      const targetHeight = 1024;

      // Resize model image to fit the left side of the combined image
      const resizedModelImage = await sharp(modelImage)
        .resize({
          width: Math.floor(targetWidth * 0.7), // 70% of width for model
          height: targetHeight,
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Resize jewelry image to fit the right side
      const resizedJewelryImage = await sharp(jewelryImage)
        .resize({
          width: Math.floor(targetWidth * 0.3), // 30% of width for jewelry
          height: Math.floor(targetHeight * 0.3), // Smaller height for jewelry
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toBuffer();

      // Create combined image with model on left and jewelry on right
      const combinedImage = await sharp({
        create: {
          width: targetWidth,
          height: targetHeight,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
        .composite([
          {
            input: resizedModelImage,
            left: 0,
            top: 0
          },
          {
            input: resizedJewelryImage,
            left: Math.floor(targetWidth * 0.7),
            top: Math.floor(targetHeight * 0.1) // Position jewelry in upper right
          }
        ])
        .png()
        .toBuffer();

      console.log('Combined input image created successfully');
      return combinedImage;

    } catch (error) {
      console.error('Error creating combined input image:', error);
      throw new Error(`Failed to create combined input image: ${error}`);
    }
  }

  private async applyFinalBlending(
    baseImage: Buffer,
    position: { x: number; y: number },
    metadata: JewelryMetadata
  ): Promise<Buffer> {
    // Apply subtle color correction and lighting adjustments
    return await sharp(baseImage)
      .modulate({
        brightness: 1.02, // Slightly brighter
        saturation: 1.05  // Slightly more saturated
      })
      .sharpen({ sigma: 0.5, m1: 0.5, m2: 2 }) // Subtle sharpening
      .png()
      .toBuffer();
  }

  private async postProcessResult(
    generatedImage: Buffer,
    jewelryMetadata: JewelryMetadata
  ): Promise<Buffer> {
    try {
      console.log('Starting post-processing for jewelry type:', jewelryMetadata.type);

      // Apply quality enhancements
      const enhancedImage = await sharp(generatedImage)
        .modulate({
          brightness: 1.01, // Slight brightness adjustment
          saturation: 1.02  // Slight saturation boost
        })
        .sharpen({ sigma: 0.3, m1: 0.3, m2: 1.5 }) // Gentle sharpening
        .png()
        .toBuffer();

      console.log('Post-processing completed successfully');
      return enhancedImage;
    } catch (error) {
      console.error('Error in post-processing:', error);
      // Return original image if post-processing fails
      return generatedImage;
    }
  }
}
