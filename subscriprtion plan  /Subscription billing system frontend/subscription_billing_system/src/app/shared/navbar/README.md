# Navbar Logo Integration

## Logo File Formats

The navbar now supports multiple logo formats with a fallback system:

1. **WebP format** (modern, optimized) - Primary choice for modern browsers
2. **PNG format** - Fallback for browsers that don't support WebP
3. **SVG format** - Vector fallback if PNG fails to load
4. **Inline SVG** - Direct SVG code if external SVG file fails
5. **Text fallback** - "DD" text with gradient if all image formats fail

## File Locations

Place the logo files in the following locations:

```
Subscription billing system frontend/subscription_billing_system/src/assets/dd-logo.webp
Subscription billing system frontend/subscription_billing_system/src/assets/dd-logo.png
Subscription billing system frontend/subscription_billing_system/src/assets/dd-logo.svg
```

## Creating Different Formats

1. **WebP format**: Use an image converter to convert the PNG to WebP format.
   - Online converters: [Convertio](https://convertio.co/png-webp/), [Cloudconvert](https://cloudconvert.com/png-to-webp)
   - Command line: `cwebp dd-logo.png -o dd-logo.webp`

2. **PNG format**: Save the original logo as PNG.

3. **SVG format**: We've created an SVG version that closely resembles the logo.
   - The SVG file is already created at the correct location.

## Troubleshooting

If the logo doesn't appear:

1. Check that all files are in the correct location
2. Verify file permissions are correct
3. Clear browser cache or try a different browser
4. Check browser console for any errors
5. If all else fails, the text "DD" will display as the final fallback

## Logo Specifications
- Logo dimensions: 40px height (width is auto)
- Background color: #5e6472 (dark gray)
- Gradient colors: #FFDD00 (yellow) to #FF8800 (orange)
- Overlapping D letters design
- Border radius: 8px (rounded corners) 