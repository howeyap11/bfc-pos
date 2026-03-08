type MenuCategory = {
  id: string;
  name: string;
  prepArea: "BAR" | "KITCHEN";
  sort: number;
  items: { id: string; name: string; basePrice: number }[];
};

async function getMenu(): Promise<MenuCategory[]> {
  const res = await fetch("http://127.0.0.1:3001/api/menu", { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(`Menu fetch failed: ${res.status} ${res.statusText} - ${text}`);
  return JSON.parse(text) as MenuCategory[];
}

export default async function TablePage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  const menu = await getMenu();

  return (
    <main style={{ padding: 24 }}>
      <h1>But First, Coffee</h1>
      <p>
        Table: <b>{tableId}</b>
      </p>

      <p><a href="/cart">View Cart</a></p>
      <hr />

      {menu.map((cat) => (
        <section key={cat.id} style={{ marginBottom: 24 }}>
          <h2 style={{ textTransform: "capitalize" }}>{cat.name}</h2>

          <ul>
            {cat.items.map((item) => (
              <li key={item.id}>
                <a href={`/t/${tableId}/item/${item.id}`}>
                  {item.name} – ₱{(item.basePrice / 100).toFixed(2)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
