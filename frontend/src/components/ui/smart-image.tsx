import { useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  alt: string;
  fallbackClassName?: string;
  /** Aspect ratio utility, e.g. "aspect-[16/9]". */
  ratioClassName?: string;
}

/**
 * Image with a graceful fallback. Used for all remote course/instructor
 * photography so a broken URL never leaves an empty box.
 */
export function SmartImage({ src, alt, className, fallbackClassName, ratioClassName, ...props }: SmartImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-primary-50 to-neutral-100 text-primary-300",
          ratioClassName,
          fallbackClassName,
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="h-8 w-8" aria-hidden />
      </div>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden", ratioClassName)}>
      {!loaded && <span className="absolute inset-0 skeleton rounded-none" aria-hidden />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0", className)}
        {...props}
      />
    </span>
  );
}
