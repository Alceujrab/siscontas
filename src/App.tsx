import React, { useState, useEffect, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Settings, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  DollarSign, 
  Building2,
  Trash2,
  Menu,
  X,
  Truck,
  Download,
  Paperclip,
  FileText,
  Users,
  Filter,
  Edit,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { CompanyConfig, Entry, EntryType, LayoutMode, Attachment, Vehicle, Client } from './types';

import { useAppFirestore } from './useFirestore';
import { useAuth } from './AuthContext';

export default function App() {
  const { signOut } = useAuth();
  const {
    config,
    entries,
    vehicles,
    clients,
    loading,
    updateConfig,
    addEntry: dbAddEntry,
    updateEntry: dbUpdateEntry,
    deleteEntry: dbDeleteEntry,
    addVehicle: dbAddVehicle,
    updateVehicle: dbUpdateVehicle,
    deleteVehicle: dbDeleteVehicle,
    addClient: dbAddClient,
    updateClient: dbUpdateClient,
    deleteClient: dbDeleteClient
  } = useAppFirestore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'add' | 'vehicles' | 'clients' | 'settings'>('history');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const addEntry = async (entry: Omit<Entry, 'id' | 'createdAt'>) => {
    await dbAddEntry(entry);
    setActiveTab('dashboard');
  };

  const deleteEntry = async (id: string) => {
    if(confirm('Tem certeza que deseja excluir este lançamento?')) {
      await dbDeleteEntry(id);
      if (editingEntryId === id) setEditingEntryId(null);
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntryId(entry.id);
    setActiveTab('add');
  };

  if (loading || !config) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><span className="animate-pulse">Carregando dados...</span></div>;
  }

  // --- Components ---

  const HeaderInfo = () => (
    <div className="flex items-center gap-4 text-white">
      {config.logoUrl ? (
        <img src={config.logoUrl} alt="Logo" className="w-12 h-12 rounded-xl bg-white object-cover ring-2 ring-white/10" />
      ) : (
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center ring-2 ring-white/5">
          <Building2 className="text-white w-6 h-6" />
        </div>
      )}
      <div>
        <h1 className="font-semibold text-[16px] leading-tight tracking-tight">{config.name}</h1>
        <p className="text-[12px] text-slate-400 mt-0.5">{config.cnpj} • {config.phone}</p>
        <p className="text-[12px] text-slate-400">{config.address}</p>
      </div>
    </div>
  );

  const Navigation = ({ className = '', theme = 'dark' }: { className?: string, theme?: 'light' | 'dark' }) => {
    const activeClass = theme === 'dark' 
      ? 'bg-primary-light text-white font-semibold' 
      : 'bg-blue-50 text-blue-700 font-semibold';
    
    const inactiveClass = theme === 'dark'
      ? 'hover:bg-white/10 text-slate-300'
      : 'hover:bg-slate-50 text-slate-600';

    return (
      <nav className={`flex font-medium ${className} gap-1 px-2 md:px-0 py-2 md:py-0`}>
        <button 
          onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${activeTab === 'dashboard' ? activeClass : inactiveClass}`}
        >
          <LayoutDashboard className="w-4 h-4" /> Relatório
        </button>
        <button 
          onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${activeTab === 'history' ? activeClass : inactiveClass}`}
        >
          <FileText className="w-4 h-4" /> Histórico
        </button>
        <button 
          onClick={() => { setActiveTab('add'); setEditingEntryId(null); setIsMobileMenuOpen(false); }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${activeTab === 'add' ? activeClass : inactiveClass}`}
        >
          <PlusCircle className="w-4 h-4" /> Novo Lançamento
        </button>
        <button 
          onClick={() => { setActiveTab('vehicles'); setIsMobileMenuOpen(false); }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${activeTab === 'vehicles' ? activeClass : inactiveClass}`}
        >
          <Truck className="w-4 h-4" /> Veículos
        </button>
        <button 
          onClick={() => { setActiveTab('clients'); setIsMobileMenuOpen(false); }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${activeTab === 'clients' ? activeClass : inactiveClass}`}
        >
          <Users className="w-4 h-4" /> Clientes
        </button>
        <button 
          onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${activeTab === 'settings' ? activeClass : inactiveClass}`}
        >
          <Settings className="w-4 h-4" /> Config
        </button>
        <button 
          onClick={() => signOut()}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg transition-colors text-[14px] ${inactiveClass} text-red-400 hover:text-red-500`}
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </nav>
    );
  };

  // --- Screens ---

  const DashboardScreen = () => {
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [plateFilter, setPlateFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const filteredEntries = useMemo(() => {
      let result = entries;
      if (clientFilter !== 'all') {
        result = result.filter(e => e.clienteId === clientFilter);
      }
      if (plateFilter !== 'all') {
        result = result.filter(e => (e.placa || '').toUpperCase() === plateFilter.toUpperCase());
      }
      if (startDate) {
        // Adjust for local timezone by appending time if necessary, or just use the date string
        const start = new Date(`${startDate}T00:00:00`).getTime();
        result = result.filter(e => new Date(e.createdAt).getTime() >= start);
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`).getTime();
        result = result.filter(e => new Date(e.createdAt).getTime() <= end);
      }
      return result;
    }, [entries, clientFilter, startDate, endDate]);

    const totals = useMemo(() => {
      return filteredEntries.reduce(
        (acc, curr) => {
          if (curr.type === 'credit') acc.credits += curr.valor;
          else acc.debits += curr.valor;
          acc.balance = acc.credits - acc.debits;
          return acc;
        },
        { credits: 0, debits: 0, balance: 0 }
      );
    }, [filteredEntries]);

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const exportPDF = () => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      
      // Document Header
      doc.setFillColor(30, 58, 138); // Primary Blue
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(config.name, margin, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${config.cnpj}  |  Tel: ${config.phone}`, margin, 28);
      doc.text(config.address, margin, 34);

      // Report Title
      doc.setTextColor(30, 58, 138);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text('Relatório Analítico de Lançamentos', margin, 55);

      const clientName = clientFilter === 'all' ? 'Todos os clientes' : (clients.find(c => c.id === clientFilter)?.nome || '-');
      let filterText = `Filtro: Cliente - ${clientName}`;
      if (startDate || endDate) {
        filterText += ` | Período: ${startDate ? new Date(`${startDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Início'} até ${endDate ? new Date(`${endDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Hoje'}`;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(filterText, margin, 62);
      doc.text(`Data de Geração: ${new Date().toLocaleString('pt-BR')}`, margin, 67);

      // Summary Cards
      const cardWidth = (pageWidth - (margin * 2) - 10) / 3;
      const cardY = 75;
      const cardHeight = 22;

      // Card 1: Credits
      doc.setDrawColor(220, 220, 220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, cardY, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Crédito A Receber", margin + 5, cardY + 8);
      doc.setFontSize(12);
      doc.setTextColor(22, 163, 74); // Green
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(totals.credits), margin + 5, cardY + 16);

      // Card 2: Debits
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin + cardWidth + 5, cardY, cardWidth, cardHeight, 2, 2, 'FD');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Crédito Pago", margin + cardWidth + 10, cardY + 8);
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38); // Red
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(totals.debits), margin + cardWidth + 10, cardY + 16);

      // Card 3: Balance
      doc.setFillColor(30, 58, 138); // Blue
      doc.roundedRect(margin + (cardWidth * 2) + 10, cardY, cardWidth, cardHeight, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setTextColor(200, 215, 255);
      doc.setFont("helvetica", "normal");
      doc.text("Saldo Final", margin + (cardWidth * 2) + 15, cardY + 8);
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(totals.balance), margin + (cardWidth * 2) + 15, cardY + 16);

      // Prepare table data once for performance
      const tableData = filteredEntries.map(e => {
        const client = clients.find(c => c.id === e.clienteId);
        const vehicleName = vehicles.find(v => v.placa === e.placa)?.nome || '';
        return [
          { content: new Date(e.createdAt).toLocaleDateString('pt-BR') },
          { content: client ? client.nome : '-' },
          { content: `${(e.placa || '').toUpperCase()} ${vehicleName ? `(${vehicleName})` : ''}` },
          { content: e.periodo },
          { content: e.observacoes ? `${e.descricao}\nObs: ${e.observacoes}` : e.descricao },
          { content: e.type === 'credit' ? 'Crédito' : 'Débito' },
          { content: formatCurrency(e.valor) }
        ];
      });

      // Table
      autoTable(doc, {
        startY: 105,
        theme: 'grid',
        headStyles: { 
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'left'
        },
        columnStyles: {
          5: { halign: 'center' }, // Tipo
          6: { halign: 'right', fontStyle: 'bold' }  // Valor
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        head: [['Data', 'Cliente', 'Placa/Veículo', 'Período', 'Descrição', 'Tipo', 'Valor']],
        body: tableData,
        willDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
            const entry = filteredEntries[data.row.index];
            if (entry.type === 'credit') {
              doc.setTextColor(22, 163, 74);
            } else {
              doc.setTextColor(220, 38, 38);
            }
          }
        },
        didDrawPage: (data) => {
          // Footer
          const pageCount = (doc.internal as any).getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Página ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
      });

      doc.save('relatorio_lancamentos.pdf');
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 border-b border-primary/20 pb-2">
          <h2 className="text-[18px] font-bold text-primary">Resumo Financeiro</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-2 flex-1 xl:flex-none">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                className="w-full xl:w-[150px] px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white font-medium text-slate-700"
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              >
                <option value="all">Todos os clientes</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 xl:flex-none">
              <Truck className="w-4 h-4 text-slate-400" />
              <select 
                className="w-full xl:w-[150px] px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white font-medium text-slate-700"
                value={plateFilter}
                onChange={e => setPlateFilter(e.target.value)}
              >
                <option value="all">Todas as placas</option>
                {vehicles.map(v => <option key={v.id} value={v.placa}>{v.placa} ({v.nome})</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <input 
                type="date"
                title="Data inicial"
                className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white text-slate-700"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-slate-400 text-[13px]">até</span>
              <input 
                type="date"
                title="Data final"
                className="w-full sm:w-auto px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white text-slate-700"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <button 
              onClick={exportPDF}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded text-[13px] font-medium transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          </div>
        </div>
        
        {/* Totalizer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Crédito A Receber</p>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(totals.credits)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Crédito Pago</p>
              <div className="p-2 rounded-xl bg-red-50 text-red-600">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(totals.debits)}</p>
          </div>
          <div className="bg-primary p-6 rounded-2xl shadow-md text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <DollarSign className="w-24 h-24 transform translate-x-4 -translate-y-4" />
            </div>
            <div className="flex justify-between items-start mb-4 relative z-10">
              <p className="text-sm font-medium text-white/70 uppercase tracking-wider">Saldo Final</p>
            </div>
            <p className="text-3xl font-bold tracking-tight text-white relative z-10">{formatCurrency(totals.balance)}</p>
          </div>
        </div>

        {/* Entries Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mt-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Histórico de Lançamentos</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Veículo/Placa</th>
                  <th className="px-6 py-4 font-medium">Período</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium text-center">Tipo</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                  <th className="px-6 py-4 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      Nenhum lançamento encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const client = clients.find(c => c.id === entry.clienteId);
                    const vehicle = vehicles.find(v => v.placa === (entry.placa || '').toUpperCase() || v.placa === entry.placa);
                    return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-slate-900 font-medium">{client ? client.nome : <span className="text-slate-400 italic">Sem cliente</span>}</td>
                      <td className="px-6 py-4 font-mono text-slate-700 flex flex-col gap-0.5">
                        <span className="font-semibold">{(entry.placa || '').toUpperCase()}</span>
                        {vehicle && vehicle.nome && <span className="text-xs text-slate-500 font-sans">{vehicle.nome}</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{entry.periodo}</td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-slate-700">
                            <span className="truncate">{entry.descricao}</span>
                            {entry.attachment && (
                              <button 
                                onClick={() => {
                                  const w = window.open('about:blank');
                                  if(w) {
                                    if (entry.attachment?.type.startsWith('image/')) {
                                      w.document.write(`<img src="${entry.attachment.data}" style="max-width:100%;" />`);
                                    } else {
                                      w.document.write(`<iframe src="${entry.attachment.data}" style="width:100%;height:100vh;border:none;"></iframe>`);
                                    }
                                  }
                                }}
                                className="text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 p-1.5 rounded-md shrink-0"
                                title="Ver Comprovante"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {entry.observacoes && <span className="text-xs text-slate-500 leading-snug">{entry.observacoes}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          entry.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.type === 'credit' ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${
                          entry.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.valor)}
                      </td>
                      <td className="px-6 py-4 text-center opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const HistoryScreen = () => {
    const [clientFilter, setClientFilter] = useState<string>('all');
    const [plateFilters, setPlateFilters] = useState<string[]>([]);
    const [isPlateDropdownOpen, setIsPlateDropdownOpen] = useState(false);
    const plateDropdownRef = useRef<HTMLDivElement>(null);

    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (plateDropdownRef.current && !plateDropdownRef.current.contains(event.target as Node)) {
          setIsPlateDropdownOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const filteredEntries = useMemo(() => {
      let result = entries;
      if (clientFilter !== 'all') {
        result = result.filter(e => e.clienteId === clientFilter);
      }
      if (plateFilters.length > 0) {
        result = result.filter(e => plateFilters.includes((e.placa || '').toUpperCase()));
      }
      if (typeFilter !== 'all') {
        result = result.filter(e => e.type === typeFilter);
      }
      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`).getTime();
        result = result.filter(e => new Date(e.createdAt).getTime() >= start);
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`).getTime();
        result = result.filter(e => new Date(e.createdAt).getTime() <= end);
      }
      return result.sort((a,b) => b.createdAt - a.createdAt);
    }, [entries, clientFilter, plateFilters, typeFilter, startDate, endDate]);

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const handleGeneratePDF = () => {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFontSize(16);
      doc.text(config.name, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`CNPJ: ${config.cnpj} | Telefone: ${config.phone}`, 14, 28);
      doc.text(config.address || '', 14, 34);

      // Title
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Relatório Financeiro', 14, 45);

      // Totals
      const totalCredit = filteredEntries.filter(e => e.type === 'credit').reduce((sum, e) => sum + e.valor, 0);
      const totalDebit = filteredEntries.filter(e => e.type === 'debit').reduce((sum, e) => sum + e.valor, 0);
      const balance = totalCredit - totalDebit;

      doc.setFontSize(11);
      doc.text(`Quantidade: ${filteredEntries.length} lançamentos`, 14, 55);
      doc.text(`Créditos: ${formatCurrency(totalCredit)}`, 14, 61);
      doc.text(`Débitos: ${formatCurrency(totalDebit)}`, 14, 67);
      doc.text(`Saldo: ${formatCurrency(balance)}`, 14, 73);

      let textY = 85;

      if (filteredEntries.length === 0) {
         doc.text('Nenhum lançamento no período.', 14, textY);
      } else {
        const tableData = filteredEntries.map(entry => {
          const client = clients.find(c => c.id === entry.clienteId);
          const clientName = client ? client.nome : 'Sem cliente';
          return [
            new Date(entry.createdAt).toLocaleDateString('pt-BR'),
            clientName,
            (entry.placa || '').toUpperCase(),
            entry.periodo,
            entry.descricao,
            entry.type === 'credit' ? 'Crédito' : 'Débito',
            formatCurrency(entry.valor)
          ];
        });

        // @ts-ignore
        autoTable(doc, {
          startY: textY,
          head: [['Data', 'Cliente', 'Placa', 'Período', 'Descrição', 'Tipo', 'Valor']],
          body: tableData,
          theme: 'striped',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185] },
          didDrawPage: (data: any) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.text(`Página ${data.pageNumber}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
          }
        });
      }

      doc.save(`relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 border-b border-primary/20 pb-4">
          <h2 className="text-[18px] font-bold text-primary flex-shrink-0">Histórico Completo</h2>
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 w-full xl:w-auto flex-wrap justify-end">
            <div className="flex items-center gap-2 flex-1 lg:flex-none">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                className="w-full lg:w-[130px] px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white text-slate-700"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">Tipos (Todos)</option>
                <option value="credit">Somente Crédito</option>
                <option value="debit">Somente Débito</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 lg:flex-none">
              <select 
                className="w-full lg:w-[130px] px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white text-slate-700"
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              >
                <option value="all">Clientes (Todos)</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1 lg:flex-none relative" ref={plateDropdownRef}>
              <button 
                className="w-full lg:w-[160px] px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none hover:border-primary bg-white text-slate-700 text-left flex justify-between items-center"
                onClick={() => setIsPlateDropdownOpen(!isPlateDropdownOpen)}
              >
                <span className="truncate">
                  {plateFilters.length === 0 ? 'Placas (Todas)' : `${plateFilters.length} placa(s)`}
                </span>
                <ChevronDown className="w-4 h-4 ml-2 text-slate-400 shrink-0" />
              </button>
              
              {isPlateDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full lg:w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <label className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer rounded">
                      <input 
                        type="checkbox" 
                        checked={plateFilters.length === 0}
                        onChange={() => setPlateFilters([])}
                        className="rounded border-slate-300 text-primary h-4 w-4"
                      />
                      <span className="text-[13px] text-slate-700 font-medium">Todas as Placas</span>
                    </label>
                    <div className="h-px bg-slate-100 my-1"></div>
                    {vehicles.map(v => (
                      <label key={v.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer rounded">
                        <input 
                          type="checkbox" 
                          checked={plateFilters.includes((v.placa || '').toUpperCase())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPlateFilters(prev => [...prev, (v.placa || '').toUpperCase()]);
                            } else {
                              setPlateFilters(prev => prev.filter(p => p !== (v.placa || '').toUpperCase()));
                            }
                          }}
                          className="rounded border-slate-300 text-primary h-4 w-4"
                        />
                        <span className="text-[13px] text-slate-700">{v.placa}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto">
              <input 
                type="date"
                title="Data inicial"
                className="w-full lg:w-auto px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white text-slate-700"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
              <span className="text-slate-400 text-[13px]">até</span>
              <input 
                type="date"
                title="Data final"
                className="w-full lg:w-auto px-3 py-1.5 border border-slate-300 rounded text-[13px] outline-none focus:border-primary bg-white text-slate-700"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <button
               onClick={handleGeneratePDF}
               className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-[13px] font-medium transition-colors lg:ml-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Veículo/Placa</th>
                  <th className="px-6 py-4 font-medium">Período</th>
                  <th className="px-6 py-4 font-medium">Descrição</th>
                  <th className="px-6 py-4 font-medium text-center">Tipo</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                  <th className="px-6 py-4 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      Nenhum lançamento encontrado para os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const client = clients.find(c => c.id === entry.clienteId);
                    const vehicle = vehicles.find(v => v.placa === (entry.placa || '').toUpperCase() || v.placa === entry.placa);
                    return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-slate-900 font-medium">{client ? client.nome : <span className="text-slate-400 italic">Sem cliente</span>}</td>
                      <td className="px-6 py-4 font-mono text-slate-700 flex flex-col gap-0.5">
                        <span className="font-semibold">{(entry.placa || '').toUpperCase()}</span>
                        {vehicle && vehicle.nome && <span className="text-xs text-slate-500 font-sans">{vehicle.nome}</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{entry.periodo}</td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-slate-700">
                            <span className="truncate">{entry.descricao}</span>
                            {entry.attachment && (
                              <button 
                                onClick={() => {
                                  const w = window.open('about:blank');
                                  if(w) {
                                    if (entry.attachment?.type.startsWith('image/')) {
                                      w.document.write(`<img src="${entry.attachment.data}" style="max-width:100%;" />`);
                                    } else {
                                      w.document.write(`<iframe src="${entry.attachment.data}" style="width:100%;height:100vh;border:none;"></iframe>`);
                                    }
                                  }
                                }}
                                className="text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 p-1.5 rounded-md shrink-0"
                                title="Ver Comprovante"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {entry.observacoes && <span className="text-xs text-slate-500 leading-snug">{entry.observacoes}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          entry.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {entry.type === 'credit' ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium whitespace-nowrap ${
                          entry.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {entry.type === 'credit' ? '+' : '-'}{formatCurrency(entry.valor)}
                      </td>
                      <td className="px-6 py-4 text-center opacity-100 xl:opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const AddScreen = () => {
    const editingEntry = useMemo(() => entries.find(e => e.id === editingEntryId), [entries, editingEntryId]);
    const [showPlateDropdown, setShowPlateDropdown] = useState(false);

    const [form, setForm] = useState({
      clienteId: editingEntry?.clienteId || '',
      placa: editingEntry?.placa || '',
      periodo: editingEntry?.periodo || '',
      descricao: editingEntry?.descricao || '',
      observacoes: editingEntry?.observacoes || '',
      valor: editingEntry ? editingEntry.valor.toString() : '',
      tipo: editingEntry ? editingEntry.type : 'credit' as EntryType,
      attachment: editingEntry?.attachment || undefined as Attachment | undefined
    });

    const filteredVehicles = useMemo(() => {
      const p = form.placa.toLowerCase();
      return vehicles.filter(v => v.placa.toLowerCase().includes(p) || v.nome.toLowerCase().includes(p));
    }, [vehicles, form.placa]);

    useEffect(() => {
      if (editingEntry) {
        setForm({
          clienteId: editingEntry.clienteId || '',
          placa: editingEntry.placa,
          periodo: editingEntry.periodo,
          descricao: editingEntry.descricao,
          observacoes: editingEntry.observacoes || '',
          valor: editingEntry.valor.toString(),
          tipo: editingEntry.type,
          attachment: editingEntry.attachment
        });
      } else {
        setForm({
          clienteId: '',
          placa: '',
          periodo: '',
          descricao: '',
          observacoes: '',
          valor: '',
          tipo: 'credit',
          attachment: undefined
        });
      }
    }, [editingEntry]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('O arquivo deve ter no máximo 2MB para armazenamento local.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
          setForm({
            ...form, 
            attachment: { 
              name: file.name, 
              type: file.type, 
              data: ev.target?.result as string 
            }
          });
        };
        reader.readAsDataURL(file);
      }
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const numValor = parseFloat(form.valor.replace(',', '.'));
      if (isNaN(numValor) || numValor <= 0) {
        alert('Por favor, insira um valor válido maior que zero.');
        return;
      }
      
      const newValues = {
        clienteId: form.clienteId,
        placa: form.placa,
        periodo: form.periodo,
        descricao: form.descricao,
        observacoes: form.observacoes,
        valor: numValor,
        type: form.tipo,
        attachment: form.attachment
      };

      if (editingEntry) {
        dbUpdateEntry(editingEntry.id, newValues);
        setEditingEntryId(null);
        setActiveTab('dashboard');
      } else {
        addEntry(newValues);
      }
    };

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {editingEntry ? 'Editar Lançamento' : 'Registrar Novo'}
          </h2>
          <p className="text-slate-500 mt-1">Preencha os detalhes do lançamento financeiro abaixo.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente</label>
              <select 
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-slate-700"
                value={form.clienteId}
                onChange={e => setForm({...form, clienteId: e.target.value})}
              >
                <option value="">Selecione um cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Placa do Veículo</label>
              <input 
                required
                type="text"
                placeholder="Ex: ABC-1234..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase placeholder:normal-case"
                value={form.placa}
                onChange={e => {
                  setForm({...form, placa: e.target.value});
                  setShowPlateDropdown(true);
                }}
                onFocus={() => setShowPlateDropdown(true)}
                onBlur={() => setTimeout(() => setShowPlateDropdown(false), 200)}
              />
              {showPlateDropdown && filteredVehicles.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[220px] overflow-y-auto">
                  {filteredVehicles.map(v => (
                    <div 
                      key={v.id} 
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 last:border-0 transition-colors"
                      onClick={() => {
                        setForm({...form, placa: v.placa});
                        setShowPlateDropdown(false);
                      }}
                    >
                      <span className="font-mono font-medium text-slate-900">{v.placa}</span>
                      <span className="text-sm text-slate-500">{v.nome}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Período</label>
              <input 
                required
                type="text"
                placeholder="MM/AAAA"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={form.periodo}
                onChange={e => setForm({...form, periodo: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Descrição</label>
            <input 
              required
              type="text"
              placeholder="Ex: Manutenção, Abastecimento, Frete..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={form.descricao}
              onChange={e => setForm({...form, descricao: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Observações <span className="text-slate-400 font-normal">(Opcional)</span></label>
            <textarea 
              rows={2}
              placeholder="Detalhes adicionais do lançamento..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
              value={form.observacoes}
              onChange={e => setForm({...form, observacoes: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Valor (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-lg font-medium"
                value={form.valor}
                onChange={e => setForm({...form, valor: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Lançamento</label>
              <div className="flex gap-3 mt-1">
                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-4 rounded-xl border transition-all ${
                  form.tipo === 'credit' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="tipo" 

                    value="credit"
                    checked={form.tipo === 'credit'}
                    onChange={() => setForm({...form, tipo: 'credit'})}
                    className="hidden"
                  />
                  <span className="text-emerald-700 font-medium">Crédito (+)</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-4 rounded-xl border transition-all ${
                  form.tipo === 'debit' ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="tipo" 
                    value="debit"
                    checked={form.tipo === 'debit'}
                    onChange={() => setForm({...form, tipo: 'debit'})}
                    className="hidden"
                  />
                  <span className="text-red-700 font-medium">Débito (-)</span>
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Comprovante <span className="text-slate-400 font-normal">(Imagem/PDF até 2MB)</span></label>
              <input 
                type="file"
                accept="image/*,application/pdf"
                className="w-full px-4 py-2 bg-white border border-slate-200 border-dashed rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                onChange={handleFileChange}
              />
              {form.attachment && (
                <div className="flex items-center justify-between mt-3 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <p className="text-sm text-emerald-700 font-medium flex items-center gap-2"><FileText className="w-4 h-4"/> {form.attachment.name}</p>
                  <button 
                    type="button"
                    onClick={() => setForm({...form, attachment: undefined})}
                    className="text-sm text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            {editingEntry && (
              <button 
                type="button"
                onClick={() => {
                  setEditingEntryId(null);
                  setActiveTab('dashboard');
                }}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all text-sm"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-light text-white font-semibold shadow-sm transition-all text-sm"
            >
              {editingEntry ? 'Salvar Alterações' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const SettingsScreen = () => {
    const [form, setForm] = useState<CompanyConfig>(config);
    const [savedNotice, setSavedNotice] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await updateConfig(form);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    };

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Configurações do Sistema</h2>
          <p className="text-slate-500 mt-1">Configure os dados da sua empresa no cabeçalho e PDF.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Empresa</label>
              <input 
                required
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ</label>
              <input 
                required
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={form.cnpj}
                onChange={e => setForm({...form, cnpj: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Telefone / Contato</label>
              <input 
                type="text"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">URL da Logomarca <span className="text-slate-400 font-normal">(Opcional)</span></label>
              <input 
                type="text"
                placeholder="https://..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                value={form.logoUrl}
                onChange={e => setForm({...form, logoUrl: e.target.value})}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Endereço Completo</label>
            <input 
              required
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={form.address}
              onChange={e => setForm({...form, address: e.target.value})}
            />
          </div>

          <div className="pt-2">
             <label className="block text-sm font-medium text-slate-700 mb-1.5">Opções de Layout</label>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 { id: 'top', label: 'Elegante (Topo)', icon: <LayoutDashboard className="w-5 h-5 mx-auto mb-2" /> },
                 { id: 'sidebar', label: 'Clássico (Lateral)', icon: <Menu className="w-5 h-5 mx-auto mb-2" /> },
                 { id: 'modern-sidebar', label: 'Moderno (Lateral Flutuante)', icon: <LayoutDashboard className="w-5 h-5 mx-auto mb-2" /> },
                 { id: 'minimal', label: 'Minimalista (Pílula Topo)', icon: <Menu className="w-5 h-5 mx-auto mb-2" /> },
               ].map(opt => (
                 <label 
                   key={opt.id}
                   className={`relative border rounded-xl p-4 cursor-pointer text-center transition-all ${
                     form.layout === opt.id 
                       ? 'border-secondary bg-secondary/5 text-secondary ring-1 ring-secondary' 
                       : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                   }`}
                 >
                   <input 
                     type="radio" 
                     name="layoutOption" 
                     value={opt.id}
                     checked={form.layout === opt.id}
                     onChange={() => setForm({...form, layout: opt.id as LayoutMode})}
                     className="hidden" 
                   />
                   {opt.icon}
                   <span className="block text-sm font-medium">{opt.label}</span>
                 </label>
               ))}
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div>
              {savedNotice && <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-medium">Configurações salvas!</span>}
            </div>
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-light text-white font-semibold shadow-sm transition-all text-sm"
            >
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>
    );
  };

  const VehiclesScreen = () => {
    const [newPlaca, setNewPlaca] = useState('');
    const [newNome, setNewNome] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredVehicles = useMemo(() => {
      const q = searchTerm.toLowerCase();
      return vehicles.filter(v => v.placa.toLowerCase().includes(q) || v.nome.toLowerCase().includes(q));
    }, [vehicles, searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const placa = newPlaca.trim().toUpperCase();
      const nome = newNome.trim();
      if (!placa || !nome) return;
      
      if (editingId) {
        await dbUpdateVehicle(editingId, { placa, nome });
        setEditingId(null);
      } else {
        if (vehicles.some(v => v.placa === placa)) {
          alert('Placa já cadastrada!');
          return;
        }
        await dbAddVehicle({ placa, nome });
      }
      setNewPlaca('');
      setNewNome('');
    };

    const handleEdit = (v: Vehicle) => {
      setNewPlaca(v.placa);
      setNewNome(v.nome);
      setEditingId(v.id);
    };

    const handleDelete = async (id: string) => {
      if(confirm(`Remover este veículo?`)) {
        await dbDeleteVehicle(id);
        if (editingId === id) setEditingId(null);
      }
    };

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciar Veículos</h2>
          <p className="text-slate-500 mt-1">Cadastre e gerencie a frota de veículos.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Placa</label>
            <input 
              required
              type="text"
              placeholder="ABC-1234"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase placeholder:normal-case"
              value={newPlaca}
              onChange={e => setNewPlaca(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Veículo</label>
            <input 
              required
              type="text"
              placeholder="Ex: Caminhão FH 460"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {editingId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewPlaca('');
                  setNewNome('');
                }}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all text-sm h-[44px] flex items-center justify-center flex-1 md:flex-none"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-light text-white font-semibold shadow-sm transition-all text-sm h-[44px] flex items-center justify-center flex-1 md:flex-none"
            >
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>

        <div className="mt-8 mb-4">
          <input 
            type="text"
            placeholder="Buscar veículo..."
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {filteredVehicles.length === 0 ? (
             <p className="px-6 py-8 text-center text-slate-400">Nenhum veículo encontrado.</p>
          ) : (
            filteredVehicles.map(v => (
              <div key={v.id} className="flex justify-between items-center px-6 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <span className="font-mono text-base font-medium text-slate-900 block">{v.placa}</span>
                  <span className="text-sm text-slate-500">{v.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(v)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar Veículo"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(v.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Placa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const ClientsScreen = () => {
    const [newNome, setNewNome] = useState('');
    const [newDocumento, setNewDocumento] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = useMemo(() => {
      const q = searchTerm.toLowerCase();
      return clients.filter(c => c.nome.toLowerCase().includes(q) || c.documento.toLowerCase().includes(q));
    }, [clients, searchTerm]);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const nome = newNome.trim();
      const documento = newDocumento.trim();
      if (!nome || !documento) return;
      
      if (editingId) {
        await dbUpdateClient(editingId, { nome, documento });
        setEditingId(null);
      } else {
        await dbAddClient({ nome, documento });
      }
      setNewNome('');
      setNewDocumento('');
    };

    const handleEdit = (c: Client) => {
      setNewNome(c.nome);
      setNewDocumento(c.documento);
      setEditingId(c.id);
    };

    const handleDelete = async (id: string) => {
      if(confirm('Remover cliente?')) {
        await dbDeleteClient(id);
        if (editingId === id) setEditingId(null);
      }
    };

    return (
      <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Gerenciar Clientes</h2>
          <p className="text-slate-500 mt-1">Cadastre e gerencie as informações de clientes.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome do Cliente</label>
            <input 
              required
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF / CNPJ</label>
            <input 
              required
              type="text"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={newDocumento}
              onChange={e => setNewDocumento(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {editingId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setNewNome('');
                  setNewDocumento('');
                }}
                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition-all text-sm h-[44px] flex items-center justify-center flex-1 md:flex-none"
              >
                Cancelar
              </button>
            )}
            <button 
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-secondary hover:bg-secondary-light text-white font-semibold shadow-sm transition-all text-sm h-[44px] flex items-center justify-center flex-1 md:flex-none"
            >
              {editingId ? 'Atualizar' : 'Cadastrar'}
            </button>
          </div>
        </form>

        <div className="mt-8 mb-4">
          <input 
            type="text"
            placeholder="Buscar cliente..."
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
          {filteredClients.length === 0 ? (
             <p className="px-6 py-8 text-center text-slate-400">Nenhum cliente encontrado.</p>
          ) : (
            filteredClients.map(c => (
              <div key={c.id} className="flex justify-between items-center px-6 py-4 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-900">{c.nome}</p>
                  <p className="text-sm text-slate-500">{c.documento}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(c)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar Cliente"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(c.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Cliente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // --- Layout Wrappers ---

  // Layout 1: Top Navigation (Moderno)
  if (config.layout === 'top') {
    return (
      <div className="min-h-screen flex flex-col pt-0 pb-10">
        <header className="bg-primary shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <HeaderInfo />
          </div>
          <div className="border-t border-white/10 hidden md:block">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Navigation className="flex-row" />
            </div>
          </div>
          
          {/* Mobile Menu Toggle */}
          <div className="md:hidden absolute top-4 right-4 text-white">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-primary">
               <Navigation className="flex-col" />
            </div>
          )}
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <DashboardScreen />}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'add' && <AddScreen />}
          {activeTab === 'vehicles' && <VehiclesScreen />}
          {activeTab === 'clients' && <ClientsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>
      </div>
    );
  }

  // Layout 3: Modern Sidebar (Flutuante)
  if (config.layout === 'modern-sidebar') {
    return (
      <div className="min-h-screen bg-slate-100 flex p-4 md:p-6 gap-6">
        {/* Mobile Header Toggle */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-primary p-4 flex items-center justify-between shadow-sm z-30">
          <div className="scale-90 origin-left">
             <HeaderInfo />
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Floating Sidebar Content */}
        <aside className={`${isMobileMenuOpen ? 'fixed inset-0 z-20 pt-20 p-4 bg-slate-900/80 backdrop-blur-sm' : 'hidden md:flex'} flex-col w-full md:w-72 flex-shrink-0 transition-all`}>
          <div className="bg-primary rounded-3xl shadow-xl overflow-hidden flex flex-col h-full md:h-[calc(100vh-48px)] md:sticky md:top-6">
            <div className="p-6 border-b border-white/10 hidden md:block">
              <HeaderInfo />
            </div>
            <div className="py-6 px-4 flex-1 overflow-y-auto">
              <Navigation className="flex-col gap-2" />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-5xl mx-auto md:mx-0 pt-20 md:pt-0">
          {activeTab === 'dashboard' && <DashboardScreen />}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'add' && <AddScreen />}
          {activeTab === 'vehicles' && <VehiclesScreen />}
          {activeTab === 'clients' && <ClientsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>
      </div>
    );
  }

  // Layout 4: Minimal (Pílula Topo)
  if (config.layout === 'minimal') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col pt-0 pb-10">
        <header className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-20">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-4">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg bg-slate-100 object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center ring-1 ring-blue-100 text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-[15px] leading-tight text-slate-900 tracking-tight">{config.name}</h1>
                <p className="text-[12px] text-slate-500 mt-0.5">{config.cnpj}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-full shadow-sm border border-slate-200 px-2 py-2 hidden md:block">
            <Navigation className="flex-row items-center gap-1" theme="light" />
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden absolute top-8 right-6 text-slate-600">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="md:hidden w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-4 absolute top-24 left-0 right-0 mx-4">
               <Navigation className="flex-col gap-2" theme="light" />
            </div>
          )}
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && <DashboardScreen />}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'add' && <AddScreen />}
          {activeTab === 'vehicles' && <VehiclesScreen />}
          {activeTab === 'clients' && <ClientsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </main>
      </div>
    );
  }

  // Layout 2: Sidebar (Dashboard Classic)
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header / Sidebar Header */}
      <div className="md:hidden bg-primary p-4 flex items-center justify-between shadow-sm relative z-20">
        <div className="scale-90 origin-left">
           <HeaderInfo />
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      
      {/* Sidebar Content */}
      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-72 bg-primary flex-shrink-0 shadow-lg md:min-h-screen z-10`}>
        <div className="p-6 hidden md:block border-b border-white/10">
          <HeaderInfo />
        </div>
        <div className="py-4">
          <Navigation className="flex-col gap-1 px-4" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 bg-slate-50 p-4 md:p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {activeTab === 'dashboard' && <DashboardScreen />}
          {activeTab === 'history' && <HistoryScreen />}
          {activeTab === 'add' && <AddScreen />}
          {activeTab === 'vehicles' && <VehiclesScreen />}
          {activeTab === 'clients' && <ClientsScreen />}
          {activeTab === 'settings' && <SettingsScreen />}
        </div>
      </main>
    </div>
  );
}
