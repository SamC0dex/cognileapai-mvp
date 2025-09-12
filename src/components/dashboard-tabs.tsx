'use client'

import * as React from 'react'
import { useState } from 'react'
import { 
  FileText, 
  BookOpen, 
  GraduationCap, 
  Lightbulb,
  Search,
  Filter,
  Plus,
  Grid3x3,
  List
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  Tabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  Button,
  Input
} from '@/components/ui'

interface DashboardTabsProps {
  onViewModeChange?: (mode: 'grid' | 'list') => void
  onSearch?: (query: string) => void
  onUpload?: () => void
}

export function DashboardTabs({ 
  onViewModeChange, 
  onSearch,
  onUpload 
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const tabs = [
    {
      id: 'all',
      label: 'All',
      icon: FileText,
      count: 0
    },
    {
      id: 'lessons',
      label: 'Lessons', 
      icon: BookOpen,
      count: 0
    },
    {
      id: 'courses',
      label: 'Courses',
      icon: GraduationCap,
      count: 0
    },
    {
      id: 'solutions',
      label: 'Solutions',
      icon: Lightbulb,
      count: 0
    }
  ]

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch?.(value)
  }

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }

  return (
    <div className="px-8 py-6 border-b border-border">
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid grid-cols-4 w-auto bg-muted/50 p-1 h-12">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md transition-all dark:data-[state=active]:bg-gradient-to-r dark:data-[state=active]:from-teal-600 dark:data-[state=active]:to-teal-700"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="text-xs bg-background/20 px-1.5 py-0.5 rounded">
                        {tab.count}
                      </span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-80 pl-9 bg-background/50 border-border"
                />
              </div>

              {/* Filter */}
              <Button variant="outline" size="icon" className="h-10 w-10 dark:border-teal-600/40 dark:text-teal-300 dark:hover:bg-teal-600/10 dark:hover:text-teal-200 dark:hover:border-teal-500/60">
                <Filter className="h-4 w-4" />
              </Button>

              {/* View Mode Toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewModeChange('grid')}
                  className={cn(
                    "h-10 w-10 rounded-none",
                    viewMode === 'grid' ? 'bg-primary text-primary-foreground dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700' : 'hover:bg-muted'
                  )}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewModeChange('list')}
                  className={cn(
                    "h-10 w-10 rounded-none",
                    viewMode === 'list' ? 'bg-primary text-primary-foreground dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700' : 'hover:bg-muted'
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Upload Button */}
              <Button 
                onClick={onUpload}
                className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 penseum-button-primary dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload PDF
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-0">
              <div className="min-h-[400px] rounded-xl border border-border/50 bg-card/50 p-6">
                {/* Empty State */}
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6">
                    <tab.icon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No {tab.label.toLowerCase()} yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    {tab.id === 'all' && "Upload your first document to get started with AI-powered learning"}
                    {tab.id === 'lessons' && "Create your first lesson or upload a document to begin"}
                    {tab.id === 'courses' && "Start planning your first course to organize your learning"}
                    {tab.id === 'solutions' && "Upload documents to generate intelligent solutions"}
                  </p>
                  <Button 
                    onClick={onUpload}
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800"
                  >
                    <Plus className="h-4 w-4" />
                    Get Started
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
