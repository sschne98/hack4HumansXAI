import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

export function OnlineStatus({ isOnline, className }: OnlineStatusProps) {
  return (
    <div 
      className={cn(
        "w-2 h-2 rounded-full border-2 border-white",
        isOnline ? "bg-green-500" : "bg-gray-400",
        className
      )}
    />
  );
}
