'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'

interface TestResult {
  success: boolean
  timeToFirstToken?: number
  totalResponseTime?: number
  error?: string
  response?: string
}

export default function TestDocumentChatPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [customMessage, setCustomMessage] = useState('')
  const [customDocumentId, setCustomDocumentId] = useState('')

  const runTest = async (message: string, documentId: string, testName: string) => {
    const startTime = Date.now()
    
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/chat/document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          documentId,
          conversationId: `test-${Date.now()}`,
          messageHistory: []
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setTestResults(prev => [...prev, {
          success: false,
          error: `${testName}: ${errorData.error || response.statusText}`,
          totalResponseTime: Date.now() - startTime
        }])
        return
      }

      // Test streaming
      let timeToFirstToken: number | undefined
      let fullResponse = ''
      
      if (response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value, { stream: true })
            if (!timeToFirstToken && chunk.length > 0) {
              timeToFirstToken = Date.now() - startTime
            }
            fullResponse += chunk
          }
        } finally {
          reader.releaseLock()
        }
      }

      setTestResults(prev => [...prev, {
        success: true,
        timeToFirstToken,
        totalResponseTime: Date.now() - startTime,
        response: fullResponse,
        error: `${testName}: Success`
      }])

    } catch (error) {
      setTestResults(prev => [...prev, {
        success: false,
        error: `${testName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        totalResponseTime: Date.now() - startTime
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const testScenarios = [
    {
      name: "General Question",
      message: "What is this document about?",
      documentId: "doc-1"
    },
    {
      name: "Specific Question", 
      message: "Explain the methodology used in section 3",
      documentId: "doc-1"
    },
    {
      name: "Empty Message (Should Fail)",
      message: "",
      documentId: "doc-1"
    },
    {
      name: "Long Message (Should Fail)",
      message: "A".repeat(2001),
      documentId: "doc-1"
    },
    {
      name: "Invalid Document (Should Fail)",
      message: "What is this about?",
      documentId: "invalid-doc-id"
    }
  ]

  const runAllTests = async () => {
    setTestResults([])
    for (const scenario of testScenarios) {
      await runTest(scenario.message, scenario.documentId, scenario.name)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const runCustomTest = async () => {
    if (!customMessage.trim() || !customDocumentId.trim()) {
      alert('Please enter both message and document ID')
      return
    }
    
    await runTest(customMessage, customDocumentId, 'Custom Test')
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Document Chat API Test Suite
          </h1>
          <p className="text-muted-foreground">
            Test the streaming document chat endpoint with various scenarios.
            Measures performance, validates streaming, and tests error handling.
          </p>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Predefined Tests */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h3 className="text-xl font-semibold mb-4">Predefined Test Scenarios</h3>
            <div className="space-y-3">
              {testScenarios.map((scenario, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {scenario.message.length > 50 
                        ? `${scenario.message.substring(0, 50)}...` 
                        : scenario.message || '[Empty message]'
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => runTest(scenario.message, scenario.documentId, scenario.name)}
                    disabled={isLoading}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 text-sm"
                  >
                    Test
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={runAllTests}
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {isLoading ? 'Running Tests...' : 'Run All Tests'}
              </button>
              <button
                onClick={clearResults}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Custom Test */}
          <div className="bg-background rounded-xl border border-border p-6">
            <h3 className="text-xl font-semibold mb-4">Custom Test</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document ID</label>
                <input
                  type="text"
                  value={customDocumentId}
                  onChange={(e) => setCustomDocumentId(e.target.value)}
                  placeholder="doc-1"
                  className="w-full p-3 border border-border rounded-lg bg-background"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="What is this document about?"
                  rows={4}
                  className="w-full p-3 border border-border rounded-lg bg-background resize-none"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {customMessage.length}/2000 characters
                </div>
              </div>
              
              <button
                onClick={runCustomTest}
                disabled={isLoading || !customMessage.trim() || !customDocumentId.trim()}
                className="w-full bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 disabled:opacity-50"
              >
                Run Custom Test
              </button>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-background rounded-xl border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-xl font-semibold">Test Results</h3>
              <p className="text-muted-foreground text-sm">
                Performance requirement: First token within 200ms
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20' 
                      : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        result.success ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">{result.error}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total: {result.totalResponseTime}ms
                    </div>
                  </div>
                  
                  {result.success && (
                    <div className="text-sm space-y-1 mb-3">
                      {result.timeToFirstToken && (
                        <div className={`${
                          result.timeToFirstToken <= 200 ? 'text-green-600' : 'text-orange-600'
                        }`}>
                          Time to first token: {result.timeToFirstToken}ms 
                          {result.timeToFirstToken <= 200 ? ' ✅' : ' ⚠️ (>200ms)'}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {result.response && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        View Response ({result.response.length} chars)
                      </summary>
                      <div className="mt-2 p-3 bg-muted/50 rounded text-sm font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {result.response.substring(0, 500)}
                        {result.response.length > 500 && '... (truncated)'}
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Documentation */}
        <div className="mt-8 bg-muted/20 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-4">API Endpoint Documentation</h3>
          <div className="space-y-3 text-sm">
            <div><strong>Endpoint:</strong> <code className="bg-muted px-2 py-1 rounded">POST /api/chat/document</code></div>
            <div><strong>Runtime:</strong> Edge (for fastest response)</div>
            <div><strong>Timeout:</strong> 30 seconds</div>
            <div><strong>Model:</strong> Gemini Flash-Lite (optimized for speed)</div>
            <div><strong>Cache TTL:</strong> 5 minutes for document context</div>
            <div><strong>Performance Target:</strong> First token within 200ms</div>
          </div>
          
          <details className="mt-4">
            <summary className="cursor-pointer font-medium">Request/Response Schema</summary>
            <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
{`Request Body:
{
  "message": string (required, max 2000 chars),
  "documentId": string (required),
  "conversationId": string (optional),
  "messageHistory": Array<{role: "user"|"assistant", content: string}> (optional)
}

Response: Streaming text/plain with chunks
Headers: Content-Type: text/plain; charset=utf-8

Error Responses:
400 - Invalid input (empty message, too long, etc.)
404 - Document not found  
429 - Rate limit exceeded
500 - AI generation error`}
            </pre>
          </details>
        </div>
      </div>
    </DashboardLayout>
  )
}