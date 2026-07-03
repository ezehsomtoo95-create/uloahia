export default function ListingDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="listing-detail-shell min-h-dvh overflow-x-hidden">{children}</div>
  );
}
