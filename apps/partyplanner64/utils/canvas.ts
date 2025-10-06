import {
  setCreateCanvas,
  setCreateImage,
} from "../../../packages/lib/utils/canvas";

function createCanvasWeb(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createImageWeb(): HTMLImageElement {
  // eslint-disable-next-line no-restricted-globals
  return new Image();
}

/** Configures the application to use the regular web Canvas/Image implementation. */
export function setWebCanvasImplementation() {
  setCreateCanvas(createCanvasWeb);
  setCreateImage(createImageWeb);
}

export function getMouseCoordsOnCanvas(
  canvas: HTMLElement,
  clientX: number,
  clientY: number,
): [number, number] {
  const canvasRect = canvas.getBoundingClientRect();
  clientX = Math.round(clientX);
  clientY = Math.round(clientY);
  return [
    clientX - Math.round(canvasRect.left),
    clientY - Math.round(canvasRect.top),
  ];
}
