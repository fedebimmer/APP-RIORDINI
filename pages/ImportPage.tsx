import React, { useState, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Icons } from '../components/icons';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { ImportRow } from '../types';

// Dichiarazione per TypeScript per riconoscere la libreria XLSX caricata globalmente
declare var XLSX: any;

type ImportStatus = 'idle' | 'parsing' | 'validated' | 'validatedWithWarnings' | 'processing' | 'completed' | 'failed';

const requiredHeaders = {
    'codice': 'code',
    'quantita venduta': 'qty_sold_365',
    'valore venduto': 'value_sold_365',
    'data ultima vendita': 'last_sale_date',
    'data ultimo acquisto': 'last_purchase_date',
};

const optionalHeaders = {
    'precodice': 'precodice',
    'descrizione': 'description',
    'ubicazione': 'ubicazione',
};

const allHeaders = { ...requiredHeaders, ...optionalHeaders };


const excelDateToJSDate = (serial: number) => {
   if (typeof serial !== 'number' || isNaN(serial)) return null;
   const utc_days  = Math.floor(serial - 25569);
   const utc_value = utc_days * 86400;                                        
   const date_info = new Date(utc_value * 1000);
   const fractional_day = serial - Math.floor(serial) + 0.0000001;
   let total_seconds = Math.floor(86400 * fractional_day);
   const seconds = total_seconds % 60;
   total_seconds -= seconds;
   const hours = Math.floor(total_seconds / (60 * 60));
   const minutes = Math.floor(total_seconds / 60) % 60;
   return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

const formatDate = (date: Date | null) => {
    if (!date) return undefined;
    // Formato YYYY-MM-DD
    return date.toISOString().split('T')[0];
}

const ImportPage: React.FC = () => {
    const { importData } = useData();
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<ImportStatus>('idle');
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [parsedData, setParsedData] = useState<ImportRow[]>([]);
    const [dragOver, setDragOver] = useState(false);
    const [hasPrecodice, setHasPrecodice] = useState(false);
    const [hasDescrizione, setHasDescrizione] = useState(false);
    const [hasUbicazione, setHasUbicazione] = useState(false);

    const resetState = () => {
        setFile(null);
        setStatus('idle');
        setErrors([]);
        setWarnings([]);
        setParsedData([]);
        setHasPrecodice(false);
        setHasDescrizione(false);
        setHasUbicazione(false);
    };

    const parseAndValidateFile = (fileToParse: File) => {
        setStatus('parsing');
        setErrors([]);
        setWarnings([]);
        setParsedData([]);
        setHasPrecodice(false);
        setHasDescrizione(false);
        setHasUbicazione(false);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target!.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                // Header validation
                const headers = Object.keys(json[0] || {}).map(h => h.toLowerCase());
                const missingHeaders = Object.keys(requiredHeaders).filter(rh => !headers.includes(rh));
                if(missingHeaders.length > 0) {
                    setErrors([`Intestazioni di colonna mancanti: ${missingHeaders.join(', ')}`]);
                    setStatus('failed');
                    return;
                }
                
                if (headers.includes('precodice')) setHasPrecodice(true);
                if (headers.includes('descrizione')) setHasDescrizione(true);
                if (headers.includes('ubicazione')) setHasUbicazione(true);

                const blockingErrors: string[] = [];
                const rowLevelWarnings: string[] = [];
                const dataToImport: ImportRow[] = [];
                const itemPositions = new Map<string, number[]>();

                json.forEach((row, index) => {
                    const mappedRow: any = {};
                    for (const key in row) {
                        const lowerKey = key.toLowerCase();
                        if (allHeaders[lowerKey as keyof typeof allHeaders]) {
                            mappedRow[allHeaders[lowerKey as keyof typeof allHeaders]] = row[key];
                        }
                    }

                    const { code, qty_sold_365, value_sold_365, last_sale_date, last_purchase_date, precodice, description, ubicazione } = mappedRow;
                    const rowIndex = index + 2;

                    if (!code) {
                        blockingErrors.push(`Riga ${rowIndex}: il 'CODICE' è obbligatorio.`);
                        return;
                    }
                    
                    const codeStr = String(code).trim();
                    const precodiceStr = String(precodice || '').trim();
                    const compositeKey = `${precodiceStr}---${codeStr}`;

                    if (!itemPositions.has(compositeKey)) {
                        itemPositions.set(compositeKey, []);
                    }
                    itemPositions.get(compositeKey)!.push(rowIndex);
                    
                    let qty = Number(qty_sold_365);
                    let value = Number(value_sold_365);

                    if (isNaN(qty)) {
                        blockingErrors.push(`Riga ${rowIndex} (Codice: ${codeStr}): 'QUANTITA VENDUTA' non è un numero. Valore: ${qty_sold_365}`);
                        qty = 0; // default value for processing
                    } else if (qty < 0) {
                        rowLevelWarnings.push(`Riga ${rowIndex} (Codice: ${codeStr}): 'QUANTITA VENDUTA' non è un numero valido (>= 0). Valore: ${qty_sold_365}`);
                    }

                    if (isNaN(value)) {
                         blockingErrors.push(`Riga ${rowIndex} (Codice: ${codeStr}): 'VALORE VENDUTO' non è un numero. Valore: ${value_sold_365}`);
                         value = 0; // default value for processing
                    } else if (value < 0) {
                        rowLevelWarnings.push(`Riga ${rowIndex} (Codice: ${codeStr}): 'VALORE VENDUTO' non è un numero valido (>= 0). Valore: ${value_sold_365}`);
                    }
                    
                    dataToImport.push({
                        code: codeStr,
                        precodice: precodiceStr || undefined,
                        description: description ? String(description).trim() : undefined,
                        qty_sold_365: qty,
                        value_sold_365: value,
                        last_sale_date: formatDate(excelDateToJSDate(last_sale_date)),
                        last_purchase_date: formatDate(excelDateToJSDate(last_purchase_date)),
                        ubicazione: ubicazione ? String(ubicazione).trim() : undefined,
                    });
                });

                itemPositions.forEach((rows, key) => {
                    if (rows.length > 1) {
                        const [precodice, code] = key.split('---');
                        const identifier = precodice ? `la combinazione PRECODICE '${precodice}' e CODICE '${code}'` : `il 'CODICE' '${code}'`;
                        blockingErrors.push(`${identifier} è duplicata all'interno del file. Si trova nelle righe: ${rows.join(', ')}.`);
                    }
                });
                
                const displayAndSet = (arr: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
                    const limited = arr.slice(0, 10);
                    if (arr.length > 10) {
                        limited.push(`... e altri ${arr.length - 10} ${arr === blockingErrors ? 'errori' : 'avvisi'}.`);
                    }
                    setter(limited);
                };

                if (blockingErrors.length > 0) {
                    displayAndSet(blockingErrors, setErrors);
                    setStatus('failed');
                } else if (rowLevelWarnings.length > 0) {
                    displayAndSet(rowLevelWarnings, setWarnings);
                    setParsedData(dataToImport);
                    setStatus('validatedWithWarnings');
                } else {
                    setParsedData(dataToImport);
                    setStatus('validated');
                }

            } catch (err) {
                setErrors(['Errore durante la lettura del file. Assicurati che sia un file XLSX valido.']);
                setStatus('failed');
            }
        };
        reader.onerror = () => {
             setErrors(['Impossibile leggere il file.']);
             setStatus('failed');
        };
        reader.readAsArrayBuffer(fileToParse);
    };

    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            resetState();
            setFile(files[0]);
            parseAndValidateFile(files[0]);
        }
    };
    
    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(false);
        handleFileChange(e.dataTransfer.files);
    }, []);

    const handleConfirmImport = async () => {
        if (parsedData.length === 0) return;
        setStatus('processing');
        const result = await importData(parsedData);
        if (result.success) {
            setStatus('completed');
        } else {
            setErrors([result.message]);
            setStatus('failed');
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Import vendite 365 gg (XLSX)</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Trascina un file XLSX o clicca per selezionarlo.</p>
                </div>
                
                <div 
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                    onDrop={onDrop}
                    className={`mt-6 p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input id="file-upload" type="file" className="hidden" accept=".xlsx" onChange={(e) => handleFileChange(e.target.files)} />
                    <Icons.Excel className="mx-auto h-12 w-12 text-gray-400"/>
                    {file ? (
                        <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                    ) : (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Trascina qui il file o <span className="font-semibold text-blue-600">cerca sul computer</span></p>
                    )}
                </div>
                <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Colonne richieste (case-insensitive):</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Object.keys(requiredHeaders).map(col => <Badge key={col}>{col.toUpperCase()}</Badge>)}
                    </div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">Colonne opzionali:</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {Object.keys(optionalHeaders).map(col => <Badge key={col} color="blue">{col.toUpperCase()}</Badge>)}
                    </div>
                </div>
            </Card>

            {status === 'parsing' && <Card><div className="flex items-center"><Icons.Spinner className="animate-spin mr-2"/>Analisi del file...</div></Card>}

            {status === 'failed' && errors.length > 0 && (
                <Card>
                    <div className="p-4 rounded-md bg-red-50 dark:bg-red-900/20">
                        <div className="flex">
                            <div className="flex-shrink-0"><Icons.Alert className="h-5 w-5 text-red-400" /></div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Errori di Validazione (Bloccanti)</h3>
                                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                                    <ul className="list-disc pl-5 space-y-1">
                                        {errors.map((e, i) => <li key={i}>{e}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {status === 'validatedWithWarnings' && (
                 <Card>
                    <div className="p-4 rounded-md bg-yellow-50 dark:bg-yellow-900/20">
                        <div className="flex">
                            <div className="flex-shrink-0"><Icons.Alert className="h-5 w-5 text-yellow-400" /></div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Avvisi di Validazione</h3>
                                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                                    Il file è strutturalmente corretto ma contiene dati anomali. Puoi importarlo ugualmente, ma i valori segnalati verranno evidenziati.
                                </p>
                                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                                    <ul className="list-disc pl-5 space-y-1">
                                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="mt-6 text-center">
                        <button onClick={handleConfirmImport} className="flex items-center mx-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700">
                            <Icons.Alert className="w-5 h-5 mr-2"/> Forza Importazione e Procedi
                        </button>
                    </div>
                </Card>
            )}

            {status === 'validated' && (
                <Card>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Anteprima Dati</h3>
                    <p className="text-sm text-green-700 dark:text-green-400 my-2">File valido! Trovate {parsedData.length} righe. Controlla l'anteprima e conferma.</p>
                    <div className="overflow-x-auto max-h-60 border rounded-md">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                                <tr>
                                    {hasPrecodice && <th className="px-4 py-2 text-left font-medium">precodice</th>}
                                    <th className="px-4 py-2 text-left font-medium">code</th>
                                    {hasDescrizione && <th className="px-4 py-2 text-left font-medium">descrizione</th>}
                                    <th className="px-4 py-2 text-left font-medium">qty_sold_365</th>
                                    <th className="px-4 py-2 text-left font-medium">value_sold_365</th>
                                    <th className="px-4 py-2 text-left font-medium">last_sale_date</th>
                                    <th className="px-4 py-2 text-left font-medium">last_purchase_date</th>
                                    {hasUbicazione && <th className="px-4 py-2 text-left font-medium">ubicazione</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {parsedData.slice(0, 5).map((row, i) => (
                                    <tr key={i}>
                                        {hasPrecodice && <td className="px-4 py-2">{row.precodice || 'N/D'}</td>}
                                        <td className="px-4 py-2">{row.code}</td>
                                        {hasDescrizione && <td className="px-4 py-2 truncate max-w-xs">{row.description || 'N/D'}</td>}
                                        <td className="px-4 py-2">{row.qty_sold_365}</td>
                                        <td className="px-4 py-2">{row.value_sold_365.toFixed(2)}</td>
                                        <td className="px-4 py-2">{row.last_sale_date || 'N/D'}</td>
                                        <td className="px-4 py-2">{row.last_purchase_date || 'N/D'}</td>
                                        {hasUbicazione && <td className="px-4 py-2">{row.ubicazione || 'N/D'}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-6 text-center">
                        <button onClick={handleConfirmImport} className="flex items-center mx-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            <Icons.Check className="w-5 h-5 mr-2"/> Conferma e Importa {parsedData.length} Righe
                        </button>
                    </div>
                </Card>
            )}

            {status === 'processing' && (
                <Card>
                    <div className="flex items-center text-blue-600 dark:text-blue-400">
                        <Icons.Spinner className="w-5 h-5 mr-3 animate-spin" />
                        <p>Importazione e ricalcolo in corso... Potrebbe richiedere qualche secondo.</p>
                    </div>
                </Card>
            )}

             {status === 'completed' && (
                <Card>
                    <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 text-center">
                        {/* Fix: Changed Icons.CheckCircle to Icons.Check */}
                        <Icons.Check className="mx-auto h-12 w-12 text-green-400" />
                        <h3 className="mt-2 text-lg font-medium text-green-800 dark:text-green-300">Importazione Completata!</h3>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-400">{parsedData.length} righe sono state importate e i calcoli sono stati aggiornati.</p>
                        <div className="mt-4">
                             <button onClick={resetState} className="flex items-center mx-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">Importa un altro file</button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ImportPage;