"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

interface AgencyLogoProps {
  src?: string | null;
  compact?: boolean;
}

export function AgencyLogo({ src, compact = false }: AgencyLogoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ src: "", ratio: 1 });
  const hasLogo = Boolean(src && src !== failedSrc);
  const ratio = dimensions.src === src ? dimensions.ratio : 1;
  const width = compact ? 40 : Math.min(80, Math.max(40, 32 * ratio + 8));

  return (
    <div
      className={`flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm transition-transform duration-200 motion-safe:group-hover:scale-105 ${
        hasLogo ? "border border-white/15 bg-white p-1" : "bg-blue-600 text-white shadow-blue-500/20"
      }`}
      style={{ width: hasLogo ? width : 40 }}
    >
      {hasLogo && src ? (
        // Uploaded logos can come from the configured API host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Agency logo"
          className="block h-full w-full object-contain"
          onLoad={(event) => {
            const image = event.currentTarget;
            setDimensions({ src, ratio: image.naturalWidth / (image.naturalHeight || 1) });
          }}
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <Shield className="h-5 w-5 fill-white/20 stroke-[2.2]" aria-hidden="true" />
      )}
    </div>
  );
}
