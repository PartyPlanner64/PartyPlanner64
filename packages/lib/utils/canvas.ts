interface CreateCanvas {
  (width: number, height: number): HTMLCanvasElement;
}

let _createCanvas: CreateCanvas;

export function setCreateCanvas(createCanvasImpl: CreateCanvas): void {
  _createCanvas = createCanvasImpl;
}

export function createContext(
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const canvas = _createCanvas(width, height);
  return canvas.getContext("2d")!;
}

interface CreateImage {
  (): HTMLImageElement;
}

let _createImage: CreateImage;

export function setCreateImage(createImageImpl: CreateImage): void {
  _createImage = createImageImpl;
}

export function createImage(): HTMLImageElement {
  return _createImage();
}
