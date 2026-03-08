import ItemClient from "./ui";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ tableId: string; itemId: string }>;
}) {
  const { tableId, itemId } = await params;
  return <ItemClient tableId={tableId} itemId={itemId} />;
}
