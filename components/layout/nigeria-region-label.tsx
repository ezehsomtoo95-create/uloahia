import Image from "next/image";
import { cn } from "@/lib/utils/cn";

type NigeriaRegionLabelProps = {
  className?: string;
  /** When true, renders the flag icon. */
  showFlag?: boolean;
  /** Push the flag to the far right (dropdown rows). */
  flagEnd?: boolean;
};

/** Nigeria label — optional flag icon (never emoji / "NG" letters). */
export function NigeriaRegionLabel({
  className,
  showFlag = true,
  flagEnd = false,
}: NigeriaRegionLabelProps) {
  return (
    <span
      className={cn(
        "region-label",
        flagEnd && "region-label--flag-end",
        className,
      )}
    >
      <span className="region-label-text">Nigeria</span>
      {showFlag ? (
        <Image
          src="/nigeria-flag.svg"
          alt=""
          width={18}
          height={12}
          className="nigeria-flag-icon"
          aria-hidden
          unoptimized
        />
      ) : null}
    </span>
  );
}
