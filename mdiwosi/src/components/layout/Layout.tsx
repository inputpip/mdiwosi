"use client"
import { useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Header } from "./Header"
import { cn } from "@/lib/utils"

export function Layout() {
  const [isCollapsed, setCollapsed] = useState(false)
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[auto_1fr]">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full lg:relative lg:z-auto lg:block",
        "lg:translate-x-0 transition-transform duration-300 ease-in-out",
        isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar 
          isCollapsed={isCollapsed} 
          setCollapsed={setCollapsed} 
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
      </div>
      
      <div className="flex flex-col">
        <Header 
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
          showMobileMenu={true}
        />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}