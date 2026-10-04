import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div 
      className={`animate-pulse rounded-xl bg-slate-800/50 ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)',
        backgroundSize: '200% 100%',
      }}
    />
  );
};

export const BotCardSkeleton = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 min-h-[280px] space-y-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
    <Skeleton className="h-24 w-full" />
    <div className="grid grid-cols-3 gap-2">
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
      <Skeleton className="h-10" />
    </div>
    <div className="flex justify-between pt-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-6 w-24" />
    </div>
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-14" />
    </div>
  </div>
);

export const KPISkeleton = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
    <Skeleton className="h-8 w-32" />
    <Skeleton className="h-14 w-full" />
  </div>
);
