"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Pencil, Trash2, Plus } from "lucide-react"
import type { Company } from "@/lib/types"
import { useCompanies } from "@/hooks/use-companies"
import { AIConfigurationSection } from "./ai-configuration-section"

interface CompanyManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAPIKeyChange?: (hasKey: boolean) => void
  onCompaniesChange?: () => void
}

export function CompanyManagementModal({ open, onOpenChange, onAPIKeyChange, onCompaniesChange }: CompanyManagementModalProps) {
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanies()
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

      if (addingNew) {
        await addCompany({
          name: editForm.name.trim(),
          variations,
          website: "",
          industry: "",
        })
      } else if (editingId) {
        await updateCompany(editingId, {
          name: editForm.name.trim(),
          variations,
        })
      }

      setEditingId(null)
      setAddingNew(false)
      setEditForm({ name: "", variations: "" })
      
      // Notify parent that companies changed
      onCompaniesChange?.()
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
      // Notify parent that companies changed
      onCompaniesChange?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-bricolage font-semibold">Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400 p-2 rounded">{error}</div>
          )}

          {/* AI Configuration Section */}
          <div>
            <AIConfigurationSection onAPIKeyChange={onAPIKeyChange} />
          </div>

          <Separator />

          {/* Company Management Section */}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
