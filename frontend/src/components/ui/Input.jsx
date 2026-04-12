export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <input
        className={`block w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-gray-100 shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-700'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
