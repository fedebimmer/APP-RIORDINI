
import React, { useState, useEffect } from 'react';
import { updatePolicy, savePolicy, setActivePolicy, getAllPolicies } from '../services/apiService';
import { PolicyParams, RunRateMethod, RoundingStrategy } from '../types';
import Card from '../components/ui/Card';
import { Icons } from '../components/icons';
import Tooltip from '../components/ui/Tooltip';
import { useData } from '../contexts/DataContext';

const SettingsPage: React.FC = () => {
    const { refreshData } = useData();
    const [currentPolicy, setCurrentPolicy] = useState<PolicyParams | null>(null);
    const [allPolicies, setAllPolicies] = useState<PolicyParams[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const loadPolicies = async () => {
        setLoading(true);
        try {
            const all = await getAllPolicies();
            setAllPolicies(all);
            const active = all.find(p => p.is_active);
            setCurrentPolicy(active ? { ...active } : null);
        } catch (error) {
            console.error("Failed to load policies", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicies();
    }, []);
    
    const handleInputChange = (field: keyof PolicyParams, value: any) => {
        if (!currentPolicy) return;
        setCurrentPolicy({ ...currentPolicy, [field]: value });
    };

    const handleSaveAsNew = async () => {
        if (!currentPolicy) return;
        setIsSaving(true);
        const newPolicyData = { ...currentPolicy, name: `${currentPolicy.name} (Copia)`, is_active: false };
        const newPolicy = await savePolicy(newPolicyData);
        setAllPolicies([...allPolicies, newPolicy]);
        setCurrentPolicy(newPolicy);
        setIsSaving(false);
        alert("Nuovo set di parametri salvato!");
    };

    const handleUpdate = async () => {
        if (!currentPolicy) return;
        setIsSaving(true);
        const updatedPolicy = await updatePolicy(currentPolicy);
        const updatedPolicies = allPolicies.map(p => p.id === updatedPolicy.id ? updatedPolicy : p);
        setAllPolicies(updatedPolicies);
        setIsSaving(false);
        alert("Set di parametri aggiornato!");
    };

    const handleSetActive = async () => {
        if (!currentPolicy || currentPolicy.is_active) return;
        setIsSaving(true);
        await setActivePolicy(currentPolicy.id);
        await refreshData(); // Ricalcola tutto con la nuova policy
        await loadPolicies(); // Ricarica le policy per aggiornare lo stato (es. '(Attivo)')
        setIsSaving(false);
        alert("Set di parametri impostato come attivo! I dati sono stati ricalcolati.");
    };

    if (loading || !currentPolicy) {
        return <div className="flex justify-center items-center h-full"><Icons.Spinner className="w-8 h-8 animate-spin"/></div>;
    }

    const isDirty = JSON.stringify(currentPolicy) !== JSON.stringify(allPolicies.find(p => p.id === currentPolicy.id));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                     <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Parametri di Calcolo</h2>
                     <div>
                        <select
                            value={currentPolicy.id}
                            onChange={(e) => setCurrentPolicy(allPolicies.find(p => p.id === e.target.value) || null)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                        >
                            {allPolicies.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.is_active ? '(Attivo)' : ''}
                                </option>
                            ))}
                        </select>
                     </div>
                </div>
               
                <div className="space-y-8">
                    <div>
                         <h3 className="text-lg font-medium text-gray-900 dark:text-white">Info Set</h3>
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Nome del Set" tooltip="Nome identificativo per questo set di parametri.">
                                <input type="text" value={currentPolicy.name} onChange={e => handleInputChange('name', e.target.value)} className="form-input"/>
                            </FormField>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Parametri Previsione</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Metodo Run Rate" tooltip="Metodo per calcolare la vendita media giornaliera.">
                                <select value={currentPolicy.run_rate_method} onChange={e => handleInputChange('run_rate_method', e.target.value)} className="form-input">
                                    <option value={RunRateMethod.SIMPLE_AVG}>Media Semplice</option>
                                    <option value={RunRateMethod.WEIGHTED_AVG}>Media Ponderata</option>
                                    <option value={RunRateMethod.EXP_SMOOTHING}>Smorzamento Esponenziale</option>
                                </select>
                            </FormField>
                             <FormField label="Giorni Ponderazione Recente" tooltip="Periodo recente (in giorni) a cui dare più peso nel calcolo ponderato.">
                                <input type="number" value={currentPolicy.recent_weight_days} onChange={e => handleInputChange('recent_weight_days', parseInt(e.target.value))} className="form-input"/>
                            </FormField>
                             <FormField label="Fattore Peso Recente" tooltip="Quanto peso in più dare al periodo recente (es. 1.5 = 50% in più).">
                                <input type="number" step="0.1" value={currentPolicy.recent_weight_factor} onChange={e => handleInputChange('recent_weight_factor', parseFloat(e.target.value))} className="form-input"/>
                            </FormField>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Parametri Policy Riordino</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Giorni Scorta di Sicurezza" tooltip="Quanti giorni di vendita coprire come scorta minima.">
                                <input type="number" value={currentPolicy.safety_stock_days} onChange={e => handleInputChange('safety_stock_days', parseInt(e.target.value))} className="form-input"/>
                            </FormField>
                            <FormField label="Lead Time di Default (giorni)" tooltip="Tempo di consegna predefinito se non specificato sull'articolo.">
                                <input type="number" value={currentPolicy.lead_time_default_days} onChange={e => handleInputChange('lead_time_default_days', parseInt(e.target.value))} className="form-input"/>
                            </FormField>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Regole "Poco Movimentati"</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField label="Soglia Quantità Venduta (365gg)" tooltip="N° pezzi max venduti in un anno per essere considerato 'poco movimentato'.">
                                <input type="number" value={currentPolicy.slow_mover_qty_threshold} onChange={e => handleInputChange('slow_mover_qty_threshold', parseInt(e.target.value))} className="form-input"/>
                            </FormField>
                            <FormField label="Giorni da Ultima Vendita" tooltip="N° di giorni minimi dall'ultima vendita per essere 'poco movimentato'.">
                                <input type="number" value={currentPolicy.slow_mover_days_since_last_sale} onChange={e => handleInputChange('slow_mover_days_since_last_sale', parseInt(e.target.value))} className="form-input"/>
                            </FormField>
                            <FormField label="Soglia Minima Fatturato (€)" tooltip="Valore venduto annuo minimo. Sotto questa soglia, un articolo può essere flaggato. (0 per disabilitare)">
                                <input type="number" value={currentPolicy.min_revenue_threshold} onChange={e => handleInputChange('min_revenue_threshold', parseFloat(e.target.value))} className="form-input"/>
                            </FormField>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-end gap-3">
                    <button onClick={handleSaveAsNew} disabled={isSaving} className="btn-secondary disabled:opacity-50">
                        <Icons.Add className="w-4 h-4 mr-2"/> Salva come Nuovo Set
                    </button>
                    <button onClick={handleUpdate} disabled={!isDirty || isSaving} className="btn-secondary disabled:opacity-50">
                        <Icons.Save className="w-4 h-4 mr-2"/> Aggiorna Modifiche
                    </button>
                    <button onClick={handleSetActive} disabled={currentPolicy.is_active || isSaving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                        <Icons.Check className="w-4 h-4 mr-2"/> Imposta come Attivo
                    </button>
                </div>
            </Card>
        </div>
    );
};

interface FormFieldProps {
    label: string;
    tooltip: string;
    children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, tooltip, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            <div className="flex items-center">
                <span>{label}</span>
                <Tooltip text={tooltip}>
                    <Icons.Info className="w-4 h-4 ml-2 text-gray-400"/>
                </Tooltip>
            </div>
        </label>
        {React.cloneElement(children as React.ReactElement<any>, { className: "mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" })}
    </div>
);


export default SettingsPage;
