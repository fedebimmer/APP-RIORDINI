
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { Icons } from '../components/icons';
import { FullItemData } from '../types';
import { apiAnalyzeCodes } from '../services/apiService';

const QuickAnalysisPage: React.FC = () => {
    const [codes, setCodes] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<FullItemData[] | null>(null);
    const [notFoundCodes, setNotFoundCodes] = useState<string[]>([]);

    const handleAnalyze = async () => {
        if (!codes.trim()) return;
        setLoading(true);
        setResults(null);
        setNotFoundCodes([]);

        const codeList = codes.split('\n').map(c => c.trim()).filter(Boolean);
        const analysisResults = await apiAnalyzeCodes(codeList);
        
        const foundCodes = new Set(analysisResults.map(r => r.code.toLowerCase()));
        const notFound = codeList.filter(c => !foundCodes.has(c.toLowerCase()));

        setResults(analysisResults);
        setNotFoundCodes(notFound);
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Analisi Rapida da Elenco Codici</h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Inserisci un elenco di codici articolo (uno per riga) per ottenere un calcolo di riordino immediato basato sui parametri attivi.
                </p>
                <div className="mt-4">
                    <textarea
                        rows={10}
                        value={codes}
                        onChange={(e) => setCodes(e.target.value)}
                        placeholder="AR-SP-00012
AR-SP-00045
AR-SP-00101
..."
                        className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div className="mt-4">
                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !codes.trim()}
                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <Icons.Spinner className="w-5 h-5 mr-2 animate-spin" /> : <Icons.Wand className="w-5 h-5 mr-2" />}
                        Analizza Codici
                    </button>
                </div>
            </Card>

            {loading && (
                <Card>
                    <div className="flex justify-center items-center py-8">
                        <Icons.Spinner className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="ml-4 text-gray-600 dark:text-gray-300">Calcolo in corso...</p>
                    </div>
                </Card>
            )}

            {results && (
                <Card>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Risultati Analisi ({results.length} trovati)</h3>
                    {notFoundCodes.length > 0 && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm text-yellow-800 dark:text-yellow-300">
                            <strong>Codici non trovati:</strong> {notFoundCodes.join(', ')}
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precodice</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrizione</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giacenza</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Forecast 60gg</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consigliato</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {results.map((res) => (
                                    <tr key={res.id}>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{res.precodice || '--'}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{res.code}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-sm">{res.description}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{res.current_stock}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{res.calculation.forecast_60d}</td>
                                        <td className={`px-6 py-4 text-sm font-bold ${res.calculation.recommended_order_qty > 0 ? 'text-blue-600' : 'text-gray-500'}`}>{res.calculation.recommended_order_qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default QuickAnalysisPage;
