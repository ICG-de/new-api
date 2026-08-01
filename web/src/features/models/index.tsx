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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentTheme } from '@/hooks/use-current-theme'
import { cn } from '@/lib/utils'

import { getModels, getVendors, listDeployments } from './api'
import { DeploymentAccessGuard } from './components/deployment-access-guard'
import { DeploymentsTable } from './components/deployments-table'
import { CreateDeploymentDrawer } from './components/dialogs/create-deployment-drawer'
import { ModelsDialogs } from './components/models-dialogs'
import { ModelsPrimaryButtons } from './components/models-primary-buttons'
import { ModelsProvider, useModels } from './components/models-provider'
import { ModelsStats } from './components/models-stats'
import { ModelsTable } from './components/models-table'
import { useModelDeploymentSettings } from './hooks/use-model-deployment-settings'
import { deploymentsQueryKeys, modelsQueryKeys, vendorsQueryKeys } from './lib'
import {
  type ModelsSectionId,
  MODELS_DEFAULT_SECTION,
  MODELS_SECTION_IDS,
} from './section-registry'

const route = getRouteApi('/_authenticated/models/$section')

const SECTION_META: Record<ModelsSectionId, { titleKey: string }> = {
  metadata: {
    titleKey: 'Metadata',
  },
  deployments: {
    titleKey: 'Deployments',
  },
}

function ModelsContent() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tabCategory, setTabCategory } = useModels()
  const { isCyberTech } = useCurrentTheme()
  const params = route.useParams()
  const activeSection = (params.section ??
    MODELS_DEFAULT_SECTION) as ModelsSectionId

  // Deployment create dialog state
  const [createDeploymentOpen, setCreateDeploymentOpen] = useState(false)

  // Fetch stats data for metadata section
  const { data: modelsData } = useQuery({
    queryKey: modelsQueryKeys.list({ p: 1, page_size: 1 }),
    queryFn: () => getModels({ p: 1, page_size: 1 }),
    enabled: activeSection === 'metadata',
  })

  const { data: vendorsData } = useQuery({
    queryKey: vendorsQueryKeys.list(),
    queryFn: () => getVendors({ page_size: 1000 }),
    enabled: activeSection === 'metadata',
  })

  const statsData = useMemo(() => {
    const items = modelsData?.data?.items || []
    const total = modelsData?.data?.total || 0
    const activeCount = items.filter((m) => m.status === 1).length
    const syncedCount = items.filter((m) => m.sync_official === 1).length
    const vendorsCount = vendorsData?.data?.items?.length || 0

    return {
      totalModels: total,
      activeModels: activeCount,
      totalVendors: vendorsCount,
      syncedModels: syncedCount,
    }
  }, [modelsData, vendorsData])

  // keep context state in sync (for components that rely on it)
  useEffect(() => {
    if (tabCategory !== activeSection) {
      setTabCategory(activeSection)
    }
  }, [activeSection, setTabCategory, tabCategory])

  const handleSectionChange = useCallback(
    (section: string) => {
      void navigate({
        to: '/models/$section',
        params: { section: section as ModelsSectionId },
      })
    },
    [navigate]
  )

  const meta = SECTION_META[activeSection] ?? SECTION_META.metadata

  return (
    <>
      <SectionPageLayout fixedContent>
        <SectionPageLayout.Title>{t(meta.titleKey)}</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          {activeSection === 'metadata' ? (
            <ModelsPrimaryButtons />
          ) : (
            <Button onClick={() => setCreateDeploymentOpen(true)} size='sm'>
              <Plus className='h-4 w-4' />
              {t('Create deployment')}
            </Button>
          )}
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div className='flex h-full min-h-0 flex-col gap-6'>
            {/* Stats Cards - Only show for metadata section */}
            {activeSection === 'metadata' && (
              <div
                className={cn(
                  'transition-all',
                  isCyberTech && 'animate-in fade-in-50 duration-500'
                )}
              >
                <ModelsStats
                  totalModels={statsData.totalModels}
                  activeModels={statsData.activeModels}
                  totalVendors={statsData.totalVendors}
                  syncedModels={statsData.syncedModels}
                />
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeSection} onValueChange={handleSectionChange}>
              <TabsList
                className={cn(
                  'max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto',
                  isCyberTech && 'glass-card border-primary/20'
                )}
              >
                {MODELS_SECTION_IDS.map((section) => (
                  <TabsTrigger
                    key={section}
                    value={section}
                    className={cn(
                      isCyberTech &&
                        'data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
                    )}
                  >
                    {t(SECTION_META[section].titleKey)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Main Content */}
            <div className='min-h-0 flex-1'>
              {activeSection === 'metadata' ? (
                <ModelsTable />
              ) : (
                <DeploymentsSection />
              )}
            </div>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <ModelsDialogs />
      <CreateDeploymentDrawer
        open={createDeploymentOpen}
        onOpenChange={setCreateDeploymentOpen}
      />
    </>
  )
}

function DeploymentsSection() {
  const queryClient = useQueryClient()
  const {
    loading: deploymentLoading,
    loadingPhase,
    isIoNetEnabled,
    connectionLoading,
    connectionOk,
    connectionError,
    testConnection,
  } = useModelDeploymentSettings()

  // Prefetch deployments list while connection check is in progress.
  useEffect(() => {
    if (isIoNetEnabled && loadingPhase === 'connection') {
      const defaultParams = { p: 1, page_size: 10 }
      queryClient.prefetchQuery({
        queryKey: deploymentsQueryKeys.list(defaultParams),
        queryFn: () => listDeployments(defaultParams),
        staleTime: 30 * 1000,
      })
    }
  }, [isIoNetEnabled, loadingPhase, queryClient])

  return (
    <DeploymentAccessGuard
      loading={deploymentLoading}
      loadingPhase={loadingPhase}
      isEnabled={isIoNetEnabled}
      connectionLoading={connectionLoading}
      connectionOk={connectionOk}
      connectionError={connectionError}
      onRetry={testConnection}
    >
      <DeploymentsTable />
    </DeploymentAccessGuard>
  )
}

export function Models() {
  return (
    <ModelsProvider>
      <ModelsContent />
    </ModelsProvider>
  )
}
