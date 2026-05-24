import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Radio,
  Activity,
  Users,
  Building2,
  AlertTriangle,
  Zap,
  FileText,
  Settings,
  LogOut
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import Logo from '../../Logo'

const Sidebar = ({ isOpen, onToggle }) => {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Extract fileId from current route (either /analytics/:fileId or /result/:fileId)
  const getFileIdFromPath = () => {
    const analyticsMatch = location.pathname.match(/^\/analytics\/([^/]+)$/)
    const resultMatch = location.pathname.match(/^\/result\/([^/]+)$/)
    return analyticsMatch?.[1] || resultMatch?.[1] || null
  }
  
  const fileId = getFileIdFromPath()
  
  const isActive = (item) => {
    // Dashboard is considered active for all analytics routes
    if (item.label === 'DASHBOARD') {
      return location.pathname === '/analytics' || location.pathname.startsWith('/analytics/')
    }
    return location.pathname === item.path
  }

  const menuItems = [
    {type: "logo"},
    { icon: LayoutDashboard, label: 'DASHBOARD', path: fileId ? `/analytics/${fileId}` : '/analytics' },
    { icon: FileText, label: 'RESULTS', path: fileId ? `/result/${fileId}` : '/result' },
    { icon: AlertTriangle, label: 'ALERTS', path: '/alerts' },
    { icon: Zap, label: 'PERFORMANCE', path: '/performance' },
    { icon: FileText, label: 'REPORTS', path: '/reports' }
  ]

  const handleSignOut = () => {
    // Add your sign out logic here
    console.log('Sign out clicked')
    // Example: navigate('/login') or clear auth tokens, etc.
  }

  return (
    <>
      <motion.div
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full w-[260px] bg-gradient-to-b from-[#c840e9] via-[#a445b2] to-[#7b2ff7] z-40 flex flex-col"

      >
        <nav className="flex flex-1 flex-col gap-1 px-3 pt-6">
          {menuItems.map((item, idx) => {

            if(item.type === "logo"){
              return (
                <Logo key={idx} variant="light"/>
              )
            }
            const Icon = item.icon
            const active = isActive(item)
            return (
              <Link
                key={idx}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10",
                  active && "bg-white/15 text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        
        {/* Settings and Sign Out at the bottom */}
        <div className="mt-auto border-t border-white/20 pt-2 pb-4 px-3">
          <Link
            to="/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10 mb-2",
              location.pathname === '/settings' && "bg-white/15 text-white"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            SETTINGS
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-md px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/10"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            SIGN OUT
          </button>
        </div>
      </motion.div>

      {/* Overlay when sidebar is open on mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onToggle}
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        />
      )}
    </>
  )
}

export default Sidebar
