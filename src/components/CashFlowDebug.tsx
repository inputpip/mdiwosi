import { useCashFlow } from "@/hooks/useCashFlow";
import { Badge } from "./ui/badge";

export function CashFlowDebug() {
  const { cashHistory, isLoading } = useCashFlow();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-bold mb-4">Debug Cash History Data</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {(cashHistory || []).slice(0, 10).map((item, index) => (
          <div key={item.id} className="p-3 border rounded text-sm">
            <div><strong>#{index + 1} ID:</strong> {item.id}</div>
            <div><strong>Type:</strong> <Badge variant="outline">{item.type}</Badge></div>
            <div><strong>Amount:</strong> {item.amount}</div>
            <div><strong>Description:</strong> {item.description}</div>
            <div><strong>Account ID:</strong> {item.account_id}</div>
            <div><strong>Account Name:</strong> {item.account_name || 'NOT FOUND'}</div>
            <div><strong>Accounts Join:</strong> {JSON.stringify(item.accounts || 'NO JOIN DATA')}</div>
            <div><strong>Created:</strong> {new Date(item.created_at).toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              Raw: {JSON.stringify(item, null, 2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}