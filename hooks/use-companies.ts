"use client"

import { useState, useEffect } from "react"
import { companyManager } from "@/lib/supabase/database"
import type { Company } from "@/lib/types"

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]) // Always start with empty array
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await companyManager.getCompanies()
      // Ensure we always set an array, never undefined
      setCompanies(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error loading companies:", err)
      setError(err instanceof Error ? err.message : "Failed to load companies")
      // Set empty array on error to prevent undefined
      setCompanies([])
    } finally {
      setLoading(false)
    }
  }

  const addCompany = async (company: Omit<Company, "id" | "userId" | "createdAt" | "updatedAt">) => {
    try {
      const newCompany = await companyManager.createCompany(company)
      setCompanies((prev) => [...(Array.isArray(prev) ? prev : []), newCompany])
      return newCompany
    } catch (err) {
      console.error("Error adding company:", err)
      setError(err instanceof Error ? err.message : "Failed to add company")
      throw err
    }
  }

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const updatedCompany = await companyManager.updateCompany(id, updates)
      setCompanies((prev) =>
        Array.isArray(prev) ? prev.map((c) => (c.id === id ? updatedCompany : c)) : [updatedCompany],
      )
      return updatedCompany
    } catch (err) {
      console.error("Error updating company:", err)
      setError(err instanceof Error ? err.message : "Failed to update company")
      throw err
    }
  }

  const deleteCompany = async (id: string) => {
    try {
      await companyManager.deleteCompany(id)
      setCompanies((prev) => (Array.isArray(prev) ? prev.filter((c) => c.id !== id) : []))
    } catch (err) {
      console.error("Error deleting company:", err)
      setError(err instanceof Error ? err.message : "Failed to delete company")
      throw err
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  return {
    companies, // Always an array, never undefined
    loading,
    error,
    addCompany,
    updateCompany,
    deleteCompany,
    refetch: loadCompanies,
  }
}
