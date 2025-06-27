# Virtual Jewelry Try-On Next.js Project

This project provides a virtual jewelry try-on service using a Next.js backend. It leverages MediaPipe for landmark detection, IP-Adapter with Stable Diffusion for realistic image generation, and Sharp for high-fidelity image processing.

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Prerequisites

- Node.js (v18 or later)
- npm, yarn, or pnpm
- A Replicate API token

### 2. Installation

First, clone the repository and navigate into the project directory. Then, install the required dependencies:

```bash
npm install
```

### 3. Environment Variables

The application requires a Replicate API token to function. Create a `.env.local` file in the root of your project and add your token:

```
REPLICATE_API_TOKEN=your_replicate_api_token_here
```

You can get your API token from your [Replicate account settings](https://replicate.com/account).

### 4. Running the Development Server

Once the dependencies are installed and the environment variables are set, you can start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## API Endpoint: Virtual Try-On

The core functionality is exposed via a POST endpoint at `/api/try-on`.

### Request

**URL**: `http://localhost:3000/api/try-on`
**Method**: `POST`
**Headers**:
- `Content-Type: application/json`

**Body** (`TryOnRequest`):

```json
{
  "jewelryImage": "URL_OR_BASE64_ENCODED_JEWELRY_IMAGE",
  "modelImage": "URL_OR_BASE64_ENCODED_MODEL_IMAGE",
  "jewelryMetadata": {
    "width": 25, // width in mm
    "height": 25, // height in mm
    "type": "earrings" // "earrings" | "necklace" | "ring" | "bracelet"
  },
  "modelPrompt": "A photo of a woman wearing a pearl earring" // Optional prompt
}
```

### Example `curl` Request

Here is an example of how to call the API using `curl`. You will need to replace the placeholder image URLs with actual, publicly accessible URLs.

```bash
curl -X POST http://localhost:3000/api/try-on \
-H "Content-Type: application/json" \
-d '{
  "jewelryImage": "https://example.com/jewelry.png",
  "modelImage": "https://example.com/model.jpg",
  "jewelryMetadata": {
    "width": 20,
    "height": 20,
    "type": "earrings"
  }
}'
```

### Response

The API will return a JSON object containing the processed image in base64 format.

```json
{
  "processedImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg..."
}
