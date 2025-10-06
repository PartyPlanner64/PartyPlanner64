import { HTMLCanvasElement, HTMLImageElement, Image } from "canvas-api-lite";

export function createCanvasNode(
  width: number,
  height: number,
): HTMLCanvasElement {
  return new HTMLCanvasElement(width, height);
}

export function createImageNode(): HTMLImageElement {
  return new Image();
}

declare global {
  type CanvasRenderingContext2D =
    import("canvas-api-lite").CanvasRenderingContext2D;
  type HTMLCanvasElement = import("canvas-api-lite").HTMLCanvasElement;
  type HTMLImageElement = import("canvas-api-lite").HTMLImageElement;
  type Image = typeof import("canvas-api-lite").Image;
  type ImageData = import("canvas-api-lite").ImageData;
  type ImageDataArray = Uint8ClampedArray<ArrayBufferLike>;
}
