import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import Card from '../components/ui/Card';
import { Icons } from '../components/icons';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const ArchivedProposalsPage: React.FC = () => {
    const { archivedProposals, loading } = useData();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProposals = useMemo(() => {
        if (!searchTerm.trim()) {
            return archivedProposals;
        }
        const lowercasedFilter = searchTerm.toLowerCase().trim();
        return archivedProposals.filter(proposal =>
            proposal.lines.some(line =>
                line.code.toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [archivedProposals, searchTerm]);

    const toggleExpansion = (id: string) => {
        setExpandedId(currentId => (currentId === id ? null : id));
    };

    if (loading && archivedProposals.length === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <Icons.Spinner className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }

    if (archivedProposals.length === 0) {
        return (
            <Card className="text-center py-12">
                <Icons.File className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nessuna proposta archiviata</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Approva una proposta per vederla comparire qui nello storico.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <div className="relative">
                    <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cerca per codice articolo in tutte le proposte..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                </div>
            </Card>

            {filteredProposals.length > 0 ? (
                filteredProposals.map(proposal => (
                    <Card key={proposal.id}>
                        <div className="cursor-pointer" onClick={() => toggleExpansion(proposal.id)}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="flex-shrink-0 text-gray-400">
                                        {expandedId === proposal.id ? <Icons.ChevronRight className="w-5 h-5 transform rotate-90 transition-transform" /> : <Icons.ChevronRight className="w-5 h-5 transition-transform" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                            Proposta del {format(parseISO(proposal.proposal_date), "d MMMM yyyy 'alle' HH:mm", { locale: it })}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Creata da: {proposal.created_by}
                                        </p>
                                    </div>
                                </div>
                                 <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {proposal.items_count} articoli
                                </p>
                            </div>
                        </div>

                        {expandedId === proposal.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                 <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precodice</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornitore</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q.tà Ordinata</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                            {proposal.lines.map(line => (
                                                <tr key={line.itemId}>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{line.precodice || '--'}</td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{line.code}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-sm">{line.description || '--'}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{line.supplier || 'Sconosciuto'}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">{line.orderedQty}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </Card>
                ))
            ) : (
                <Card className="text-center py-12">
                     <Icons.Search className="mx-auto h-12 w-12 text-gray-400" />
                     <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nessuna proposta trovata</h3>
                     <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Nessuna proposta archiviata contiene il codice articolo '{searchTerm}'.</p>
                </Card>
            )}
        </div>
    );
};

export default ArchivedProposalsPage;
