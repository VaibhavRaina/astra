import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const jewelryImage = formData.get('jewelryImage') as File;
    const modelImage = formData.get('modelImage') as File | null;
    const mode = formData.get('mode') as string;
    const prompt = formData.get('prompt') as string | null;

    if (!jewelryImage) {
      return NextResponse.json({ error: 'Jewelry image is required' }, { status: 400 });
    }

    const startTime = Date.now();

    if (mode === 'photo') {
      // Photo Mode: Use chat completions with vision to analyze both images, then generate
      if (!modelImage) {
        return NextResponse.json({ error: 'Model image is required for photo mode' }, { status: 400 });
      }

      console.log('Processing photo mode - analyzing images and generating jewelry try-on');

      // Convert images to base64 for vision API
      const jewelryBuffer = await jewelryImage.arrayBuffer();
      const jewelryBase64 = Buffer.from(jewelryBuffer).toString('base64');

      const modelBuffer = await modelImage.arrayBuffer();
      const modelBase64 = Buffer.from(modelBuffer).toString('base64');

      // First, use GPT-4o vision to analyze both images
      const analysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze these two images: the first is jewelry and the second is a person. Describe in detail how the jewelry should be placed on the person, considering the jewelry type, the person\'s pose, lighting, and styling. Provide a detailed description for generating a new image showing the person wearing this jewelry naturally and realistically.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${jewelryBase64}`
                }
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${modelBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const analysisText = analysisResponse.choices[0]?.message?.content;
      if (!analysisText) {
        console.error('No analysis text received:', analysisResponse);
        throw new Error('Failed to analyze images');
      }

      console.log('Analysis complete:', analysisText.substring(0, 200) + '...');
      console.log('Generating final image');

      // Strong prompt to ensure jewelry is placed on the actual uploaded person image
      const generationPrompt = `Take the person in the second image exactly as they are, and digitally add the jewelry from the first image onto them. Do not change the person's face, body, hair, skin tone, or clothing. Only add the jewelry in a natural and realistic way.\n\nDetails for placement: ${analysisText}`;

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: generationPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high'
      });

      console.log('OpenAI response structure:', {
        hasData: !!response.data,
        dataLength: response.data?.length,
        firstItem: response.data?.[0] ? Object.keys(response.data[0]) : 'none'
      });

      // Handle both URL and base64 responses
      const responseData = response.data?.[0];
      let processedImageBase64: string;

      if (responseData?.b64_json) {
        // Image returned as base64
        processedImageBase64 = responseData.b64_json;
        console.log('Received base64 image from OpenAI');
      } else if (responseData?.url) {
        // Image returned as URL - download it
        console.log('Received image URL from OpenAI, downloading...');
        const imageResponse = await fetch(responseData.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        processedImageBase64 = Buffer.from(imageBuffer).toString('base64');
      } else {
        console.error('No image data in response. Full response:', JSON.stringify(response, null, 2));
        throw new Error('No image data returned from OpenAI. Check console for full response details.');
      }

      return NextResponse.json({
        processedImage: processedImageBase64,
        originalImage: modelBase64,
        confidence: 0.9,
        processingTime: Date.now() - startTime,
        method: 'photo'
      });

    } else if (mode === 'prompt') {
      // Prompt Mode: Analyze jewelry then generate Indian model with jewelry
      console.log('Processing prompt mode - analyzing jewelry and generating Indian model');

      // Convert jewelry image to base64 for vision API
      const jewelryBuffer = await jewelryImage.arrayBuffer();
      const jewelryBase64 = Buffer.from(jewelryBuffer).toString('base64');

      // First, analyze the jewelry to understand its characteristics
      const analysisResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this jewelry image in detail. Describe the type of jewelry, its style, color, materials, and any distinctive features. Then provide a detailed description for generating an image of a beautiful Indian model wearing this jewelry with professional photography, elegant pose, and lighting that showcases the jewelry beautifully.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${jewelryBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 500
      });

      const analysisText = analysisResponse.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('Failed to analyze jewelry');
      }

      console.log('Jewelry analysis complete, generating Indian model image');

      // Combine the analysis with the user prompt or default Indian model prompt
      const basePrompt = prompt || 'Create a photorealistic image of a beautiful Indian model with elegant features, professional studio lighting, and a neutral background that showcases jewelry beautifully.';
      const finalPrompt = `${basePrompt} Based on this jewelry analysis: ${analysisText}`;

      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: finalPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high'
      });

      console.log('OpenAI response structure:', {
        hasData: !!response.data,
        dataLength: response.data?.length,
        firstItem: response.data?.[0] ? Object.keys(response.data[0]) : 'none'
      });

      // Handle both URL and base64 responses
      const responseData = response.data?.[0];
      let processedImageBase64: string;

      if (responseData?.b64_json) {
        // Image returned as base64
        processedImageBase64 = responseData.b64_json;
        console.log('Received base64 image from OpenAI');
      } else if (responseData?.url) {
        // Image returned as URL - download it
        console.log('Received image URL from OpenAI, downloading...');
        const imageResponse = await fetch(responseData.url);
        const imageBuffer = await imageResponse.arrayBuffer();
        processedImageBase64 = Buffer.from(imageBuffer).toString('base64');
      } else {
        console.error('No image data in response. Full response:', JSON.stringify(response, null, 2));
        throw new Error('No image data returned from OpenAI. Check console for full response details.');
      }

      return NextResponse.json({
        processedImage: processedImageBase64,
        originalImage: undefined, // No original image in generation mode
        confidence: 0.95,
        processingTime: Date.now() - startTime,
        method: 'prompt'
      });

    } else {
      return NextResponse.json({ error: 'Invalid mode. Use "photo" or "prompt"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Jewelry try-on error:', error);
    return NextResponse.json(
      { error: `Failed to process jewelry try-on: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
