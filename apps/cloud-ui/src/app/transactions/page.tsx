import { Suspense } from "react";
import { TransactionsContent } from "./TransactionsContent";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white/70">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
