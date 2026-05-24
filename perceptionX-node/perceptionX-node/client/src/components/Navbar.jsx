import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ChevronDown, Vegan, LogOut, User } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const Navbar = ({ isMenuOpen, setIsMenuOpen }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)
  const closeTimeoutRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
    setShowUserMenu(false)
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const isActive = (path) => {
    if (path === '/analytics') {
      return location.pathname.startsWith('/analytics')
    }
    return location.pathname === path
  }

  const isDetailPage = location.pathname.startsWith('/analytics/') && location.pathname !== '/analytics'

  return (
    <nav 
      className={`fixed top-0 right-0 z-50 transition-all duration-300 ${
        isDetailPage
          ? 'left-[260px] w-[calc(100%-260px)]'
          : 'left-0 w-full'
      }`}
      style={{
        background: '#ffffff',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className={`flex items-center gap-2.5 relative ${isDetailPage ? "hidden" : ""}`}>
            <Vegan className="w-6 h-6" style={{ color: '#000000' }} />
            <span 
              className="text-lg font-semibold"
              style={{
                color: '#000000',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '-0.01em'
              }}
            >
              PerceptionX
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <NavLink to="/" isActive={isActive('/')}>Home</NavLink>
            <NavLink to="/detect" isActive={isActive('/detect')}>Detect</NavLink>
            <NavLink to="/live-detect" isActive={isActive('/live-detect')}>Live Detect</NavLink>
            <NavLink to="/analytics" isActive={isActive('/analytics')}>Analytics</NavLink>
            <NavLink to="/pricing" isActive={isActive('/pricing')}>Pricing</NavLink>
            <NavLink to="/documentation" isActive={isActive('/documentation')}>Documentation</NavLink>
            <NavLink to="/contact" isActive={isActive('/contact')}>Contact</NavLink>
          </div>

          {/* Right Side Actions */}
          <div className="hidden lg:flex items-center gap-6">
            {isAuthenticated ? (
              <>
                {/* User Menu */}
                <div 
                  ref={userMenuRef}
                  className="relative"
                  onMouseEnter={() => {
                    // Clear any pending close timeout
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current)
                      closeTimeoutRef.current = null
                    }
                    setShowUserMenu(true)
                  }}
                  onMouseLeave={() => {
                    // Add a small delay to allow moving to dropdown
                    closeTimeoutRef.current = setTimeout(() => {
                      setShowUserMenu(false)
                    }, 150)
                  }}
                >
                  <button
                    className="flex items-center gap-2 text-sm font-medium transition-colors"
                    style={{
                      color: '#000000',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      padding: '6px 12px',
                      borderRadius: '6px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }}
                    onMouseLeave={(e) => {
                      if (!showUserMenu) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <User className="w-4 h-4" />
                    <span>{user?.username || 'User'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showUserMenu && (
                    <div 
                      className="absolute top-full right-0 mt-2 w-48 rounded-lg shadow-lg py-2"
                      style={{
                        background: '#ffffff',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
                      }}
                      onMouseEnter={() => {
                        if (closeTimeoutRef.current) {
                          clearTimeout(closeTimeoutRef.current)
                          closeTimeoutRef.current = null
                        }
                        setShowUserMenu(true)
                      }}
                      onMouseLeave={() => {
                        closeTimeoutRef.current = setTimeout(() => {
                          setShowUserMenu(false)
                        }, 150)
                      }}
                    >
                      <div className="px-4 py-2 border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.1)' }}>
                        <p className="text-sm font-medium" style={{ color: '#000000' }}>{user?.username}</p>
                        <p className="text-xs" style={{ color: '#666666' }}>{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
                        style={{ color: '#000000' }}
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#333333'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#000000'
                  }}
                >
                  Log in
                </Link>
                
                <div style={{ width: '1px', height: '20px', background: 'rgba(0, 0, 0, 0.1)' }} />
                
                <Link
                  to="/signup"
                  className="text-sm font-medium transition-colors"
                  style={{
                    color: '#000000',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#333333'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#000000'
                  }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2"
            style={{
              color: '#000000'
            }}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          className="lg:hidden"
          style={{
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            background: '#ffffff'
          }}
        >
          <div className="px-6 py-4 space-y-1">
            <MobileNavLink to="/" isActive={isActive('/')} onClick={toggleMenu}>Home</MobileNavLink>
            <MobileNavLink to="/detect" isActive={isActive('/detect')} onClick={toggleMenu}>Detect</MobileNavLink>
            <MobileNavLink to="/live-detect" isActive={isActive('/live-detect')} onClick={toggleMenu}>Live Detect</MobileNavLink>
            <MobileNavLink to="/analytics" isActive={isActive('/analytics')} onClick={toggleMenu}>Analytics</MobileNavLink>
            <MobileNavLink to="/pricing" isActive={isActive('/pricing')} onClick={toggleMenu}>Pricing</MobileNavLink>
            <MobileNavLink to="/documentation" isActive={isActive('/documentation')} onClick={toggleMenu}>Documentation</MobileNavLink>
            <MobileNavLink to="/contact" isActive={isActive('/contact')} onClick={toggleMenu}>Contact</MobileNavLink>
            <div className="border-t my-2" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2">
                  <p className="text-sm font-medium" style={{ color: '#000000' }}>{user?.username}</p>
                  <p className="text-xs" style={{ color: '#666666' }}>{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    handleLogout()
                    toggleMenu()
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-medium transition-colors"
                  style={{ color: '#000000' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <MobileNavLink to="/login" isActive={false} onClick={toggleMenu}>Log in</MobileNavLink>
                <MobileNavLink to="/signup" isActive={false} onClick={toggleMenu}>Sign up</MobileNavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

const NavLink = ({ to, isActive, children }) => {
  const handleClick = (e) => {
    // If clicking Documentation link and we're on home page, scroll to developers section
    if (to === '/documentation' && window.location.pathname === '/') {
      e.preventDefault()
      const developersSection = document.getElementById('developers')
      if (developersSection) {
        developersSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
        // Update URL without triggering navigation
        window.history.pushState(null, '', '/#developers')
      } else {
        // If section not found, navigate normally
        window.location.href = '/#developers'
      }
    }
  }

  return (
    <Link
      to={to}
      onClick={handleClick}
      className="relative text-sm font-medium transition-colors"
      style={{
        color: isActive ? '#000000' : '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '6px 0'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#333333'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#000000'
      }}
    >
      {children}
    </Link>
  )
}

const MobileNavLink = ({ to, isActive, onClick, children }) => {
  const handleClick = (e) => {
    // If clicking Documentation link and we're on home page, scroll to developers section
    if (to === '/documentation' && window.location.pathname === '/') {
      e.preventDefault()
      if (onClick) onClick()
      const developersSection = document.getElementById('developers')
      if (developersSection) {
        developersSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
        // Update URL without triggering navigation
        window.history.pushState(null, '', '/#developers')
      } else {
        // If section not found, navigate normally
        window.location.href = '/#developers'
      }
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <Link
      to={to}
      onClick={handleClick}
      className="block py-2.5 text-base font-medium transition-colors"
      style={{
        color: isActive ? '#000000' : '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#333333'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#000000'
      }}
    >
      {children}
    </Link>
  )
}

export default Navbar