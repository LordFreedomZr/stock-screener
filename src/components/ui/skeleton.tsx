'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Skeleton = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-gray-800', className)}
      {...props}
    />
  );
};

export { Skeleton };
