# AI Jewelry Virtual Try-On Demo Guide

This guide walks you through using the AI Jewelry Virtual Try-On system with real examples.

## Quick Start Demo

### 1. Basic Setup
1. Open your browser and navigate to `http://localhost:3000`
2. You should see the AI Jewelry Studio interface

### 2. Upload Jewelry
**For this demo, you can use any jewelry image. Here are some tips:**
- Use PNG images with transparent backgrounds for best results
- Jewelry should be clearly visible and well-lit
- Recommended size: 512x512 pixels or larger

**Sample jewelry metadata:**
- **Ring**: Width: 18mm, Height: 20mm, Depth: 5mm, Circumference: 55mm
- **Necklace**: Width: 400mm, Height: 30mm, Depth: 8mm
- **Earrings**: Width: 15mm, Height: 35mm, Depth: 6mm
- **Bracelet**: Width: 180mm, Height: 12mm, Depth: 4mm

### 3. Try Different Modes

#### Mode 1: Photo Enhancement
1. Click on "Photo Only" tab
2. Upload a clear portrait photo showing the relevant body part
3. The AI will enhance the photo and add your jewelry

#### Mode 2: AI Generation
1. Click on "AI Generate" tab
2. Use one of the suggested prompts or write your own:
   - "Professional Indian woman in her 30s, elegant pose, neutral background, studio lighting"
   - "Young man with clean style, casual portrait, good lighting for jewelry display"
3. Adjust advanced options (ethnicity, age, style, lighting)
4. The AI will generate a person wearing your jewelry

#### Mode 3: Photo + AI Placement
1. Click on "Photo + AI" tab
2. Upload a person's photo
3. The AI will intelligently place jewelry with realistic positioning

### 4. Advanced Features

#### Image Preprocessing
1. After uploading a model image, click "Preprocessing"
2. Adjust settings:
   - **Brightness**: 80-120% for optimal lighting
   - **Contrast**: 90-110% for better definition
   - **Saturation**: 90-110% for natural colors
   - **Noise Reduction**: 1-3 for cleaner images

#### Landmark Detection
1. Click "Landmarks" to see detected features
2. Verify that landmarks are correctly positioned:
   - **Earrings**: Should detect ear positions
   - **Necklace**: Should detect neck and shoulder points
   - **Ring**: Should detect finger joints
   - **Bracelet**: Should detect wrist position

### 5. Generate and Fine-tune
1. Click "Generate Virtual Try-On"
2. Wait for processing (typically 10-30 seconds)
3. Use adjustment controls:
   - **Size**: 80-120% for realistic proportions
   - **Position**: Adjust left/right placement
4. Download your result

## Sample Workflows

### Workflow 1: Ring Try-On
```
1. Upload ring image (18mm width, 20mm height)
2. Select "Ring" type, enter dimensions
3. Choose "Photo + AI" mode
4. Upload hand photo showing fingers clearly
5. Enable landmark detection to verify finger positions
6. Generate try-on
7. Adjust size to 90-110% for realistic fit
```

### Workflow 2: Necklace with AI Model
```
1. Upload necklace image (400mm width, 30mm height)
2. Select "Necklace" type, enter dimensions
3. Choose "AI Generate" mode
4. Use prompt: "Elegant woman in professional attire, studio lighting"
5. Set ethnicity and age preferences
6. Generate try-on
7. Fine-tune position for natural draping
```

### Workflow 3: Earrings Enhancement
```
1. Upload earring image (15mm width, 35mm height)
2. Select "Earrings" type, enter dimensions
3. Choose "Photo Only" mode
4. Upload portrait photo with visible ears
5. Enable preprocessing to enhance image quality
6. Use landmark detection to verify ear positions
7. Generate enhanced result
```

## Tips for Best Results

### Photography Tips
- **Lighting**: Use even, natural lighting
- **Background**: Plain backgrounds work best
- **Pose**: Face camera directly for face jewelry
- **Resolution**: Higher resolution images (1024x1024+) give better results

### Jewelry Image Tips
- **Transparency**: PNG with transparent background is ideal
- **Angle**: Photograph jewelry from the angle it would be worn
- **Focus**: Ensure jewelry is sharp and in focus
- **Size**: Larger images allow for better detail preservation

### Prompt Writing Tips
- **Be Specific**: Include age, ethnicity, style, and lighting preferences
- **Context**: Mention the setting (studio, outdoor, casual, formal)
- **Lighting**: Specify lighting type (natural, studio, dramatic, soft)
- **Pose**: Describe the desired pose and expression

## Troubleshooting Common Issues

### Issue: Poor Jewelry Placement
**Solution**: 
- Use landmark detection to verify positioning
- Try preprocessing to enhance image quality
- Ensure jewelry type matches the visible body parts

### Issue: Unrealistic Sizing
**Solution**:
- Double-check jewelry dimensions in metadata
- Use size adjustment slider (typically 80-120%)
- Verify landmark detection accuracy

### Issue: Poor Image Quality
**Solution**:
- Use higher resolution source images
- Apply preprocessing with brightness/contrast adjustments
- Ensure good lighting in original photos

### Issue: API Errors
**Solution**:
- Check that OpenAI API key is correctly configured
- Verify sufficient API credits
- Try again if temporary API issues occur

## Advanced Customization

### Custom Prompts for Different Styles
- **Luxury**: "High-end fashion model, professional studio lighting, elegant pose"
- **Casual**: "Friendly person, natural lighting, relaxed casual style"
- **Traditional**: "Person in traditional attire, cultural styling, warm lighting"
- **Modern**: "Contemporary style, minimalist background, clean aesthetic"

### Jewelry-Specific Considerations
- **Rings**: Focus on hand positioning and finger visibility
- **Necklaces**: Ensure neckline and chest area are visible
- **Earrings**: Hair should not obstruct ear visibility
- **Bracelets**: Wrist and lower arm should be clearly visible

## Performance Optimization

### For Faster Processing
- Use smaller images (512x512) for testing
- Skip preprocessing for simple images
- Use fallback mode when API is slow

### For Better Quality
- Use larger images (1024x1024 or higher)
- Apply preprocessing for optimal enhancement
- Use landmark detection for precise placement

## Next Steps

After trying the demo:
1. Experiment with different jewelry types
2. Try various photography styles and prompts
3. Test the preprocessing and landmark detection features
4. Integrate the API into your own applications
5. Customize the interface for your specific needs

## Support

If you encounter issues during the demo:
1. Check the browser console for error messages
2. Verify your OpenAI API key is correctly configured
3. Ensure you have sufficient API credits
4. Try the fallback mode if API calls fail
5. Refer to the main README for detailed troubleshooting
