import { Search, User, Menu } from 'lucide-react'

const Topbar = ({ onMenuClick }) => {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[#2a2a3a] bg-[#1a1a2e] px-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
        Dashboard
      </h2>
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          type="button"
          className="text-gray-400 transition-colors hover:text-white lg:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="text-gray-400 transition-colors hover:text-white"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a2a3a] text-gray-400 transition-colors hover:text-white"
          aria-label="User profile"
        >
          <User className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

export default Topbar
