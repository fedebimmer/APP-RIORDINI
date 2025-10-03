import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Icons } from '../components/icons';
import Card from '../components/ui/Card';
import { CsvProposalRow, FullItemData } from '../types';

// Use XLSX from global scope
declare var XLSX: any;

type Status = 'idle' | 'parsing' | 'matching' | 'ready' | 'failed';

const CsvProposalPage: React.FC = () => {
    const { fullItemData, generateProposal } = useData();
    const navigate = useNavigate();
    
    const [status, setStatus] = useState<Status>('idle');
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const [csvData, setCsvData] = useState<CsvProposalRow[]>([]);
    const [foundItems, setFoundItems] = useState<FullItemData[]>([]);
    const [notFoundItems, setNotFoundItems] = useState<CsvProposalRow[]>([]);

    const resetState = () => {
        setStatus('idle');
        setError(null);
        setFileName(null);
        setCsvData([]);
        setFoundItems([]);
        setNotFoundItems([]);
    };

    const processFile = (file: File) => {
        resetState();
        setFileName(file.name);
        setStatus('parsing');

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });
                
                if (json.length === 0) {
                    setError("Il file è vuoto o non contiene dati validi.");
                    setStatus('failed');
                    return;
                }

                // Flexible header validation
                const headers = Object.keys(json[0] || {}).map(h => h.toLowerCase().trim());
                
                const precodiceAliases = ['precodice'];
                const codeAliases = ['code', 'codice', 'codice articolo'];

                const hasPrecodice = precodiceAliases.some(alias => headers.includes(alias));
                const hasCode = codeAliases.some(alias => headers.includes(alias));

                if (!hasPrecodice || !hasCode) {
                    let errorMsg = "Il file deve contenere le colonne richieste.";
                    if (!hasPrecodice) errorMsg = "Colonna 'PRECODICE' non trovata.";
                    else if (!hasCode) errorMsg = "Colonna 'CODICE' (o 'Codice Articolo') non trovata.";
                    errorMsg += ` Colonne trovate nel file: ${headers.join(', ')}`;
                    setError(errorMsg);
                    setStatus('failed');
                    return;
                }

                const findKeyByAliases = (row: any, aliases: string[]): string | undefined => {
                    const rowKeys = Object.keys(row).map(k => ({ original: k, lower: k.toLowerCase().trim() }));
                    for (const alias of aliases) {
                        const foundKey = rowKeys.find(k => k.lower === alias);
                        if (foundKey) return foundKey.original;
                    }
                    return undefined;
                };

                const parsedCsv: CsvProposalRow[] = json.map(row => {
                    const precodiceKey = findKeyByAliases(row, precodiceAliases);
                    const codeKey = findKeyByAliases(row, codeAliases);
                    
                    return {
                        precodice: precodiceKey ? String(row[precodiceKey]).trim() : '',
                        code: codeKey ? String(row[codeKey]).trim() : '',
                    };
                }).filter(r => r.code || r.precodice);

                setCsvData(parsedCsv);
                setStatus('matching');

                if (!fullItemData || fullItemData.length === 0) {
                    setError("I dati di base non sono stati caricati. Importa prima un file di vendite dalla pagina 'Import Dati'.");
                    setStatus('failed');
                    return;
                }

                const dataMap = new Map<string, FullItemData>();
                fullItemData.forEach(item => {
                    const key = `${(item.precodice || '').trim()}---${item.code.trim()}`;
                    dataMap.set(key, item);
                });

                const found: FullItemData[] = [];
                const notFound: CsvProposalRow[] = [];

                parsedCsv.forEach(csvRow => {
                    const key = `${csvRow.precodice}---${csvRow.code}`;
                    const match = dataMap.get(key);
                    if (match) {
                        found.push(match);
                    } else {
                        notFound.push(csvRow);
                    }
                });
                
                setFoundItems(found);
                setNotFoundItems(notFound);
                setStatus('ready');

            } catch (err) {
                console.error(err);
                setError("Errore durante la lettura del file. Assicurati che sia un file CSV o XLSX valido.");
                setStatus('failed');
            }
        };
        reader.onerror = () => {
             setError('Impossibile leggere il file.');
             setStatus('failed');
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    };
    
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        handleFileChange(e.dataTransfer.files);
    }, [fullItemData]);

    const handleGenerateProposal = () => {
        if (foundItems.length > 0) {
            generateProposal(foundItems);
            navigate('/proposal');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Genera Proposta da CSV</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Carica un file CSV/XLSX con colonne 'PRECODICE' e 'CODICE' per creare una proposta d'ordine mirata.</p>
                </div>
                
                <div 
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                    onDrop={onDrop}
                    className={`mt-6 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    onClick={() => document.getElementById('csv-proposal-upload')?.click()}
                >
                    <input id="csv-proposal-upload" type="file" className="hidden" accept=".csv,.xlsx" onChange={(e) => handleFileChange(e.target.files)} />
                    <Icons.Excel className="mx-auto h-12 w-12 text-gray-400"/>
                    {fileName ? (
                        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{fileName}</p>
                    ) : (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Trascina qui il file o <span className="font-semibold text-blue-600">cerca sul computer</span></p>
                    )}
                </div>
            </Card>

            {status === 'parsing' && <Card><div className="flex items-center"><Icons.Spinner className="animate-spin mr-2"/>Analisi del file...</div></Card>}
            {status === 'matching' && <Card><div className="flex items-center"><Icons.Spinner className="animate-spin mr-2"/>Incrocio dati in corso...</div></Card>}
            
            {status === 'failed' && (
                <Card>
                    <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20">
                        <div className="flex">
                            <div className="flex-shrink-0"><Icons.Alert className="h-5 w-5 text-red-400" /></div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Errore</h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</div>
                                <button onClick={resetState} className="mt-4 text-sm font-medium text-blue-600 hover:underline">Riprova</button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {status === 'ready' && (
                <Card>
                     <div className="text-center">
                        <Icons.Check className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">Analisi Completata</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                           Trovati <strong>{foundItems.length}</strong> articoli su <strong>{csvData.length}</strong> righe del file.
                        </p>
                        {notFoundItems.length > 0 && (
                            <div className="mt-4 text-xs text-left p-2 bg-gray-100 dark:bg-gray-800 rounded max-h-32 overflow-y-auto">
                                <p className="font-semibold">Articoli non trovati:</p>
                                <ul className="list-disc pl-4">
                                    {notFoundItems.map((item, i) => <li key={i}>{item.precodice} - {item.code}</li>)}
                                </ul>
                            </div>
                        )}
                        <div className="mt-6 flex justify-center gap-4">
                            <button onClick={resetState} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Carica un altro file</button>
                            <button 
                                onClick={handleGenerateProposal} 
                                disabled={foundItems.length === 0}
                                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Icons.Cart className="w-5 h-5 mr-2"/> Genera Proposta ({foundItems.length})
                            </button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default CsvProposalPage;