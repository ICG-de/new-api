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
import { Activity, Database, Layers, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatsCard } from './stats-card'

interface ModelsStatsProps {
  totalModels: number
  activeModels: number
  totalVendors: number
  syncedModels: number
}

export function ModelsStats({
  totalModels,
  activeModels,
  totalVendors,
  syncedModels,
}: ModelsStatsProps) {
  const { t } = useTranslation()

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <StatsCard
        icon={<Database className='h-5 w-5' />}
        label={t('Total Models')}
        value={totalModels}
      />
      <StatsCard
        icon={<Activity className='h-5 w-5' />}
        label={t('Active Models')}
        value={activeModels}
      />
      <StatsCard
        icon={<Layers className='h-5 w-5' />}
        label={t('Vendors')}
        value={totalVendors}
      />
      <StatsCard
        icon={<Shield className='h-5 w-5' />}
        label={t('Synced Models')}
        value={syncedModels}
      />
    </div>
  )
}
