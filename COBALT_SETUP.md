# Cobalt Instance Setup

This downloader requires a Cobalt instance to work.

## Option 1: Run Cobalt Locally with Docker

1. **Make sure Docker Desktop is running**

2. **Run the Cobalt container:**
   ```bash
   docker run -d -p 9000:9000 --name cobalt-api ghcr.io/imputnet/cobalt:latest
   ```

3. **The app will automatically connect to `http://localhost:9000`**

4. **To stop the container:**
   ```bash
   docker stop cobalt-api
   ```

5. **To start it again:**
   ```bash
   docker start cobalt-api
   ```

## Option 2: Use Your Own Hosted Instance

1. **Deploy Cobalt to your server** following: https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md

2. **Set the environment variable:**
   Create a `.env.local` file in the project root:
   ```
   COBALT_API_URL=https://your-cobalt-instance.com
   ```

3. **Restart your dev server**

## Current Configuration

- Default: `http://localhost:9000` (local Docker instance)
- Can be overridden with `COBALT_API_URL` environment variable

## Testing Your Instance

Once your Cobalt instance is running, test it:
```bash
curl -X POST http://localhost:9000/ \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

You should get a JSON response with a download URL.
