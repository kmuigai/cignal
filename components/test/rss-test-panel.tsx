"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ExternalLink, Calendar, Building } from "lucide-react"

interface RSSItem {
  title: string
  description: string
  pubDate: string
  link: string
  companyMentions: string[]
}

interface RSSData {
  items: RSSItem[]
  fetchedAt: string
  totalItems: number
}

export function RSSTestPanel() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<RSSData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchRSSData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/fetch-releases")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch RSS data")
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const testSampleData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/test-rss")
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to test RSS parsing")
      }

      setData(result.sampleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-bricolage">RSS Feed Test Panel</CardTitle>
          <CardDescription>Test the PR Newswire RSS feed fetching and parsing functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchRSSData} disabled={loading} className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Fetch Live RSS Feed
            </Button>
            <Button onClick={testSampleData} disabled={loading} variant="outline" className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Test Sample Data
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800 mb-2">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Success</h3>
                <p className="text-green-700 text-sm">
                  Fetched {data.totalItems} items at {formatDate(data.fetchedAt)}
                </p>
              </div>

              <div className="space-y-3">
                {data.items.slice(0, 10).map((item, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="font-medium text-sm leading-tight">{item.title}</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                            <Calendar className="h-3 w-3" />
                            {formatDate(item.pubDate)}
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 line-clamp-2">{item.description}</p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.companyMentions.length > 0 && (
                              <>
                                <Building className="h-3 w-3 text-gray-400" />
                                <div className="flex gap-1">
                                  {item.companyMentions.map((company) => (
                                    <Badge key={company} variant="secondary" className="text-xs">
                                      {company}
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                          >
                            View Article
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {data.items.length > 10 && (
                <p className="text-sm text-gray-500 text-center">Showing first 10 of {data.totalItems} items</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
