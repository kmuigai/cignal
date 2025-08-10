"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus, Rss, AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RSSSourceForm } from "./rss-source-form"
import { RSSSourceItem } from "./rss-source-item"
import { useRSSSourcesByCompany } from "@/hooks/use-rss-sources"
import type { Company } from "@/lib/types"

interface RSSSourcesSectionProps {
  companies: Company[]
  selectedCompanyId: string | null
  onCompanySelect: (companyId: string) => void
}

export function RSSSourcesSection({ companies, selectedCompanyId, onCompanySelect }: RSSSourcesSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  
  const { 
    sources, 
    loading, 
    error, 
    addSource, 
    updateSource, 
    deleteSource, 
    testSource,
    testExistingSource,
    refreshSources 
  } = useRSSSourcesByCompany(selectedCompanyId || "")

  const selectedCompany = companies.find(c => c.id === selectedCompanyId)
  const enabledSources = sources.filter(s => s.enabled)
  const disabledSources = sources.filter(s => !s.enabled)

  const handleAddSource = async (sourceData: any) => {
    try {
      await addSource(sourceData)
      setShowAddForm(false)
    } catch (error) {
      console.error('Failed to add RSS source:', error)
      throw error // Let the form handle the error
    }
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <Rss className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Companies Added</h3>
        <p className="text-sm text-gray-500 mb-4">
          You need to add companies first before you can manage their RSS sources.
        </p>
        <p className="text-xs text-gray-400">
          Go to the Company Management section to add your first company.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4 flex items-center gap-2">
          <Rss className="h-4 w-4" />
          RSS Source Management
        </h3>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Configure custom RSS feeds for your companies to get more targeted news beyond our general feeds.
        </div>

        {/* Company Selector */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">Select Company</label>
          <Select value={selectedCompanyId || ""} onValueChange={onCompanySelect}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a company to manage RSS sources..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCompany && (
          <>
            <Separator className="my-4" />
            
            {/* Company Info Header */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">{selectedCompany.name}</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Managing RSS sources for this company
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {enabledSources.length} active
                  </Badge>
                  {disabledSources.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {disabledSources.length} inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* RSS Sources List */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading RSS sources...</p>
                </div>
              </div>
            ) : sources.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <WifiOff className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No RSS Sources</h4>
                <p className="text-sm text-gray-500 mb-4">
                  {selectedCompany.name} doesn't have any custom RSS sources yet.
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Add RSS feeds to get targeted news for this company beyond our general news feeds.
                </p>
                <Button onClick={() => setShowAddForm(true)} className="mx-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First RSS Source
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Enabled Sources */}
                {enabledSources.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h5 className="font-medium text-sm">Active Sources ({enabledSources.length})</h5>
                    </div>
                    <div className="space-y-2">
                      {enabledSources.map((source) => (
                        <RSSSourceItem
                          key={source.id}
                          source={source}
                          onUpdate={updateSource}
                          onDelete={deleteSource}
                          onTest={testExistingSource}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Disabled Sources */}
                {disabledSources.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 mt-6">
                      <WifiOff className="h-4 w-4 text-gray-400" />
                      <h5 className="font-medium text-sm text-gray-600">Inactive Sources ({disabledSources.length})</h5>
                    </div>
                    <div className="space-y-2">
                      {disabledSources.map((source) => (
                        <RSSSourceItem
                          key={source.id}
                          source={source}
                          onUpdate={updateSource}
                          onDelete={deleteSource}
                          onTest={testExistingSource}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Add New Source Button/Form */}
            {showAddForm ? (
              <div className="mt-6">
                <Separator className="mb-4" />
                <RSSSourceForm
                  onSubmit={handleAddSource}
                  onCancel={() => setShowAddForm(false)}
                  onTestUrl={testSource}
                />
              </div>
            ) : (
              sources.length > 0 && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add RSS Source
                  </Button>
                </div>
              )
            )}

            {/* Usage Information */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="h-4 w-4 text-blue-500" />
                <h5 className="font-medium text-sm">How RSS Sources Work</h5>
              </div>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <li>• RSS sources provide additional news feeds specific to your company</li>
                <li>• They work alongside our general news feeds to increase coverage</li>
                <li>• Sources are fetched automatically and integrated into your news feed</li>
                <li>• You can disable sources temporarily without deleting them</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}