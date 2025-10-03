
import { User, Role, FullItemData, Item, SalesSnapshot, ReplenishmentCalculation, PolicyParams, RunRateMethod, RoundingStrategy, ImportRow, ArchivedProposal, ProposalLine } from '../types.ts';
import { addDays, differenceInDays } from 'date-fns';

// --- MOCK USERS ---
const MOCK_USERS: User[] = [
  { id: '1', email: 'admin@arauto.it', role: 'Admin' },
  { id: '2', email: 'op@arauto.it', role: 'Operativo' },
];

// --- IN-MEMORY DATABASE ---
let MOCK_DB = {
    items: [] as Item[],
    sales: [] as SalesSnapshot[],
    policies: [
        {
          id: '1',
          name: 'Default 2025Q3',
          is_active: true,
          run_rate_method: RunRateMethod.WEIGHTED_AVG,
          avg_window_days: 365,
          recent_weight_days: 90,
          recent_weight_factor: 1.5,
          lead_time_default_days: 2,
          safety_stock_days: 7,
          slow_mover_qty_threshold: 3,
          slow_mover_days_since_last_sale: 120,
          min_revenue_threshold: 50,
          rounding_strategy: RoundingStrategy.TO_MULTIPLE
        }
    ] as PolicyParams[],
    archivedProposals: [] as ArchivedProposal[],
};


// --- CALCULATION LOGIC ---
export const calculateReplenishment = (item: Item, sale: SalesSnapshot, policy: PolicyParams): ReplenishmentCalculation => {
    const today = new Date();

    // Ensure negative values from import don't affect calculations
    const effective_qty_sold_365 = Math.max(0, sale.qty_sold_365);
    const effective_value_sold_365 = Math.max(0, sale.value_sold_365);


    // 1. Daily Run Rate
    let daily_run_rate = effective_qty_sold_365 > 0 ? effective_qty_sold_365 / 365 : 0;

    // 2. Safety Stock
    const safety_stock = Math.ceil(daily_run_rate * policy.safety_stock_days);

    // 3. Lead Time Cover
    const lead_time_cover_qty = Math.ceil(daily_run_rate * (item.lead_time_days ?? policy.lead_time_default_days));
    
    // 4. Forecast 60d
    const forecast_60d = Math.ceil(daily_run_rate * 60);

    // 5. Available Stock
    const available = Math.max(0, item.current_stock - item.reserved_qty);

    // 6. Recommended Order Qty
    let recommended_order_qty = 0;
    if (item.reorder_blocked) {
        recommended_order_qty = 0;
    } else {
        const target_stock = lead_time_cover_qty + safety_stock + forecast_60d;
        const gap = target_stock - available;

        if (gap > 0) {
            let qty = 0;
            const gapOrMin = Math.max(gap, item.min_order_qty);
            
            if(policy.rounding_strategy === RoundingStrategy.TO_MIN_THEN_MULTIPLE) {
                qty = Math.max(item.min_order_qty, Math.ceil(gap / item.order_multiple) * item.order_multiple)
            } else { // TO_MULTIPLE
                 if (gapOrMin % item.order_multiple !== 0) {
                    qty = Math.ceil(gapOrMin / item.order_multiple) * item.order_multiple;
                } else {
                    qty = gapOrMin;
                }
            }
            recommended_order_qty = qty;
        }
    }
    
    // 7. Slow Mover Flag
    let slow_mover_flag = false;
    let slow_mover_reason = '';
    const days_since_last_sale = sale.last_sale_date ? differenceInDays(today, new Date(sale.last_sale_date)) : 9999;

    const cond1 = effective_qty_sold_365 < policy.slow_mover_qty_threshold;
    const cond2 = days_since_last_sale > policy.slow_mover_days_since_last_sale;
    const cond3 = policy.min_revenue_threshold > 0 ? effective_value_sold_365 < policy.min_revenue_threshold : false;

    if (cond1 && cond2) {
        slow_mover_flag = true;
        let reasons = [];
        if (cond1) reasons.push(`vendute ${sale.qty_sold_365}/${policy.slow_mover_qty_threshold} u.`);
        if (cond2) reasons.push(`ultima vendita ${days_since_last_sale}/${policy.slow_mover_days_since_last_sale}gg fa`);
        if (cond3) reasons.push(`valore < ${policy.min_revenue_threshold}€`);
        slow_mover_reason = `Poco movimentato: ${reasons.join(', ')}.`;
        recommended_order_qty = 0;
    }
    
    return {
        id: `calc-${item.id}`,
        itemId: item.id,
        daily_run_rate,
        forecast_60d,
        safety_stock,
        lead_time_cover_qty,
        recommended_order_qty,
        slow_mover_flag,
        slow_mover_reason,
        calc_date: today.toISOString(),
    };
};

// --- API FUNCTIONS ---
export const apiLogin = (email: string, pass: string): Promise<User | null> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const user = MOCK_USERS.find(u => u.email === email);
      resolve(user || null);
    }, 500);
  });
};

export const getActivePolicy = (): Promise<PolicyParams> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const activePolicy = MOCK_DB.policies.find(p => p.is_active);
            if (!activePolicy) throw new Error("No active policy found");
            resolve(activePolicy);
        }, 100);
    });
};

export const getAllPolicies = (): Promise<PolicyParams[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([...MOCK_DB.policies]);
        }, 100);
    });
}

export const savePolicy = (policy: Omit<PolicyParams, 'id' | 'is_active'> & {is_active: boolean}): Promise<PolicyParams> => {
     return new Promise(resolve => {
        setTimeout(() => {
            const newPolicy = { ...policy, id: `policy-${Date.now()}` };
            MOCK_DB.policies.push(newPolicy);
            resolve(newPolicy);
        }, 300);
    });
}

export const updatePolicy = (policy: PolicyParams): Promise<PolicyParams> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = MOCK_DB.policies.findIndex(p => p.id === policy.id);
            if (index > -1) {
                MOCK_DB.policies[index] = policy;
                resolve(policy);
            } else {
                reject(new Error("Policy not found"));
            }
        }, 300);
    });
};

export const setActivePolicy = (policyId: string): Promise<void> => {
    return new Promise(resolve => {
        setTimeout(() => {
            MOCK_DB.policies.forEach(p => {
                p.is_active = p.id === policyId;
            });
            resolve();
        }, 300);
    });
}


export const getFullItemData = async (): Promise<FullItemData[]> => {
    const activePolicy = await getActivePolicy();
    
    return new Promise(resolve => {
        setTimeout(() => {
            if (MOCK_DB.items.length === 0) {
                return resolve([]);
            }
            const fullData = MOCK_DB.items.map(item => {
                const sale = MOCK_DB.sales.find(s => s.itemId === item.id);
                if (!sale) return null;

                const calculation = calculateReplenishment(item, sale, activePolicy);
                return { ...item, ...sale, calculation };
            }).filter((item): item is FullItemData => item !== null);
            
            resolve(fullData);
        }, 500);
    });
};

export const apiImportData = (rows: ImportRow[]): Promise<{ success: boolean; message: string; imported: number; failed: number }> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const today = new Date().toISOString().split('T')[0];
            let importedCount = 0;

            rows.forEach((row, index) => {
                // Find item based on the composite key of precodice and code
                let item = MOCK_DB.items.find(i => i.code === row.code && i.precodice === row.precodice);
                
                if (!item) {
                    // Create new item with default values
                    item = {
                        id: `item-${Date.now()}-${index}`,
                        code: row.code,
                        precodice: row.precodice,
                        description: row.description || `Nuovo Articolo ${row.code}`,
                        supplier: 'Sconosciuto',
                        lead_time_days: 2,
                        min_order_qty: 1,
                        order_multiple: 1,
                        current_stock: 0,
                        reserved_qty: 0,
                        reorder_blocked: false,
                        ubicazione: row.ubicazione || 'N/D',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    MOCK_DB.items.push(item);
                } else {
                    // Update existing item with imported data
                    item.precodice = row.precodice ?? item.precodice;
                    item.ubicazione = row.ubicazione ?? item.ubicazione;
                    item.description = row.description ?? item.description;
                    item.updatedAt = new Date().toISOString();
                }

                const import_warnings: string[] = [];
                if (row.qty_sold_365 < 0) {
                    import_warnings.push(`'QUANTITA VENDUTA' importata con valore negativo: ${row.qty_sold_365}`);
                }
                if (row.value_sold_365 < 0) {
                    import_warnings.push(`'VALORE VENDUTO' importato con valore negativo: ${row.value_sold_365}`);
                }

                // Create or update sales snapshot (replaces old one)
                const existingSaleIndex = MOCK_DB.sales.findIndex(s => s.itemId === item!.id);
                const newSale: SalesSnapshot = {
                    id: `sale-${item.id}`,
                    itemId: item.id,
                    qty_sold_365: row.qty_sold_365,
                    value_sold_365: row.value_sold_365,
                    last_sale_date: row.last_sale_date,
                    last_purchase_date: row.last_purchase_date,
                    source_file_id: `import-${Date.now()}`,
                    as_of_date: today,
                    import_warnings: import_warnings.length > 0 ? import_warnings : undefined,
                };
                
                if (existingSaleIndex > -1) {
                    MOCK_DB.sales[existingSaleIndex] = newSale;
                } else {
                    MOCK_DB.sales.push(newSale);
                }
                importedCount++;
            });

             resolve({
                success: true,
                message: `Import completato: ${importedCount} righe processate.`,
                imported: importedCount,
                failed: 0,
            });
        }, 1500);
    });
};

export const apiAnalyzeCodes = async (codes: string[]): Promise<FullItemData[]> => {
    const activePolicy = await getActivePolicy();
    const uniqueCodes = [...new Set(codes.map(c => c.trim().toLowerCase()))];
    
    return new Promise(resolve => {
        setTimeout(() => {
            const foundItems = MOCK_DB.items.filter(item => uniqueCodes.includes(item.code.toLowerCase()));

            const fullData = foundItems.map(item => {
                const sale = MOCK_DB.sales.find(s => s.itemId === item.id);
                if (!sale) return null;
                const calculation = calculateReplenishment(item, sale, activePolicy);
                return { ...item, ...sale, calculation };
            }).filter((item): item is FullItemData => item !== null);
            
            resolve(fullData);
        }, 1000);
    });
}

// --- New History API Functions ---

export const apiArchiveProposal = (proposalLines: ProposalLine[], user: User): Promise<ArchivedProposal> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const newArchivedProposal: ArchivedProposal = {
                id: `archive-${Date.now()}`,
                proposal_date: new Date().toISOString(),
                created_by: user.email,
                items_count: proposalLines.length,
                lines: proposalLines.map(line => ({
                    itemId: line.itemData.id,
                    code: line.itemData.code,
                    precodice: line.itemData.precodice,
                    description: line.itemData.description,
                    supplier: line.itemData.supplier,
                    orderedQty: line.modifiedQty,
                })),
            };
            MOCK_DB.archivedProposals.unshift(newArchivedProposal); // Add to the beginning
            resolve(newArchivedProposal);
        }, 500);
    });
};

export const apiGetArchivedProposals = (): Promise<ArchivedProposal[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([...MOCK_DB.archivedProposals]);
        }, 500);
    });
};
