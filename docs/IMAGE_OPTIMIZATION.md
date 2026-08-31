# Image Optimization Report

## Summary

- Audited assets: 18
- Photographic PNG files converted: 13
- Converted PNG total: approximately 18.7 MB
- Replacement JPEG total: approximately 4.1 MB
- Source asset saving: approximately 14.6 MB (about 78%)

## Priority fixes implemented

| Asset group | Before | After | Delivery behavior |
| --- | ---: | ---: | --- |
| Contact factory gate | 3.61 MB PNG | 0.92 MB JPEG | Responsive AVIF/WebP through Next Image |
| Homepage hero | 2.27 MB PNG | 0.45 MB JPEG | Priority-loaded LCP image with responsive sizes |
| Four application images | 8.12 MB PNG | 1.48 MB JPEG | Responsive sizes; below-fold lazy loading |
| Factory and trade-show photos | 6.07 MB PNG | 1.26 MB JPEG | Responsive sizes; below-fold lazy loading |

The transparent logo remains PNG. The global market graphic remains PNG because it is an illustration and is already delivered through Next Image optimization.

## Implementation

- Next.js image output is configured for AVIF and WebP with a 30-day optimization cache.
- Above-the-fold hero images use the Next.js 16 `preload` property; supporting imagery keeps the framework's default lazy loading.
- `sizes`, intrinsic dimensions or `fill` containers are provided to prevent layout shift.
- Duplicate or grammatically incorrect alt text was corrected and page-hero alt text can now be specified per page.
