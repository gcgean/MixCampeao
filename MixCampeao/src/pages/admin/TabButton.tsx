export default function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-md bg-white/10 px-3 py-2 text-sm text-white'
          : 'rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white'
      }
    >
      {children}
    </button>
  )
}

