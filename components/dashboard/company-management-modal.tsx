"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, Trash2, Plus, Building2, Rss, Bot } from "lucide-react"
import type { Company } from "@/lib/types"
import { AIConfigurationSection } from "./ai-configuration-section"
import { RSSSourcesSection } from "./rss-sources-section"

interface CompanyManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAPIKeyChange?: (hasKey: boolean) => void
  onCompaniesChange?: (newCompanies?: Company[], addedCompanyName?: string) => void
  companies: Company[]
  addCompany: (company: Omit<Company, "id" | "userId" | "createdAt" | "updatedAt">) => Promise<Company>
  updateCompany: (id: string, updates: Partial<Company>) => Promise<Company>
  deleteCompany: (id: string) => Promise<void>
}

export function CompanyManagementModal({ 
  open, 
  onOpenChange, 
  onAPIKeyChange, 
  onCompaniesChange,
  companies,
  addCompany,
  updateCompany,
  deleteCompany 
}: CompanyManagementModalProps) {
  const [activeTab, setActiveTab] = useState("ai")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    companies.length > 0 ? companies[0].id : null
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", variations: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const handleEdit = (company: Company) => {
    setEditingId(company.id)
    setEditForm({
      name: company.name,
      variations: company.variations.join(", "),
    })
    setAddingNew(false)
    setError("")
  }

  const handleAddNew = () => {
    setAddingNew(true)
    setEditingId(null)
    setEditForm({ name: "", variations: "" })
    setError("")
  }

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      setError("Company name is required")
      return
    }

    setSaving(true)
    setError("")

    try {
      const variations = editForm.variations
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)

      let updatedCompanies: Company[] = [...companies]
      let addedCompanyName: string | undefined = undefined
      
      if (addingNew) {
        const companyName = editForm.name.trim()
        const newCompany = await addCompany({
          name: companyName,
          variations,
          website: "",
          industry: "",
        })
        updatedCompanies = [...companies, newCompany]
        addedCompanyName = companyName
      } else if (editingId) {
        const updated = await updateCompany(editingId, {
          name: editForm.name.trim(),
          variations,
        })
        updatedCompanies = companies.map(c => c.id === editingId ? updated : c)
      }

      setEditingId(null)
      setAddingNew(false)
      setEditForm({ name: "", variations: "" })
      
      // Update selected company if needed
      if (addedCompanyName && !selectedCompanyId) {
        const newCompany = updatedCompanies.find(c => c.name === addedCompanyName)
        if (newCompany) {
          setSelectedCompanyId(newCompany.id)
        }
      }
      
      // Notify parent with updated companies for optimistic updates
      onCompaniesChange?.(updatedCompanies, addedCompanyName)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setAddingNew(false)
    setEditForm({ name: "", variations: "" })
    setError("")
  }

  const handleDelete = async (companyId: string) => {
    try {
      await deleteCompany(companyId)
      // Notify parent with updated companies list
      const updatedCompanies = companies.filter(c => c.id !== companyId)
      onCompaniesChange?.(updatedCompanies)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bricolage font-semibold">Settings</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-2 rounded">{error}</div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Settings
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Companies
            </TabsTrigger>
            <TabsTrigger value="rss" className="flex items-center gap-2">
              <Rss className="h-4 w-4" />
              RSS Sources
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="ai" className="space-y-6">
              <AIConfigurationSection onAPIKeyChange={onAPIKeyChange} />
            </TabsContent>

            <TabsContent value="companies" className="space-y-6">
              <div>
                <h3 className="font-medium mb-4">Company Management</h3>

            {/* Existing Companies */}
            <div className="space-y-3">
              {companies.map((company) => (
                <div key={company.id} className="border rounded-lg p-4">
                  {editingId === company.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Company Name</Label>
                        <Input
                          id="edit-name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Company name"
                          disabled={saving}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-variations">Search variations</Label>
                        <Textarea
                          id="edit-variations"
                          value={editForm.variations}
                          onChange={(e) => setEditForm({ ...editForm, variations: e.target.value })}
                          placeholder="Add variations separated by commas"
                          className="min-h-[80px]"
                          disabled={saving}
                        />
                        <p className="text-xs text-gray-500 mt-1">Add variations separated by commas</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={saving}>
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{company.name}</h3>
                        <p className="text-sm text-gray-500">
                          {company.variations.length} search term{company.variations.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(company)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(company.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Company */}
            {addingNew ? (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 mt-3">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-name">Company Name</Label>
                    <Input
                      id="new-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Company name"
                      required
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-variations">Search variations</Label>
                    <Textarea
                      id="new-variations"
                      value={editForm.variations}
                      onChange={(e) => setEditForm({ ...editForm, variations: e.target.value })}
                      placeholder="Optional: Add name variations, stock tickers, or abbreviations separated by commas (e.g., Blackstone Inc., Blackstone Group, BX)"
                      className="min-h-[80px]"
                      disabled={saving}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={handleAddNew} className="w-full mt-3">
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            )}
              </div>
            </TabsContent>

            <TabsContent value="rss" className="space-y-6">
              <RSSSourcesSection 
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onCompanySelect={setSelectedCompanyId}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
