declare module '@napi-rs/canvas' {
  export interface Image {
    width: number;
    height: number;
  }

  export type CanvasTextAlign = 'left' | 'right' | 'center' | 'start' | 'end';
  export type CanvasTextBaseline =
    | 'top'
    | 'hanging'
    | 'middle'
    | 'alphabetic'
    | 'ideographic'
    | 'bottom';

  export interface CanvasRenderingContext2D {
    fillStyle: any;
    strokeStyle: any;
    lineWidth: number;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    fillRect(x: number, y: number, w: number, h: number): void;
    drawImage(image: Image, x: number, y: number, w?: number, h?: number): void;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    measureText(text: string): { width: number };
    beginPath(): void;
    arc(x: number, y: number, r: number, sAngle: number, eAngle: number): void;
    fill(): void;
    stroke(): void;
  }

  export interface Canvas {
    getContext(type: '2d'): CanvasRenderingContext2D;
    toBuffer(type?: string): Buffer;
  }

  export function createCanvas(width: number, height: number): Canvas;
  export function loadImage(
    input: string | Buffer | ArrayBuffer,
  ): Promise<Image>;
}
