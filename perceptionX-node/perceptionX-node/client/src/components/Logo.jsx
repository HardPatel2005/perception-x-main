import React from 'react'
import { Link } from 'react-router-dom'
import { Vegan } from 'lucide-react'

const Logo = ({ variant = 'dark' }) => {
  const isLight = variant === 'light'
  const textColor = isLight ? '#ffffff' : '#000000'
  const iconColor = isLight ? '#ffffff' : '#000000'

  return (
    <div className="mb-4 px-4">
      <Link to="/" className="flex items-center gap-2.5 relative">
        <Vegan className="w-6 h-6" style={{ color: iconColor }} />
        <span 
          className="text-lg font-semibold"
          style={{
            color: textColor,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.01em'
          }}
        >
          PerceptionX
        </span>
      </Link>
    </div>
  )
}

export default Logo
