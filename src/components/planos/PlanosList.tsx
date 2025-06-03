
import { CheckCircle, XCircle } from "lucide-react";
import { Plano } from "@/types/plano";

interface PlanosListProps {
    planos: Plano[];
    onAtualizar: () => void;
}

export const PlanosList = ({ planos }: PlanosListProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {planos.map((plano) => (
            <div key={plano.id} className="border p-4 rounded shadow-sm">
            <h2 className="text-xl font-bold mb-1">{plano.name}</h2>
            <p className="text-sm text-muted">
                Mensal: R$ {plano.price_monthly.toFixed(2)}
            </p>
            <p className="text-sm text-muted">
                Anual: R$ {plano.price_yearly.toFixed(2)}
            </p>
            <p className="text-sm mt-1">
                Status: {plano.is_active ? "Ativo" : "Inativo"}
            </p>
            <ul className="mt-4 space-y-2">
                {plano.features?.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                    {f.is_enabled ? (
                    <CheckCircle className="text-green-600 w-4 h-4" />
                    ) : (
                    <XCircle className="text-gray-400 w-4 h-4" />
                    )}
                    {f.feature}
                </li>
                ))}
            </ul>
            </div>
        ))}
        </div>
    );
};
