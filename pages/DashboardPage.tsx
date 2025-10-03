import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FullItemData } from '../types';
import { Icons } from '../components/icons';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Tooltip from '../components/ui/Tooltip';
import { format, parseISO } from 'date-fns';
import { useData } from '../contexts/DataContext';

type SortableKeys = keyof Omit<FullItemData, 'calculation'> | 'qty_sold_365' | 'value_sold_365' | 'last_sale_date' | 'last_purchase_date' | 'ubicazione';

const DashboardPage: React.FC = () => {
    const { fullItemData: data, loading, generateProposal } = useData();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ 
        showSlowMovers: false,
        onlyRecommended: false,
     });
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' } | null>(null);

    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(item => {
            const term = searchTerm.toLowerCase();
            const searchMatch = item.code.toLowerCase().includes(term) || 
                                (item.description && item.description.toLowerCase().includes(term)) ||
                                (item.precodice && item.precodice.toLowerCase().includes(term)) ||
                                (item.ubicazione && item.ubicazione.toLowerCase().includes(term));
            const slowMoverMatch = filters.showSlowMovers ? item.calculation.slow_mover_flag : true;
            const recommendedMatch = filters.onlyRecommended ? item.calculation.recommended_order_qty > 0 : true;
            return searchMatch && slowMoverMatch && recommendedMatch;
        });
    }, [data, searchTerm, filters]);

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    // Handle dates
                     if (sortConfig.key === 'last_sale_date' || sortConfig.key === 'last_purchase_date') {
                        const dateA = aValue ? parseISO(aValue).getTime() : 0;
                        const dateB = bValue ? parseISO(bValue).getTime() : 0;
                        if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
                        return 0;
                    }
                    // Handle strings
                    const comparison = aValue.localeCompare(bValue, 'it', { sensitivity: 'base' });
                    return sortConfig.direction === 'ascending' ? comparison : -comparison;
                }
                
                // Handle numbers
                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);
    
    const kpis = useMemo(() => {
        if (!data) return { itemsToReorder: 0, reorderPercentage: '0', proposedOrderValue: '€0,00', slowMoversCount: 0 };
        const toReorder = data.filter(d => d.calculation.recommended_order_qty > 0);
        const reorderValue = toReorder.reduce((acc, item) => {
            const unitValue = item.qty_sold_365 > 0 ? item.value_sold_365 / item.qty_sold_365 : 0;
            return acc + (item.calculation.recommended_order_qty * unitValue);
        }, 0);
        const slowMovers = data.filter(d => d.calculation.slow_mover_flag);

        return {
            itemsToReorder: toReorder.length,
            reorderPercentage: data.length > 0 ? (toReorder.length / data.length * 100).toFixed(1) : '0',
            proposedOrderValue: reorderValue.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }),
            slowMoversCount: slowMovers.length,
        };
    }, [data]);

    const handleSelect = (itemId: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const visibleIds = sortedData.map(item => item.id);
        const newSelection = new Set(selectedItems);

        if (e.target.checked) {
            visibleIds.forEach(id => newSelection.add(id));
        } else {
            visibleIds.forEach(id => newSelection.delete(id));
        }
        setSelectedItems(newSelection);
    };

    const handleGenerateProposal = () => {
        if (!data) return;
        let itemsToPropose: FullItemData[];

        if (selectedItems.size > 0) {
            itemsToPropose = data.filter(item => selectedItems.has(item.id));
        } else {
            itemsToPropose = data.filter(item => item.calculation.recommended_order_qty > 0);
        }
        
        if (itemsToPropose.length > 0) {
            generateProposal(itemsToPropose);
            navigate('/proposal');
        }
    };
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Icons.Spinner className="w-12 h-12 animate-spin text-blue-600" />
            </div>
        );
    }
    
    if (!data || data.length === 0) {
        return (
            <Card className="text-center py-12">
                <Icons.File className="mx-auto h-12 w-12 text-gray-400"/>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nessun dato importato</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Inizia importando un file di vendite dalla pagina "Import Dati".</p>
            </Card>
        );
    }

    const isAllVisibleSelected = useMemo(() => {
        if (sortedData.length === 0) return false;
        return sortedData.every(item => selectedItems.has(item.id));
    }, [sortedData, selectedItems]);
    
    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; children: React.ReactNode }> = ({ sortKey, children }) => {
        const isSorted = sortConfig?.key === sortKey;
        const Icon = isSorted ? (sortConfig.direction === 'ascending' ? Icons.ArrowUp : Icons.ArrowDown) : Icons.ChevronsUpDown;
        
        return (
            <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => requestSort(sortKey)}
            >
                <div className="flex items-center">
                    <span>{children}</span>
                    <Icon className={`w-4 h-4 ml-1 ${isSorted ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`} />
                </div>
            </th>
        );
    };

    const generateProposalDisabled = selectedItems.size === 0 && kpis.itemsToReorder === 0;

    const renderTable = () => (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                    <th className="px-6 py-3 text-left">
                        <input
                            type="checkbox"
                            className="rounded text-blue-600"
                            checked={isAllVisibleSelected}
                            onChange={handleSelectAll}
                            aria-label="Seleziona tutto"
                        />
                    </th>
                    <SortableHeader sortKey="precodice">Precodice</SortableHeader>
                    <SortableHeader sortKey="code">Codice</SortableHeader>
                    <SortableHeader sortKey="description">Descrizione</SortableHeader>
                    <SortableHeader sortKey="qty_sold_365">Q.tà Venduta</SortableHeader>
                    <SortableHeader sortKey="value_sold_365">Valore Venduto</SortableHeader>
                    <SortableHeader sortKey="last_sale_date">Ultima Vendita</SortableHeader>
                    <SortableHeader sortKey="last_purchase_date">Ultimo Acquisto</SortableHeader>
                    <SortableHeader sortKey="ubicazione">Ubicazione</SortableHeader>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedData.map(item => (
                    <tr key={item.id} className={`${selectedItems.has(item.id) ? 'bg-blue-50 dark:bg-blue-900/50' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                        <td className="px-6 py-4">
                            <input
                                type="checkbox"
                                className="rounded text-blue-600"
                                checked={selectedItems.has(item.id)}
                                onChange={() => handleSelect(item.id)}
                                aria-label={`Seleziona articolo ${item.code}`}
                            />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.precodice || '--'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            <div className="flex items-center">
                                {item.import_warnings && item.import_warnings.length > 0 && (
                                    <Tooltip text={item.import_warnings.join('\n')}>
                                        <Icons.Alert className="h-4 w-4 mr-2 text-yellow-500" />
                                    </Tooltip>
                                )}
                                <span>{item.code}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{item.description}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${item.qty_sold_365 < 0 ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>{item.qty_sold_365}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${item.value_sold_365 < 0 ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}`}>{item.value_sold_365.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.last_sale_date ? format(new Date(item.last_sale_date), 'dd/MM/yyyy') : 'N/D'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.last_purchase_date ? format(new Date(item.last_purchase_date), 'dd/MM/yyyy') : 'N/D'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.ubicazione || '--'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Card>
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-500 text-white rounded-full p-3 mr-4">
                            <Icons.Package className="h-6 w-6"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Da Riordinare</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.itemsToReorder} <span className="text-sm font-normal">({kpis.reorderPercentage}%)</span></p>
                        </div>
                    </div>
                </Card>
                <Card>
                   <div className="flex items-center">
                       <div className="flex-shrink-0 bg-green-500 text-white rounded-full p-3 mr-4">
                            <Icons.Dollar className="h-6 w-6"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valore Proposto</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.proposedOrderValue}</p>
                        </div>
                   </div>
                </Card>
                <Card>
                   <div className="flex items-center">
                        <div className="flex-shrink-0 bg-yellow-500 text-white rounded-full p-3 mr-4">
                            <Icons.TrendingUp className="h-6 w-6 -scale-y-100"/>
                        </div>
                        <div>
                           <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Poco Movimentati</p>
                           <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpis.slowMoversCount}</p>
                        </div>
                   </div>
                </Card>
                 <Card>
                   <div className="flex items-center">
                       <div className="flex-shrink-0 bg-red-500 text-white rounded-full p-3 mr-4">
                            <Icons.Ban className="h-6 w-6"/>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Bloccati</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.filter(d => d.reorder_blocked).length}</p>
                        </div>
                   </div>
                </Card>
            </div>
            <Card>
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                    <div className="relative w-full md:w-1/3">
                        <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Cerca per precodice, codice, descrizione, ubicazione..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="flex items-center space-x-4 flex-wrap">
                        <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={filters.onlyRecommended}
                                onChange={e => setFilters({...filters, onlyRecommended: e.target.checked})}
                                className="rounded text-blue-600"
                            />
                            <span>Solo da riordinare</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={filters.showSlowMovers}
                                onChange={e => setFilters({...filters, showSlowMovers: e.target.checked})}
                                className="rounded text-blue-600"
                            />
                            <span>Solo "Poco Movimentati"</span>
                        </label>
                         <button 
                            onClick={handleGenerateProposal}
                            disabled={generateProposalDisabled}
                            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                           <Icons.Cart className="w-5 h-5 mr-2"/>
                           {selectedItems.size > 0 ? `Genera proposta (${selectedItems.size} selezionati)` : 'Genera proposta'}
                        </button>
                    </div>
                </div>
                {sortedData.length > 0 ? renderTable() : <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nessun dato corrisponde ai filtri impostati.</p>}
            </Card>
        </div>
    );
};

export default DashboardPage;