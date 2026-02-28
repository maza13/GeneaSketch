import { jsPDF } from "jspdf";

type RasterFormat = "png" | "jpg";

type PdfPaperSize = "LETTER" | "LEGAL" | "TABLOID" | "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "CUSTOM";
type PdfOrientation = "PORTRAIT" | "LANDSCAPE";

type PdfExportOptions = {
  paperSize: PdfPaperSize;
  orientation: PdfOrientation;
  margin: number;
  scale: number;
  customWidth: number;
  customHeight: number;
};

type RenderedSvg = {
  dataUrl: string;
  width: number;
  height: number;
};

function resolveSvgSize(svg: SVGSVGElement): { width: number; height: number } {
  const viewBox = svg.viewBox.baseVal;
  const rect = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(viewBox?.width || rect.width || 1200));
  const height = Math.max(1, Math.round(viewBox?.height || rect.height || 800));
  return { width, height };
}

function serializeSvg(svg: SVGSVGElement, background = "transparent"): RenderedSvg {
  const cloned = svg.cloneNode(true) as SVGSVGElement;
  const { width, height } = resolveSvgSize(svg);
  cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  cloned.setAttribute("width", String(width));
  cloned.setAttribute("height", String(height));
  if (!cloned.getAttribute("viewBox")) {
    cloned.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  if (background !== "transparent") {
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", background);
    cloned.insertBefore(bgRect, cloned.firstChild);
  }

  const raw = new XMLSerializer().serializeToString(cloned);
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
  return { dataUrl, width, height };
}

async function renderSvgToCanvas(svg: SVGSVGElement, background: string, scale = 2): Promise<HTMLCanvasElement> {
  const rendered = serializeSvg(svg, background);
  const img = new Image();
  img.decoding = "async";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("No se pudo rasterizar el SVG."));
    img.src = rendered.dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(rendered.width * scale));
  canvas.height = Math.max(1, Math.floor(rendered.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo inicializar canvas.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo generar el archivo."));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

export async function exportSvgAsRaster(
  svg: SVGSVGElement,
  format: RasterFormat,
  background: string,
  scale = 2
): Promise<Blob> {
  const canvas = await renderSvgToCanvas(svg, background, scale);
  if (format === "png") return canvasToBlob(canvas, "image/png");
  return canvasToBlob(canvas, "image/jpeg", 0.95);
}

export async function exportSvgAsPdf(svg: SVGSVGElement, background: string, options: PdfExportOptions): Promise<Blob> {
  const canvas = await renderSvgToCanvas(svg, background, Math.max(0.25, options.scale));
  const raster = canvas.toDataURL("image/png");

  const orientation = options.orientation === "LANDSCAPE" ? "l" : "p";
  const format = options.paperSize === "CUSTOM"
    ? [Math.max(100, options.customWidth), Math.max(100, options.customHeight)] as [number, number]
    : options.paperSize.toLowerCase();

  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = Math.max(0, options.margin);
  const drawWidth = Math.max(1, pageWidth - margin * 2);
  const drawHeight = Math.max(1, pageHeight - margin * 2);
  const aspect = canvas.width / canvas.height;

  let imgWidth = drawWidth;
  let imgHeight = imgWidth / aspect;
  if (imgHeight > drawHeight) {
    imgHeight = drawHeight;
    imgWidth = imgHeight * aspect;
  }

  const x = margin + (drawWidth - imgWidth) / 2;
  const y = margin + (drawHeight - imgHeight) / 2;
  pdf.addImage(raster, "PNG", x, y, imgWidth, imgHeight, undefined, "FAST");
  return pdf.output("blob");
}

