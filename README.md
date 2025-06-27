# AI Jewelry Virtual Try-On System

A sophisticated jewelry virtual try-on application that uses OpenAI's image editing capabilities, MediaPipe for landmark detection, and Sharp.js for precise image processing.

## Features

### 🎯 Core Functionality
- **Real-time jewelry placement** using OpenAI's image editing API
- **Landmark detection** with MediaPipe for precise positioning
- **Scale calculation** based on anatomical measurements
- **Advanced image preprocessing** for optimal results
- **Multiple try-on modes**: Photo enhancement, AI generation, and intelligent placement

### 🔧 Technical Implementation
1. **Input Preparation**: Upload jewelry and model images with metadata
2. **GPT-Image Processing**: Uses OpenAI's image editing for initial placement and lighting
3. **Landmark Detection**: MediaPipe detects facial features, hands, and body landmarks
4. **Scale Calculation**: Computes pixel-per-mm ratios for realistic sizing
5. **Precise Overlay**: Sharp.js for exact jewelry positioning
6. **Shadow & Blending**: Adds realistic shadows and lighting effects

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- OpenAI API key
- Modern web browser with WebGL support

### Installation

1. **Clone and install dependencies**:
```bash
cd project
npm install
```

2. **Configure environment variables**:
```bash
# Copy the example environment file
cp .env.local.example .env.local

# Edit .env.local and add your OpenAI API key
OPENAI_API_KEY=your_openai_api_key_here
```

3. **Start the development server**:
```bash
npm run dev
```

4. **Open your browser**:
Navigate to `http://localhost:3000`

## Usage Guide

### Step 1: Upload Jewelry
- Upload a high-quality jewelry image (PNG with transparency preferred)
- Enter jewelry metadata:
  - Type (ring, necklace, earrings, bracelet)
  - Dimensions in millimeters (width, height, depth)
  - Circumference for rings and bracelets

### Step 2: Choose Try-On Mode

#### Photo Enhancement Mode
- Upload a person's photo
- AI enhances the photo and adds jewelry with realistic lighting

#### AI Generation Mode  
- Describe your ideal model using text prompts
- AI generates a person wearing your jewelry
- Use advanced options for ethnicity, age, style, and lighting

#### Photo + AI Placement Mode
- Upload a person's photo
- AI intelligently places jewelry with precise positioning and scaling

### Step 3: Advanced Processing (Optional)

#### Image Preprocessing
- Adjust brightness, contrast, saturation
- Apply noise reduction and sharpening
- Optimize image quality for better results

#### Landmark Detection
- Visualize detected facial features, hands, or body landmarks
- Verify accurate positioning for jewelry placement
- See confidence scores for detection accuracy

### Step 4: Generate and Fine-tune
- Click "Generate Virtual Try-On" to process
- Use adjustment controls to fine-tune size and position
- Download high-quality results

## API Endpoints

### POST /api/jewelry-tryon
Processes jewelry try-on requests with the following parameters:

**Form Data:**
- `jewelryImage`: Jewelry image file (PNG/JPG)
- `modelImage`: Person's photo (optional)
- `jewelryType`: Type of jewelry (string)
- `jewelryWidth`: Width in mm (number)
- `jewelryHeight`: Height in mm (number)
- `jewelryDepth`: Depth in mm (number)
- `circumference`: Circumference in mm (optional)

**Response:**
```json
{
  "processedImage": "base64_encoded_result",
  "originalImage": "base64_encoded_original",
  "confidence": 0.92,
  "processingTime": 3500,
  "landmarks": {...}
}
```

## Technical Architecture

### Frontend Components
- **Main Interface** (`app/page.tsx`): Primary user interface
- **MediaPipe Processor** (`components/MediaPipeProcessor.tsx`): Landmark detection
- **Image Preprocessor** (`components/ImagePreprocessor.tsx`): Image enhancement
- **Virtual Try-On Service** (`lib/virtual-tryon.ts`): API integration

### Backend Processing
- **Jewelry Processor** (`lib/jewelry-processor.ts`): Main processing logic
- **Landmark Detector** (`lib/landmark-detector.ts`): MediaPipe integration
- **API Route** (`app/api/jewelry-tryon/route.ts`): HTTP endpoint

### Processing Pipeline
1. **Image Upload & Validation**
2. **OpenAI Image Editing** (initial placement)
3. **MediaPipe Landmark Detection**
4. **Scale Calculation** (pixel-per-mm ratios)
5. **Sharp.js Precise Overlay**
6. **Shadow & Lighting Effects**
7. **Result Generation**

## Supported Jewelry Types

### Earrings
- Detects ear landmarks for precise placement
- Supports studs, hoops, and drop earrings
- Automatic left/right ear positioning

### Necklaces
- Uses neck and shoulder landmarks
- Calculates proper draping and positioning
- Supports chains, pendants, and chokers

### Rings
- Detects finger landmarks and joints
- Calculates ring size based on finger width
- Supports all finger positions

### Bracelets
- Uses wrist landmarks for positioning
- Calculates circumference for proper fit
- Supports bangles, chains, and cuffs

## Performance Optimization

- **Image Compression**: Automatic optimization for faster processing
- **Caching**: Results cached for repeated requests
- **Fallback Processing**: Mock results when API is unavailable
- **Progressive Loading**: Step-by-step processing visualization

## Troubleshooting

### Common Issues

**API Key Errors**:
- Ensure your OpenAI API key is correctly set in `.env.local`
- Check that your API key has sufficient credits

**Image Processing Failures**:
- Use high-quality images (minimum 512x512 pixels)
- Ensure jewelry images have transparent backgrounds
- Check that person photos show the relevant body parts clearly

**Landmark Detection Issues**:
- Ensure good lighting in photos
- Use photos with clear, unobstructed views
- Check that the jewelry type matches the visible body parts

### Performance Tips
- Use PNG format for jewelry images with transparency
- Optimize image sizes (1024x1024 recommended)
- Ensure stable internet connection for API calls
- Use preprocessing to enhance image quality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review the API documentation
- Open an issue on GitHub with detailed information about your problem
