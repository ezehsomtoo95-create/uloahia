import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type PreviewImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
};

/** Local blob/object URL previews during sell flow uploads. */
export function PreviewImage({
  src,
  alt,
  className,
  sizes = "400px",
}: PreviewImageProps) {
  if (!src || src.trim() === "") {
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={cn("object-cover object-center", className)}
    />
  );
}
