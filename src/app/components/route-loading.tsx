export function RouteLoading() {
  return <div className="route-loading" role="status" aria-label="Loading">
    <div className="route-loading__inner">
      <div className="skeleton skeleton--nav" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--short" />
      <div className="skeleton skeleton--block" />
    </div>
  </div>;
}
