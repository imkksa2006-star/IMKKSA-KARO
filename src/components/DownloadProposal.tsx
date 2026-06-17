import React, { useState, useEffect } from 'react';
import { generateProposalPDF } from '../utils/pdfUtils';
import { supabase, type SupabaseProposal } from '../services/supabase';

interface DownloadProposalProps {
  isLoggedIn: boolean;
  proposals: SupabaseProposal[];
  onAddProposal: (pemohon: string, tujuanSurat: string) => Promise<any>;
  onEditProposal: (id: number, updates: Partial<SupabaseProposal>) => Promise<void>;
  onDeleteProposal: (id: number) => Promise<void>;
}

const DownloadProposal: React.FC<DownloadProposalProps> = ({ isLoggedIn, proposals, onAddProposal, onEditProposal, onDeleteProposal }) => {
  const [tujuanSurat, setTujuanSurat] = useState('');
  const [pemohon, setPemohon] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTujuan, setEditTujuan] = useState('');
  const [editNomor, setEditNomor] = useState('');
  const [editPemohon, setEditPemohon] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [nextNomorSurat, setNextNomorSurat] = useState<string>('Memuat...');

  // Filter and Sort proposals
  const filteredHistory = proposals.filter(p => 
    p.tujuan_surat.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nomor_surat.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.pemohon && p.pemohon.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const history = [...filteredHistory]; // Supabase already sorted by no_urut descending

  const fetchNextNomorSurat = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_nomor_surat');
      if (error) {
        console.error('Error fetching next nomor surat from RPC:', error);
        // Fallback logic if RPC fails
        generateFallbackNomor();
      } else if (data) {
        setNextNomorSurat(data);
      } else {
        generateFallbackNomor();
      }
    } catch (err) {
      console.error('Error in fetchNextNomorSurat:', err);
      generateFallbackNomor();
    }
  };

  const generateFallbackNomor = () => {
    const nextNo = proposals.length > 0 ? Math.max(...proposals.map(p => p.no_urut)) + 1 : 13;
    const now = new Date();
    const mm = now.getMonth() + 1;
    const yyyy = now.getFullYear();
    const yyShort = String(yyyy).slice(-2);
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const mmRoman = romanMonths[mm - 1];
    const generated = `${nextNo}/${mmRoman}-‘${yyShort}/MJ-BA/PPSGGR30-1`;
    setNextNomorSurat(generated);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchNextNomorSurat();
    }
  }, [isLoggedIn, proposals]);

  const handleProses = async () => {
    if (!tujuanSurat.trim()) {
      alert('Tujuan Proposal harus diisi.');
      return;
    }
    if (!pemohon.trim()) {
      alert('Nama Pemohon harus diisi.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const insertedRows = await onAddProposal(pemohon, tujuanSurat);
      setTujuanSurat('');
      setPemohon('');
      alert('Proposal berhasil diproses secara global via Supabase!');
      
      // Auto download PDF for the newly created record
      if (insertedRows && insertedRows.length > 0) {
        handleDownload(insertedRows[0]);
      }
    } catch (err: any) {
      console.error('ERROR SUPABASE:', err);
      alert(err?.message || JSON.stringify(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (record: SupabaseProposal) => {
    if (!record.id) return;
    setEditingId(record.id);
    setEditTujuan(record.tujuan_surat);
    setEditNomor(record.nomor_surat);
    setEditPemohon(record.pemohon || '');
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    setIsProcessing(true);
    
    try {
      await onEditProposal(editingId, { 
        tujuan_surat: editTujuan, 
        nomor_surat: editNomor, 
        pemohon: editPemohon 
      });
      setEditingId(null);
    } catch (err) {
      alert('Gagal mengupdate proposal di Supabase.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini secara permanen dari Supabase?')) return;
    
    setIsProcessing(true);
    try {
      await onDeleteProposal(id);
    } catch (err) {
      alert('Gagal menghapus proposal di Supabase.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async (record: SupabaseProposal) => {
    try {
      const pdfBytes = await generateProposalPDF({
        nomorSurat: record.nomor_surat,
        tujuanSurat: record.tujuan_surat,
        tanggalSurat: record.tanggal_surat
      });
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeFileName = `Proposal_${record.nomor_surat.replace(/\//g, '-')}.pdf`;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      alert(`Gagal mendownload PDF: ${err.message || 'Error tidak diketahui'}`);
    }
  };

  return (
    <div className="page-card">
      <h2>Download & Lacak Proposal</h2>
      
      {isLoggedIn && (
        <div className="admin-data-form" style={{ marginBottom: '30px' }}>
          <h3>Form Input Proposal (Real-time Global)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Nomor Surat Selanjutnya (Otomatis):</label>
              <input type="text" value={nextNomorSurat} disabled style={{ backgroundColor: '#f0f0f0' }} />
            </div>
            <div className="form-group">
              <label>Nama Pemohon:</label>
              <input 
                type="text" 
                value={pemohon} 
                onChange={(e) => setPemohon(e.target.value)} 
                placeholder="Masukkan nama Anda / Panitia..."
              />
            </div>
            <div className="form-group full-width">
              <label>Tujuan Proposal:</label>
              <textarea 
                value={tujuanSurat} 
                onChange={(e) => setTujuanSurat(e.target.value)} 
                placeholder="Masukkan tujuan proposal... (Contoh: Pimpinan Bank ABC)"
                rows={3}
              />
            </div>
          </div>
          <div className="admin-action-buttons">
            <button className="btn-save" onClick={handleProses} disabled={isProcessing}>
              {isProcessing ? 'MEMPROSES...' : 'PROSES & GENERATE PDF'}
            </button>
          </div>
        </div>
      )}

      <div className="admin-umat-list">
        <div className="history-header" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Database Tracking Proposal</h3>
            <span style={{ fontSize: '0.8rem', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className="pulse-indicator" style={{ width: '8px', height: '8px', backgroundColor: '#4CAF50', borderRadius: '50%', display: 'inline-block' }}></span>
              Database Sinkron Real-time
            </span>
          </div>
          
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Cari Tujuan, Nomor Surat, atau Pemohon..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="umat-table admin-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nomor Surat</th>
                <th>Tujuan Surat</th>
                <th>Pemohon</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {history.length > 0 ? history.map((record, index) => (
                <tr key={record.id}>
                  <td>{history.length - index}</td>
                  <td>
                    {editingId === record.id ? (
                      <input 
                        type="text" 
                        value={editNomor} 
                        onChange={(e) => setEditNomor(e.target.value)} 
                        className="edit-input-small"
                      />
                    ) : record.nomor_surat}
                  </td>
                  <td>
                    {editingId === record.id ? (
                      <textarea 
                        value={editTujuan} 
                        onChange={(e) => setEditTujuan(e.target.value)} 
                        className="edit-input-small"
                        rows={2}
                      />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{record.tujuan_surat}</div>
                    )}
                  </td>
                  <td>
                    {editingId === record.id ? (
                      <input 
                        type="text" 
                        value={editPemohon} 
                        onChange={(e) => setEditPemohon(e.target.value)} 
                        className="edit-input-small"
                      />
                    ) : (record.pemohon || '-')}
                  </td>
                  <td>
                    <div className="table-actions">
                      {editingId === record.id ? (
                        <>
                          <button className="btn-save-small" onClick={handleSaveEdit} disabled={isProcessing}>Simpan</button>
                          <button className="btn-delete-small" onClick={() => setEditingId(null)}>Batal</button>
                        </>
                      ) : (
                        <>
                          <button className="btn-edit-small" onClick={() => handleDownload(record)}>Download</button>
                          {isLoggedIn && (
                            <>
                              <button className="btn-edit-small" style={{ backgroundColor: '#2196F3' }} onClick={() => handleEdit(record)}>Edit</button>
                              <button className="btn-delete-small" onClick={() => handleDelete(record.id)}>Hapus</button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>
                    {searchQuery ? 'Data tidak ditemukan.' : 'Belum ada riwayat proposal global.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DownloadProposal;
