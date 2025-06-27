import { NextResponse } from 'next/server';
import { virtualTryOnService } from '../../../lib/virtual-tryon';
import type { TryOnRequest } from '../../../lib/types';

export async function POST(request: Request) {
  try {
    const body: TryOnRequest = await request.json();

    // Validate based on method
    if (body.method === 'upload' || body.method === 'both') {
      if (!body.modelImage || !body.landmarks) {
        return NextResponse.json({ error: 'Model image and landmarks are required for this method.' }, { status: 400 });
      }
    } else if (body.method === 'prompt') {
      if (!body.modelPrompt) {
        return NextResponse.json({ error: 'A model prompt is required for this method.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid method specified.' }, { status: 400 });
    }

    const result = await virtualTryOnService.processVirtualTryOn(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[VIRTUAL TRY-ON API ERROR]', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    
    // Provide more specific error messages based on the error type
    let statusCode = 500;
    if (errorMessage.includes('Landmarks are required')) {
        statusCode = 400;
    } else if (errorMessage.includes('Inpainting failed')) {
        statusCode = 502; // Bad Gateway
    } else if (errorMessage.includes('Failed to fetch inpainting result')) {
        statusCode = 502; // Bad Gateway
    }

    return NextResponse.json(
      { error: 'Failed to process virtual try-on.', details: errorMessage },
      { status: statusCode }
    );
  }
}
