export default function CompanyHeader({
  companyName = 'Aecon Group Inc.',
  companySymbol = 'ARE',
  currency = 'CAD',
  exchange = 'TSX',
  sector = 'Construction & Infrastructure',
  source = 'data-pack/are.json',
  description = ''
}) {
  return (
    <header className="main-header">
      <div className="header-top">
        <div className="title-group">
          <span className="symbol-badge">{companySymbol}</span>
          <h1>{companyName}</h1>
        </div>
        <div className="badge-row">
          <span className="badge badge-accent">{sector}</span>
          <span className="badge">Devise : {currency}</span>
          <span className="badge">{exchange}</span>
          <span className="badge badge-subtle">{source}</span>
        </div>
      </div>
      {description && <p className="description">{description}</p>}
    </header>
  );
}
