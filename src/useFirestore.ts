import { useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, setDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useAuth } from './AuthContext';
import { CompanyConfig, Entry, Vehicle, Client } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Not throwing here to prevent the app from completely crashing if a silent listener fails.
  // throw new Error(JSON.stringify(errInfo));
}


// Assuming config is a single document for the user
export function useAppFirestore() {
  const { user } = useAuth();
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setConfig(null);
      setEntries([]);
      setVehicles([]);
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const configUnsub = onSnapshot(doc(db, `users/${user.uid}/config`, 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data() as CompanyConfig);
      } else {
        setConfig({
          name: 'Minha Empresa Ltda',
          cnpj: '00.000.000/0001-00',
          address: 'Rua das Flores, 123 - Centro, Cidade - UF',
          phone: '(00) 0000-0000',
          logoUrl: '',
          layout: 'top',
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/config/main`);
      // Fail-safe to unblock UI
      setConfig({
        name: 'Minha Empresa Ltda',
        cnpj: '00.000.000/0001-00',
        address: 'Erro ao carregar dados. Verifique permissões.',
        phone: '(00) 0000-0000',
        logoUrl: '',
        layout: 'top',
      });
    });

    const entriesUnsub = onSnapshot(query(collection(db, `users/${user.uid}/entries`)), (snap) => {
      const data: Entry[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Entry));
      // Sort by createdAt descending
      data.sort((a, b) => {
        const da = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt;
        const db = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt;
        return db - da; 
      });
      setEntries(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/entries`));

    const vehiclesUnsub = onSnapshot(query(collection(db, `users/${user.uid}/vehicles`)), (snap) => {
      const data: Vehicle[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Vehicle));
      setVehicles(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/vehicles`));

    const clientsUnsub = onSnapshot(query(collection(db, `users/${user.uid}/clients`)), (snap) => {
      const data: Client[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as Client));
      setClients(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/clients`));

    setLoading(false);

    return () => {
      configUnsub();
      entriesUnsub();
      vehiclesUnsub();
      clientsUnsub();
    };
  }, [user]);

  // Actions
  const updateConfig = async (newConfig: CompanyConfig) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/config`, 'main'), {
        ...newConfig,
        userId: user.uid,
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/config/main`);
    }
  };

  const addEntry = async (entryData: Omit<Entry, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      const ref = doc(collection(db, `users/${user.uid}/entries`));
      await setDoc(ref, {
        ...entryData,
        userId: user.uid,
        createdAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/entries`);
    }
  };

  const updateEntry = async (id: string, entryData: Partial<Entry>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/entries`, id), entryData);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/entries/${id}`);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/entries`, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/entries/${id}`);
    }
  };

  const addVehicle = async (vehicle: Omit<Vehicle, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      const ref = doc(collection(db, `users/${user.uid}/vehicles`));
      await setDoc(ref, {
        ...vehicle,
        userId: user.uid,
        createdAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/vehicles`);
    }
  };

  const updateVehicle = async (id: string, vehicle: Partial<Vehicle>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/vehicles`, id), vehicle);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/vehicles/${id}`);
    }
  };

  const deleteVehicle = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/vehicles`, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/vehicles/${id}`);
    }
  };

  const addClient = async (client: Omit<Client, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      const ref = doc(collection(db, `users/${user.uid}/clients`));
      await setDoc(ref, {
        ...client,
        userId: user.uid,
        createdAt: Date.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `users/${user.uid}/clients`);
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, `users/${user.uid}/clients`, id), client);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}/clients/${id}`);
    }
  };

  const deleteClient = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/clients`, id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `users/${user.uid}/clients/${id}`);
    }
  };

  return {
    config,
    entries,
    vehicles,
    clients,
    loading,
    updateConfig,
    addEntry,
    updateEntry,
    deleteEntry,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addClient,
    updateClient,
    deleteClient
  };
}
