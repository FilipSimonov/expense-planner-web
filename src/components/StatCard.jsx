export default function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <span className="label">{label}</span>
      <span className="value" style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}
