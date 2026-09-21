export default function AuthField({
  id,
  type,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  type: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="fl-input"
      />
      <label htmlFor={id} className="fl-label">{label}</label>
    </div>
  )
}
