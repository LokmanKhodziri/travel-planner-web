import NewLocationClient from "@/components/new-location";

export default async function NewLocationPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <NewLocationClient tripId={tripId} />;
}
