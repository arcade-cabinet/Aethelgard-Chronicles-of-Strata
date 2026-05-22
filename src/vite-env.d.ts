/// <reference types="vite/client" />

// react-three-fiber v9 maps the three.js API to JSX intrinsics (<mesh>, etc.)
// via module augmentation in its type entry. Importing the types here makes the
// augmentation global so any .tsx file can use three elements without importing
// from @react-three/fiber directly.
import type {} from '@react-three/fiber';
