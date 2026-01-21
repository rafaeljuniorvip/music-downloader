import './StatsPage.css'

function StatCard({ title, value, icon, subtitle }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon-wrapper">
        <span className={`stat-card-icon stat-card-icon-${icon}`}></span>
      </div>
      <div className="stat-card-content">
        <span className="stat-card-title">{title}</span>
        <span className="stat-card-value">{value}</span>
        {subtitle && <span className="stat-card-subtitle">{subtitle}</span>}
      </div>
    </div>
  )
}

export default StatCard
