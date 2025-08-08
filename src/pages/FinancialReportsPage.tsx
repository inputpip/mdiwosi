"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComprehensiveFinancialReport } from "@/components/ComprehensiveFinancialReport"
import { DailyFinancialReport } from "@/components/DailyFinancialReport"
import { DebugCashHistory } from "@/components/DebugCashHistory"
import { useAuth } from "@/hooks/useAuth"
import { FileText, CalendarDays, Receipt, TrendingUp, BarChart3, Bug } from "lucide-react"

export default function FinancialReportsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("daily")

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Keuangan</h1>
          <p className="text-muted-foreground">
            Kelola dan lihat laporan keuangan Matahari Digital Printing
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Laporan Harian
          </TabsTrigger>
          <TabsTrigger 
            value="comprehensive" 
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Laporan Komprehensif
          </TabsTrigger>
          {(user?.role === 'admin' || user?.role === 'owner') && (
            <TabsTrigger 
              value="debug" 
              className="flex items-center gap-2"
            >
              <Bug className="h-4 w-4" />
              Debug Data
            </TabsTrigger>
          )}
        </TabsList>

        {/* Daily Financial Report Tab */}
        <TabsContent value="daily" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Akses Level</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Kasir+</div>
                <p className="text-xs text-muted-foreground">
                  Kasir, Admin, Owner
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fitur Utama</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">Kas Harian</div>
                <p className="text-xs text-muted-foreground">
                  Detail arus kas per hari
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cakupan Data</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">Per Hari</div>
                <p className="text-xs text-muted-foreground">
                  Pilih tanggal tertentu
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Format Output</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">Print</div>
                <p className="text-xs text-muted-foreground">
                  Cetak laporan harian
                </p>
              </CardContent>
            </Card>
          </div>

          <DailyFinancialReport enableCashierAccess={true} />
        </TabsContent>

        {/* Comprehensive Financial Report Tab */}
        <TabsContent value="comprehensive" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Akses Level</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">Semua Role</div>
                <p className="text-xs text-muted-foreground">
                  Admin, Kasir, Supervisor
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fitur Utama</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Filter Lengkap</div>
                <p className="text-xs text-muted-foreground">
                  Tanggal, akun, jenis
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cakupan Data</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">Range Tanggal</div>
                <p className="text-xs text-muted-foreground">
                  Fleksibel sesuai kebutuhan
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Format Output</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">Print</div>
                <p className="text-xs text-muted-foreground">
                  Cetak dengan filter
                </p>
              </CardContent>
            </Card>
          </div>

          <ComprehensiveFinancialReport />
        </TabsContent>

        {/* Debug Tab - Only for Admin/Owner */}
        {(user?.role === 'admin' || user?.role === 'owner') && (
          <TabsContent value="debug" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Akses Level</CardTitle>
                  <Bug className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">Admin/Owner</div>
                  <p className="text-xs text-muted-foreground">
                    Hanya untuk debugging
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fungsi Utama</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">Debug Data</div>
                  <p className="text-xs text-muted-foreground">
                    Periksa & sync data
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Deteksi Masalah</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">Data Sync</div>
                  <p className="text-xs text-muted-foreground">
                    Sinkronisasi otomatis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Perbaikan</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Auto Fix</div>
                  <p className="text-xs text-muted-foreground">
                    Perbaikan otomatis
                  </p>
                </CardContent>
              </Card>
            </div>

            <DebugCashHistory />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}