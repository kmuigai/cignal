"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { CarouselApi } from "@/components/ui/carousel"
import type { PressRelease, Company } from "@/lib/types"

interface MobileCompanyCarouselProps {
  companies: string[]
  selectedCompany: string
  onCompanyChange: (company: string) => void
  releases?: PressRelease[]
  companiesData?: Company[]
  className?: string
}

export function MobileCompanyCarousel({
  companies,
  selectedCompany,
  onCompanyChange,
  releases = [],
  companiesData = [],
  className
}: MobileCompanyCarouselProps) {
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  // Get release count for each company
  const getCompanyReleaseCount = (companyName: string) => {
    if (companyName === "All") return releases.length
    
    // Find releases for this company
    const companyData = companiesData.find(c => c.name === companyName)
    if (!companyData) return 0
    
    return releases.filter(release => release.companyId === companyData.id).length
  }

  // Update carousel state when API changes
  useEffect(() => {
    if (!api) return

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    })
  }, [api])

  // Auto-scroll to selected company when it changes externally
  useEffect(() => {
    if (!api) return
    
    const selectedIndex = companies.findIndex(company => company === selectedCompany)
    if (selectedIndex !== -1 && selectedIndex !== api.selectedScrollSnap()) {
      api.scrollTo(selectedIndex)
    }
  }, [api, selectedCompany, companies])

  const handleCompanySelect = (company: string) => {
    onCompanyChange(company)
    
    // Scroll to selected company
    const selectedIndex = companies.findIndex(c => c === company)
    if (selectedIndex !== -1 && api) {
      api.scrollTo(selectedIndex)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Carousel
        setApi={setApi}
        className="w-full"
        opts={{
          align: "start",
          loop: false,
          skipSnaps: false,
          containScroll: "trimSnaps",
          slidesToScroll: 1,
        }}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {companies.map((company, index) => {
            const isSelected = selectedCompany === company
            const releaseCount = getCompanyReleaseCount(company)
            
            return (
              <CarouselItem key={company} className="pl-2 md:pl-4 basis-auto">
                <div className="p-1">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCompanySelect(company)}
                    className={cn(
                      "mobile-company-filter-card relative transition-all duration-200",
                      "h-auto min-w-fit px-4 py-3 flex flex-col items-center space-y-1",
                      "text-xs font-medium whitespace-nowrap",
                      "hover:scale-105 active:scale-95",
                      "touch-manipulation select-none",
                      "border-2", // Make border more visible on mobile
                      isSelected && "shadow-sm scale-105 border-primary",
                      !isSelected && "hover:bg-accent/50 border-border"
                    )}
                  >
                    <span className="font-medium text-center">{company}</span>
                    {releaseCount > 0 && (
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 h-auto min-h-0 font-medium",
                          isSelected 
                            ? "bg-primary-foreground/20 text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {releaseCount}
                      </Badge>
                    )}
                  </Button>
                </div>
              </CarouselItem>
            )
          })}
        </CarouselContent>
        
        {/* Navigation arrows with better mobile styling */}
        {canScrollPrev && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute left-1 top-1/2 -translate-y-1/2 z-20",
              "h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm",
              "shadow-lg border border-border/50",
              "hover:bg-background hover:shadow-xl hover:scale-110",
              "transition-all duration-200",
              "touch-manipulation"
            )}
            onClick={() => api?.scrollPrev()}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous companies</span>
          </Button>
        )}
        
        {canScrollNext && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 z-20",
              "h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm", 
              "shadow-lg border border-border/50",
              "hover:bg-background hover:shadow-xl hover:scale-110",
              "transition-all duration-200",
              "touch-manipulation"
            )}
            onClick={() => api?.scrollNext()}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next companies</span>
          </Button>
        )}
      </Carousel>

      {/* Progress dots with improved styling */}
      {count > 4 && (
        <div className="flex justify-center space-x-1.5 mt-4">
          {Array.from({ length: Math.ceil(count / 3) }).map((_, index) => {
            const isActive = Math.floor((current - 1) / 3) === index
            return (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300 touch-manipulation",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isActive 
                    ? "bg-primary scale-125 shadow-sm" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50 hover:scale-110"
                )}
                onClick={() => api?.scrollTo(index * 3)}
                aria-label={`Go to company group ${index + 1}`}
              />
            )
          })}
        </div>
      )}
    </div>
  )
} 