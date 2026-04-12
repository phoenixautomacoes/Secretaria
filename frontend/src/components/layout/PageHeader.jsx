export default function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
