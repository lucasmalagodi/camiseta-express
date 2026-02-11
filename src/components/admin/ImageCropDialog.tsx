import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Move, ZoomIn } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedImageBlob: Blob) => void;
  aspectRatio?: number;
  title?: string;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageCropDialog = ({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
  aspectRatio = 16 / 9,
  title = "Cortar Imagem"
}: ImageCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (open && imageSrc) {
      const img = new Image();
      img.onload = () => {
        setImageSize({ width: img.width, height: img.height });
        setImageLoaded(true);
        
        // Calcular tamanho do crop baseado no aspect ratio
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth;
          const containerHeight = containerRef.current.clientHeight;
          
          let cropWidth = containerWidth * 0.8;
          let cropHeight = cropWidth / aspectRatio;
          
          if (cropHeight > containerHeight * 0.8) {
            cropHeight = containerHeight * 0.8;
            cropWidth = cropHeight * aspectRatio;
          }
          
          setCropSize({ width: cropWidth, height: cropHeight });
        }
      };
      img.src = imageSrc;
    }
  }, [open, imageSrc, aspectRatio]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragStart({ 
        x: e.clientX - rect.left - crop.x, 
        y: e.clientY - rect.top - crop.y 
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && containerRef.current && imageRef.current) {
      e.preventDefault();
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Calcular nova posição relativa ao container
      const newX = e.clientX - rect.left - dragStart.x;
      const newY = e.clientY - rect.top - dragStart.y;
      
      // Calcular limites baseado no tamanho da imagem escalada
      const scaledImageWidth = imageSize.width * zoom;
      const scaledImageHeight = imageSize.height * zoom;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // Limites: a imagem não pode sair completamente da área de crop
      const minX = -(scaledImageWidth / 2 - cropSize.width / 2);
      const maxX = scaledImageWidth / 2 - cropSize.width / 2;
      const minY = -(scaledImageHeight / 2 - cropSize.height / 2);
      const maxY = scaledImageHeight / 2 - cropSize.height / 2;
      
      setCrop({ 
        x: Math.max(minX, Math.min(maxX, newX)), 
        y: Math.max(minY, Math.min(maxY, newY)) 
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCropArea = (): Area => {
    if (!containerRef.current || !imageRef.current || !imageLoaded) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Área de crop está fixa no centro do container
    const cropX = (containerWidth - cropSize.width) / 2;
    const cropY = (containerHeight - cropSize.height) / 2;

    // Calcular escala da imagem
    const imageScale = zoom;
    const scaledImageWidth = imageSize.width * imageScale;
    const scaledImageHeight = imageSize.height * imageScale;

    // Posição da imagem no container (centralizada + offset do crop)
    const imageX = (containerWidth - scaledImageWidth) / 2 + crop.x;
    const imageY = (containerHeight - scaledImageHeight) / 2 + crop.y;

    // Converter coordenadas do container para coordenadas da imagem
    const relativeX = cropX - imageX;
    const relativeY = cropY - imageY;

    const imageCropX = (relativeX / scaledImageWidth) * imageSize.width;
    const imageCropY = (relativeY / scaledImageHeight) * imageSize.height;
    const imageCropWidth = (cropSize.width / scaledImageWidth) * imageSize.width;
    const imageCropHeight = (cropSize.height / scaledImageHeight) * imageSize.height;

    return {
      x: Math.max(0, Math.min(imageCropX, imageSize.width)),
      y: Math.max(0, Math.min(imageCropY, imageSize.height)),
      width: Math.min(imageCropWidth, imageSize.width - Math.max(0, imageCropX)),
      height: Math.min(imageCropHeight, imageSize.height - Math.max(0, imageCropY)),
    };
  };

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas is empty"));
          }
        },
        "image/jpeg",
        0.95
      );
    });
  };

  const handleSave = async () => {
    if (!imageLoaded) {
      return;
    }

    try {
      setIsProcessing(true);
      const cropArea = getCropArea();
      const croppedImage = await getCroppedImg(imageSrc, cropArea);
      onCropComplete(croppedImage);
      onOpenChange(false);
      // Resetar estado
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      console.error("Erro ao processar imagem:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Ajuste a posição e o zoom da imagem. Arraste para reposicionar e use o zoom para aproximar ou afastar.
          </DialogDescription>
        </DialogHeader>
        <div
          ref={containerRef}
          className="relative w-full h-[500px] bg-gray-900 rounded-lg overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {imageLoaded && (
            <>
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="absolute select-none"
                draggable={false}
                style={{
                  width: `${imageSize.width * zoom}px`,
                  height: `${imageSize.height * zoom}px`,
                  left: `50%`,
                  top: `50%`,
                  transform: `translate(calc(-50% + ${crop.x}px), calc(-50% + ${crop.y}px))`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  userSelect: 'none',
                }}
              />
              {/* Overlay com área de crop - FIXO no centro */}
              <div
                className="absolute border-2 border-white shadow-2xl pointer-events-none"
                style={{
                  width: `${cropSize.width}px`,
                  height: `${cropSize.height}px`,
                  left: `50%`,
                  top: `50%`,
                  transform: `translate(-50%, -50%)`,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
                }}
              />
              {/* Indicadores de canto - FIXOS no centro */}
              <div
                className="absolute border-2 border-white pointer-events-none"
                style={{
                  width: `${cropSize.width}px`,
                  height: `${cropSize.height}px`,
                  left: `50%`,
                  top: `50%`,
                  transform: `translate(-50%, -50%)`,
                }}
              >
                <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-white" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-r-2 border-t-2 border-white" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-l-2 border-b-2 border-white" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-white" />
              </div>
            </>
          )}
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Zoom
              </label>
              <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              className="w-full"
            />
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Move className="w-4 h-4" />
            Arraste a imagem para reposicionar dentro da área de corte
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || !imageLoaded}>
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Corte"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;
