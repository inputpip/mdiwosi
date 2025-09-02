"use client"
import * as React from "react"
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { format, startOfDay, endOfDay } from 'date-fns'
import { id } from 'date-fns/locale/id'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DebugAdvances() {
  // Query all advances
  const { data: allAdvances } = useQuery({
    queryKey: ['allAdvances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_advances')
        .select(`
          *,
          advance_repayments:advance_repayments(*)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch advances: ${error.message}`)
      }

      return data || []
    }
  })

  // Query today's paid advances
  const { data: todayPaid } = useQuery({
    queryKey: ['todayPaidAdvancesDebug'],
    queryFn: async () => {
      const today = new Date()
      const startOfToday = startOfDay(today)
      const endOfToday = endOfDay(today)
      
      const { data, error } = await supabase
        .from('employee_advances')
        .select('*')
        .eq('remaining_amount', 0)
        .gte('updated_at', startOfToday.toISOString())
        .lte('updated_at', endOfToday.toISOString())

      if (error) {
        throw new Error(`Failed to fetch today's paid advances: ${error.message}`)
      }

      return data || []
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug - Employee Advances Data</CardTitle>
        <CardDescription>
          Current time: {new Date().toISOString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">All Advances ({allAdvances?.length || 0})</h3>
          <div className="text-xs bg-gray-100 p-2 rounded max-h-60 overflow-y-auto">
            <pre>{JSON.stringify(allAdvances, null, 2)}</pre>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Today's Paid Advances ({todayPaid?.length || 0})</h3>
          <div className="text-xs bg-gray-100 p-2 rounded max-h-60 overflow-y-auto">
            <pre>{JSON.stringify(todayPaid, null, 2)}</pre>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Filter Info</h3>
          <div className="text-xs">
            <p>Start of today: {startOfDay(new Date()).toISOString()}</p>
            <p>End of today: {endOfDay(new Date()).toISOString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}