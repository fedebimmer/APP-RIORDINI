
import React, { useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import { Icons } from '../components/icons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ProposalLine } from '../types';
import Tooltip from '../components/ui/Tooltip';

declare var XLSX: any;

const ProposalPage: React.FC = () => {
    const { user } = useAuth();
    const { proposal, updateProposalLineQty, removeProposalLine, approveAndArchiveAction } = useData();
    const [isApproving, setIsApproving] = useState(false);

    const suppliers = useMemo(() => {
        const supplierMap = new Map<string, ProposalLine[]>();
        proposal.forEach(line => {
            const supplierName = line.itemData.supplier || 'Sconosciuto';
            if (!supplierMap.has(supplierName)) {
                supplierMap.set(supplierName, []);
            }
            supplierMap.get(supplierName)!.push(line);
        });
        return Array.from(supplierMap.entries());
    }, [proposal]);

    const handleExport = () => {
        const wb = XLSX.utils.book_new();
        suppliers.forEach(([supplierName, lines]) => {
            const dataToExport = lines.map(line => ({
                'Fornitore': supplierName,
                'Precodice': line.itemData.precodice || '',
                'Codice': line.itemData.code,
                'Descrizione': line.itemData.description || '',
                'Quantità da Ordinare': line.modifiedQty,
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            XLSX.utils.book_append_sheet(wb, ws, supplierName.substring(0, 31)); // Sheet name limit is 31 chars
        });
        XLSX.writeFile(wb, `Proposta_Ordine_${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    
    const handleApprove = async () => {
        if (!user || proposal.length === 0) return;
        setIsApproving(true);
        try {
            await approveAndArchiveAction(user);
            // The proposal state will be cleared by the context
            alert("Proposta approvata e archiviata con successo!");
        } catch (error) {
            console.error("Failed to archive proposal", error);
            alert("Errore durante l'archiviazione della proposta.");
        } finally {
            setIsApproving(false);
        }
    }

    if (proposal.length === 0 && !isApproving) {
        return (
            <Card className="text-center py-12">
                <Icons.Cart className="mx-auto h-12 w-12 text-gray-400"/>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nessuna proposta generata</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Vai alla Dashboard per generare una nuova proposta d'ordine.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
             <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Proposta d'Ordine</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Stato: Bozza ({proposal.length} articoli)</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExport} className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
                           <Icons.Excel className="w-5 h-5 mr-2"/>
                           Esporta CSV/XLSX
                        </button>
                         <button onClick={handleApprove} disabled={isApproving} className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                           {isApproving ? <Icons.Spinner className="w-5 h-5 mr-2 animate-spin" /> : <Icons.Check className="w-5 h-5 mr-2"/>}
                           Approva Proposta
                        </button>
                    </div>
                </div>
            </Card>

            {suppliers.map(([supplier, lines]) => (
                 <Card key={supplier}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{supplier}</h3>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giacenza</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q.tà Venduta 365gg</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forecast 60gg</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consigliato</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Da Ordinare</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {lines.map(line => (
                                    <tr key={line.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            <div className="flex items-center">
                                                {line.itemData.calculation.slow_mover_flag && (
                                                    <Tooltip text={line.itemData.calculation.slow_mover_reason}>
                                                        <Icons.Alert className="h-5 w-5 text-yellow-500 mr-2" />
                                                    </Tooltip>
                                                )}
                                                {line.itemData.code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{line.itemData.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{line.itemData.current_stock}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{line.itemData.qty_sold_365}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{line.itemData.calculation.forecast_60d}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{line.itemData.calculation.recommended_order_qty}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <input 
                                                type="number"
                                                value={line.modifiedQty}
                                                onChange={(e) => updateProposalLineQty(line.id, parseInt(e.target.value) || 0)}
                                                className="w-24 p-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                            />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => removeProposalLine(line.id)} className="text-red-600 hover:text-red-900">
                                                <Tooltip text="Rimuovi dalla proposta">
                                                    <Icons.Delete className="w-5 h-5"/>
                                                </Tooltip>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                </Card>
            ))}
        </div>
    );
};

export default ProposalPage;
