
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { FullItemData, ImportRow, ProposalLine, ArchivedProposal, User } from '../types';
import { getFullItemData, apiImportData, apiArchiveProposal, apiGetArchivedProposals } from '../services/apiService';

interface DataContextType {
  fullItemData: FullItemData[] | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  importData: (rows: ImportRow[]) => Promise<{ success: boolean; message: string; }>;
  // Proposal state and actions
  proposal: ProposalLine[];
  generateProposal: (items: FullItemData[]) => void;
  updateProposalLineQty: (itemId: string, qty: number) => void;
  removeProposalLine: (itemId: string) => void;
  clearProposal: () => void;
  // Archive state and actions
  approveAndArchiveAction: (user: User) => Promise<void>;
  archivedProposals: ArchivedProposal[];
  refreshArchivedProposals: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fullItemData, setFullItemData] = useState<FullItemData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<ProposalLine[]>([]);
  const [archivedProposals, setArchivedProposals] = useState<ArchivedProposal[]>([]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFullItemData();
      setFullItemData(data);
    } catch (error) {
      console.error("Failed to fetch full item data", error);
      setFullItemData([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  const importData = async (rows: ImportRow[]) => {
      setLoading(true);
      try {
        const result = await apiImportData(rows);
        if (result.success) {
            await refreshData(); // Refresh data after successful import
        }
        return { success: result.success, message: result.message };
      } catch(e: any) {
        return { success: false, message: e.message || "Errore sconosciuto durante l'import" };
      } finally {
        setLoading(false);
      }
  }

  // --- Proposal Actions ---
  const generateProposal = (items: FullItemData[]) => {
    const newProposalLines: ProposalLine[] = items.map(item => ({
      id: item.id,
      itemData: item,
      modifiedQty: item.calculation.recommended_order_qty,
    }));
    setProposal(newProposalLines);
  };

  const updateProposalLineQty = (itemId: string, qty: number) => {
    setProposal(currentProposal => 
      currentProposal.map(line => 
        line.id === itemId ? { ...line, modifiedQty: qty } : line
      )
    );
  };

  const removeProposalLine = (itemId: string) => {
    setProposal(currentProposal => 
      currentProposal.filter(line => line.id !== itemId)
    );
  };
  
  const clearProposal = () => {
    setProposal([]);
  };

  // --- Archive Actions ---
  const refreshArchivedProposals = useCallback(async () => {
    try {
        const archived = await apiGetArchivedProposals();
        setArchivedProposals(archived);
    } catch (error) {
        console.error("Failed to fetch archived proposals", error);
    }
  }, []);
  
  const approveAndArchiveAction = async (user: User) => {
    await apiArchiveProposal(proposal, user);
    clearProposal();
    await refreshArchivedProposals();
  };

  useEffect(() => {
    const initialLoad = async () => {
        setLoading(true);
        await refreshData();
        await refreshArchivedProposals();
        setLoading(false);
    };
    initialLoad();
  }, [refreshData, refreshArchivedProposals]);

  return (
    <DataContext.Provider value={{ 
      fullItemData, 
      loading, 
      refreshData, 
      importData,
      proposal,
      generateProposal,
      updateProposalLineQty,
      removeProposalLine,
      clearProposal,
      approveAndArchiveAction,
      archivedProposals,
      refreshArchivedProposals,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
