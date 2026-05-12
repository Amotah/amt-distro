import { useEffect, useState } from 'react';
import {
  CONTRACT_WORKSPACE_UPDATED_EVENT,
  getStoredContractWorkspaceSummary,
  type ContractWorkspaceSummary,
} from '../utils/contract-workspace';

function readCurrentSummary() {
  if (typeof window === 'undefined') {
    return null;
  }

  const storageKey = window.sessionStorage.getItem('user_id');
  return getStoredContractWorkspaceSummary(storageKey);
}

export function useContractStatusSummary() {
  const [summary, setSummary] = useState<ContractWorkspaceSummary | null>(() => readCurrentSummary());

  useEffect(() => {
    const updateSummary = () => {
      setSummary(readCurrentSummary());
    };

    updateSummary();
    window.addEventListener(CONTRACT_WORKSPACE_UPDATED_EVENT, updateSummary as EventListener);
    window.addEventListener('storage', updateSummary);

    return () => {
      window.removeEventListener(CONTRACT_WORKSPACE_UPDATED_EVENT, updateSummary as EventListener);
      window.removeEventListener('storage', updateSummary);
    };
  }, []);

  return summary;
}
