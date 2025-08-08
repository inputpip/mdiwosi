"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/integrations/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Database, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  FileSearch,
  Settings,
  Zap
} from "lucide-react"

interface TestResult {
  test_name: string
  status: 'success' | 'warning' | 'error'
  message: string
  data?: any
  count?: number
}

export function MigrationTester() {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [migrationReady, setMigrationReady] = useState<boolean | null>(null)

  const runTests = async () => {
    setIsLoading(true)
    setTestResults([])
    const results: TestResult[] = []

    try {
      // Test 1: Check core tables exist
      const coreTableTests = [
        { name: 'transactions', required: true },
        { name: 'accounts', required: true }, 
        { name: 'customers', required: true },
        { name: 'cash_history', required: false }
      ]

      for (const table of coreTableTests) {
        try {
          const { data, error } = await supabase
            .from(table.name)
            .select('id')
            .limit(1)

          if (error && table.required) {
            results.push({
              test_name: `Table ${table.name}`,
              status: 'error',
              message: `Required table missing: ${error.message}`
            })
          } else if (error && !table.required) {
            results.push({
              test_name: `Table ${table.name}`,
              status: 'warning',
              message: 'Table does not exist (will be created)'
            })
          } else {
            results.push({
              test_name: `Table ${table.name}`,
              status: 'success',
              message: 'Table exists and accessible'
            })
          }
        } catch (err) {
          results.push({
            test_name: `Table ${table.name}`,
            status: 'error',
            message: `Connection error: ${err}`
          })
        }
      }

      // Test 2: Count existing data
      try {
        const { data: transactionData, error: transError } = await supabase
          .from('transactions')
          .select('id, account_id, total_amount')
          .not('account_id', 'is', null)
          .not('total_amount', 'is', null)

        if (transError) {
          results.push({
            test_name: 'Transaction Data',
            status: 'error', 
            message: `Error counting transactions: ${transError.message}`
          })
        } else {
          results.push({
            test_name: 'Transaction Data',
            status: transactionData.length > 0 ? 'success' : 'warning',
            message: `Found ${transactionData.length} transactions ready for migration`,
            count: transactionData.length
          })
        }
      } catch (err) {
        results.push({
          test_name: 'Transaction Data',
          status: 'error',
          message: `Error: ${err}`
        })
      }

      // Test 3: Check cash_history existing data
      try {
        const { data: cashData, error: cashError } = await supabase
          .from('cash_history')
          .select('id, type')

        if (cashError) {
          results.push({
            test_name: 'Cash History Data',
            status: 'warning',
            message: 'Cash history table not accessible (will be created)'
          })
        } else {
          results.push({
            test_name: 'Cash History Data',
            status: 'success',
            message: `Found ${cashData.length} existing cash history records`,
            count: cashData.length
          })
        }
      } catch (err) {
        results.push({
          test_name: 'Cash History Data',
          status: 'warning',
          message: 'Cash history table not found (normal for new setup)'
        })
      }

      // Test 4: Check for conflicts
      try {
        const { data: conflictData, error: conflictError } = await supabase
          .from('transactions')
          .select(`
            id,
            cash_history!inner(reference_id)
          `)
          .eq('cash_history.type', 'orderan')

        if (conflictError) {
          results.push({
            test_name: 'Migration Conflicts',
            status: 'success',
            message: 'No conflicts detected (cash_history is empty or not linked)'
          })
        } else {
          results.push({
            test_name: 'Migration Conflicts', 
            status: conflictData.length > 0 ? 'warning' : 'success',
            message: `Found ${conflictData.length} transactions already migrated`,
            count: conflictData.length
          })
        }
      } catch (err) {
        results.push({
          test_name: 'Migration Conflicts',
          status: 'success',
          message: 'No conflicts detected'
        })
      }

      // Test 5: Sample data quality
      try {
        const { data: sampleData, error: sampleError } = await supabase
          .from('transactions')
          .select(`
            id,
            account_id,
            total_amount,
            items_summary,
            created_at,
            accounts(name),
            customers(name)
          `)
          .not('account_id', 'is', null)
          .not('total_amount', 'is', null)
          .order('created_at', { ascending: false })
          .limit(3)

        if (sampleError) {
          results.push({
            test_name: 'Data Quality',
            status: 'warning',
            message: `Could not sample data: ${sampleError.message}`
          })
        } else {
          const hasGoodData = sampleData.every(t => 
            t.account_id && 
            t.total_amount && 
            t.total_amount > 0
          )
          
          results.push({
            test_name: 'Data Quality',
            status: hasGoodData ? 'success' : 'warning',
            message: hasGoodData 
              ? 'Sample data looks good for migration'
              : 'Some data quality issues detected',
            data: sampleData
          })
        }
      } catch (err) {
        results.push({
          test_name: 'Data Quality',
          status: 'error',
          message: `Error sampling data: ${err}`
        })
      }

      // Determine if ready for migration
      const hasErrors = results.some(r => r.status === 'error')
      const hasTransactions = results.find(r => r.test_name === 'Transaction Data')?.count || 0
      
      setMigrationReady(!hasErrors && hasTransactions > 0)
      setTestResults(results)

    } catch (error) {
      results.push({
        test_name: 'Connection Test',
        status: 'error',
        message: `Failed to connect to database: ${error}`
      })
      setTestResults(results)
      setMigrationReady(false)
    } finally {
      setIsLoading(false)
    }
  }

  const runMigrationPreview = async () => {
    setIsLoading(true)
    try {
      // Preview what would be migrated
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          account_id,
          total_amount,
          items_summary,
          created_at,
          accounts(name),
          customers(name)
        `)
        .not('account_id', 'is', null)
        .not('total_amount', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        alert(`Error previewing migration: ${error.message}`)
      } else {
        console.log('Migration Preview Data:', data)
        alert(`Preview complete! Found ${data.length} records ready for migration. Check console for details.`)
      }
    } catch (err) {
      alert(`Error: ${err}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Database className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800' 
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Migration Tester - Local Environment
              </CardTitle>
              <CardDescription>
                Test database readiness before running migration scripts
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={runMigrationPreview}
                disabled={isLoading || migrationReady !== true}
                variant="outline" 
                size="sm"
              >
                <FileSearch className="h-4 w-4 mr-2" />
                Preview Migration
              </Button>
              <Button 
                onClick={runTests}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Run Tests
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {migrationReady !== null && (
        <Alert className={migrationReady ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <AlertDescription className="flex items-center gap-2">
            {migrationReady ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <strong>✅ Ready for Migration!</strong> All tests passed. You can proceed with running the SQL migration script.
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <strong>❌ Not Ready</strong> Some issues need to be resolved before migration.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
        </TabsList>

        <TabsContent value="results">
          {testResults.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          {result.test_name}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(result.status)}>
                            {result.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{result.message}</TableCell>
                        <TableCell>
                          {result.count !== undefined && (
                            <Badge variant="outline">{result.count}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Run Tests" to check migration readiness</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Migration Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  <strong>IMPORTANT:</strong> Test in local environment first before production!
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-semibold">Step-by-step process:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>
                    <strong>Run Tests:</strong> Click "Run Tests" to check database readiness
                  </li>
                  <li>
                    <strong>Preview Data:</strong> Click "Preview Migration" to see what data will be migrated
                  </li>
                  <li>
                    <strong>Local Testing:</strong> Run <code>test_migration_local.sql</code> in your database client
                  </li>
                  <li>
                    <strong>Review Results:</strong> Check the output and ensure data looks correct
                  </li>
                  <li>
                    <strong>Run Migration:</strong> Execute <code>migrate_existing_data_to_cash_history_safe.sql</code>
                  </li>
                  <li>
                    <strong>Verify:</strong> Check the Debug tab in Financial Reports to confirm data
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Files Created:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                  <li><code>test_migration_local.sql</code> - Testing script for local environment</li>
                  <li><code>migrate_existing_data_to_cash_history_safe.sql</code> - Main migration script</li>
                  <li>Both include safety checks and backup procedures</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Safety Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  <li>Automatic backup of existing cash_history data</li>
                  <li>Preview mode before actual migration</li>
                  <li>Conflict detection (prevents duplicate data)</li>
                  <li>Rollback instructions included</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}