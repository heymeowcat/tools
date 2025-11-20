import { NextRequest, NextResponse } from 'next/server';

const COBALT_INSTANCE = process.env.COBALT_API_URL || 'http://localhost:9000';

export async function GET(request: NextRequest) {
  try {
    let url = request.nextUrl.searchParams.get('url');
    const filename = request.nextUrl.searchParams.get('filename');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // If the URL is a Cobalt tunnel URL (starts with /tunnel), prepend the Cobalt instance URL
    if (url.startsWith('/tunnel') || url.startsWith('http://localhost:9000/tunnel')) {
      if (url.startsWith('/tunnel')) {
        url = `${COBALT_INSTANCE}${url}`;
      }
      console.log('Proxying Cobalt tunnel:', url);
    } else {
      console.log('Proxying external URL:', url);
    }

    // Fetch the file from the URL
    console.log('Fetching upstream:', url);
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Upstream fetch failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch file: ${response.status}`);
    }

    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    console.log('Upstream headers:', {
      contentType,
      contentLength: response.headers.get('content-length'),
      disposition: response.headers.get('content-disposition')
    });
    
    // Create headers for the download
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    
    // Copy other relevant headers
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    // Stream the response
    return new NextResponse(response.body, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
