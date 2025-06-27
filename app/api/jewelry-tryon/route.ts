import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import sharp from 'sharp';
import { JewelryTryOnProcessor } from '@/lib/jewelry-processor';

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
    const jewelryType = formData.get('jewelryType') as string;
    const jewelryWidth = parseFloat(formData.get('jewelryWidth') as string);
    const jewelryHeight = parseFloat(formData.get('jewelryHeight') as string);
    const jewelryDepth = parseFloat(formData.get('jewelryDepth') as string);
    const circumference = parseFloat(formData.get('circumference') as string);

    if (!jewelryImage) {
      return NextResponse.json({ error: 'Jewelry image is required' }, { status: 400 });
    }

    // Convert files to buffers
    const jewelryBuffer = Buffer.from(await jewelryImage.arrayBuffer());
    const modelBuffer = modelImage ? Buffer.from(await modelImage.arrayBuffer()) : null;

    // Initialize the jewelry processor
    const processor = new JewelryTryOnProcessor(openai);

    // Process the jewelry try-on
    const result = await processor.processJewelryTryOn({
      jewelryImage: jewelryBuffer,
      modelImage: modelBuffer,
      jewelryMetadata: {
        type: jewelryType,
        width: jewelryWidth,
        height: jewelryHeight,
        depth: jewelryDepth,
        circumference: circumference,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Jewelry try-on error:', error);
    return NextResponse.json(
      { error: 'Failed to process jewelry try-on' },
      { status: 500 }
    );
  }
}
