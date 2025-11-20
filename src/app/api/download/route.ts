import { NextRequest, NextResponse } from 'next/server';

// Cobalt instance - defaults to local, can be overridden with env variable
const COBALT_INSTANCE = process.env.COBALT_API_URL || 'http://localhost:9000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, vQuality, isAudioOnly } = body;

    console.log('Download request:', { url, vQuality, isAudioOnly });

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    try {
      const payload: any = {
        url: url,
      };

      // Add quality settings if specified
      if (isAudioOnly) {
        payload.isAudioOnly = true;
      } else if (vQuality) {
        payload.videoQuality = vQuality;
      }

      console.log('Calling Cobalt instance:', COBALT_INSTANCE);
      console.log('Payload:', payload);

      // Call Cobalt API
      const response = await fetch(`${COBALT_INSTANCE}/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cobalt error response:', errorText);
        throw new Error(`Cobalt instance returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', JSON.stringify(data).substring(0, 200));

      // Check for error status
      if (data.status === 'error' || data.error) {
        throw new Error(data.text || data.error?.code || 'Unknown error from Cobalt');
      }

      // Check for direct URL
      if (data.url) {
        console.log('Success! Download URL found');
        return NextResponse.json({ url: data.url });
      }

      // Some instances might return a 'picker' array for multiple formats
      if (data.picker && Array.isArray(data.picker) && data.picker.length > 0) {
        console.log('Success! Using picker URL');
        return NextResponse.json({ url: data.picker[0].url });
      }

      throw new Error('No download URL in response');

    } catch (err) {
      console.error('Cobalt API error:', err);
      return NextResponse.json(
        { error: `Download failed: ${(err as Error).message}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
