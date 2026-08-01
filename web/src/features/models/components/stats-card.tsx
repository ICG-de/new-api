/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { ReactNode } from 'react'

import { useCurrentTheme } from '@/hooks/use-current-theme'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  icon: ReactNode
  label: string
  value: string | number
  action?: ReactNode
  className?: string
}

export function StatsCard({
  icon,
  label,
  value,
  action,
  className,
}: StatsCardProps) {
  const { isCyberTech } = useCurrentTheme()

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-6 transition-all',
        isCyberTech
          ? 'glass-card border-primary/30 hover:border-primary/50'
          : 'border-border/40 hover:border-border/60',
        className
      )}
    >
      <div className='flex flex-col gap-3'>
        <div className='flex items-center justify-between'>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isCyberTech
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-foreground'
            )}
          >
            {icon}
          </div>
          {action && <div className='flex-shrink-0'>{action}</div>}
        </div>

        <div className='flex flex-col gap-1'>
          <span
            className={cn(
              'text-sm',
              isCyberTech ? 'text-primary/80' : 'text-muted-foreground'
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              'text-3xl font-bold tracking-tight',
              isCyberTech && 'text-primary-emphasis'
            )}
          >
            {value}
          </span>
        </div>
      </div>
    </div>
  )
}
