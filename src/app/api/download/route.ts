import { NextRequest, NextResponse } from 'next/server';

// List of community Cobalt instances to try
// Based on instances.cobalt.best and cobalt.directory
const COBALT_INSTANCES = [
  'https://cobalt.meowing.de',
  'https://cobalt-api.kwiatekmiki.com',
  'https://co.nadeko.net',
];

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

    // Try each instance
    for (const instance of COBALT_INSTANCES) {
      try {
        console.log(`Trying instance: ${instance}`);
        
        const payload: any = {
          url: url,
        };

        // Add quality settings if specified
        if (isAudioOnly) {
          payload.isAudioOnly = true;
        } else if (vQuality) {
          payload.vQuality = vQuality;
        }

        console.log('Payload:', payload);

        const response = await fetch(`${instance}/`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        console.log(`Response status from ${instance}:`, response.status);

        if (!response.ok) {
          console.error(`HTTP error from ${instance}:`, response.status);
          continue;
        }

        const data = await response.json();
        console.log('Response data:', JSON.stringify(data).substring(0, 200));

        // Check for error status
        if (data.status === 'error' || data.error) {
          console.error(`Error from ${instance}:`, data.text || data.error);
          continue;
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

        console.log(`No valid URL in response from ${instance}`);
      } catch (err) {
        console.error(`Failed with instance ${instance}:`, err);
        continue;
      }
    }

    // If all instances fail, redirect to cobalt.tools
    const cobaltUrl = `https://cobalt.tools/?u=${encodeURIComponent(url)}`;
    return NextResponse.json({
      url: cobaltUrl,
      message: 'Community instances unavailable. Redirecting to cobalt.tools.',
      isRedirect: true
    });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
