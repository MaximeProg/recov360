export default function Spinner({ size = 20 }: { size?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--primary)',
      borderRadius: '50%',
    }} className="animate-spin" />
  )
}
