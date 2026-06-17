import React, { useState, useEffect } from 'react'
import './App.css'
import LoginForm from './components/LoginForm'
import { authService } from './services/auth'
import AdminDashboard from './components/AdminDashboard'
import { compressImage } from './utils/imageUtils'
import DownloadProposal from './components/DownloadProposal'
import { supabase, type SupabaseProposal } from './services/supabase'


// Types
type Tab = 'Beranda' | 'Jadwal Ibadah' | 'Organisasi Gereja' | 'Data Umat' | 'Download' | 'Login' 
  | 'PA' | 'PT' | 'GP' | 'PKB' | 'PKP' 
  | 'GermasaLH' | 'PG' | 'Inforkom-Litbang';

interface ContentBlock {
  type: 'text' | 'image';
  value: string;
}

interface PageContent {
  title: string;
  content: string;
  blocks?: ContentBlock[]; // Opsional untuk migrasi
}

interface SiteSettings {
  logo: string;
  title: string;
  berandaPdf?: string;
}

interface UmatRecord {
  id: string;
  nama: string;
  status: string;
  nik: string;
  alamat: string;
  noHp: string;
  photo: string;
  kk: string;
  isPending?: boolean; // New flag for verification queue
}

interface FullContent {
  settings: SiteSettings;
  pages: Record<string, PageContent>;
  umat: UmatRecord[];
  proposals: any[]; // New field for shared proposal history
}

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwnXm-7uc82ZXbcqLVp6wSDmhtelLbods2bHTHEjqov06jzTGf-eCXuXsDnzzGlFDBkTw/exec';

const DEFAULT_CONTENT: FullContent = {
  settings: {
    logo: "/LOGO_GPIB.jpg",
    title: "GPIB BANDA ACEH",
    berandaPdf: ""
  },
  pages: {
    'Beranda': {
      title: 'Selamat Datang di GPIB Banda Aceh',
      content: '<p>Membangun jemaat yang misioner, inklusif, dan transformatif di tengah masyarakat Banda Aceh.</p><p>GPIB Banda Aceh hadir untuk menjadi berkat bagi sesama dengan semangat pelayanan dan kasih Kristus.</p>'
    },
    'Jadwal Ibadah': {
      title: 'Jadwal Ibadah Mingguan',
      content: '<p><strong>Ibadah Hari Minggu:</strong> 09.00 WIB<br><strong>Ibadah Keluarga:</strong> Rabu, 19.30 WIB<br><strong>Ibadah Pelkat PA/PT:</strong> Sabtu, 16.00 WIB</p>'
    },
    'Organisasi Gereja': {
      title: 'Struktur Organisasi & Majelis',
      content: '<p>Informasi mengenai struktur organisasi Majelis Jemaat, Pelayanan Kategorial (Pelkat), dan Komisi-Komisi di GPIB Banda Aceh.</p>'
    },
    'PA': {
      title: 'Pelayanan Anak (PA)',
      content: '<p><strong>Tugas Pokok:</strong><br>Melaksanakan pelayanan kategorial kepada anak-anak jemaat dalam rentang usia sekolah minggu (0-12 tahun).</p><p><strong>Fungsi:</strong><br>1. Menyelenggarakan Ibadah Hari Minggu Pelayanan Anak (IHMPA).<br>2. Membina iman anak melalui pengajaran Alkitab yang kreatif dan kontekstual.<br>3. Mengembangkan potensi dan bakat anak dalam lingkungan gerejawi.</p>'
    },
    'PT': {
      title: 'Pelayanan Taruna (PT)',
      content: '<p><strong>Tugas Pokok:</strong><br>Melayani dan membina kaum taruna atau remaja jemaat (usia 13-17 tahun).</p><p><strong>Fungsi:</strong><br>1. Menyelenggarakan Ibadah Hari Minggu Pelayanan Taruna (IHMPT).<br>2. Mendampingi remaja dalam masa transisi mencari jati diri dengan nilai-nilai Kristiani.<br>3. Membangun persekutuan yang akrab di antara taruna.</p>'
    },
    'GP': {
      title: 'Gerakan Pemuda (GP)',
      content: '<p><strong>Tugas Pokok:</strong><br>Menghimpun dan melayani pemuda-pemudi gereja (usia 18-35 tahun) untuk terlibat aktif dalam misi gereja.</p><p><strong>Fungsi:</strong><br>1. Wadah pembinaan kepemimpinan dan spiritualitas pemuda.<br>2. Menggerakkan pemuda dalam berbagai aksi pelayanan kasih dan kemasyarakatan.<br>3. Menjadi garda terdepan dalam inovasi dan kegiatan kreatif gereja.</p>'
    },
    'PKP': {
      title: 'Persekutuan Kaum Perempuan (PKP)',
      content: '<p><strong>Tugas Pokok:</strong><br>Melaksanakan pelayanan dan pembinaan kepada kaum perempuan/ibu di jemaat.</p><p><strong>Fungsi:</strong><br>1. Meningkatkan kualitas iman dan peran perempuan dalam keluarga dan gereja.<br>2. Menyelenggarakan persekutuan doa dan studi Alkitab khusus kaum perempuan.<br>3. Melaksanakan kegiatan pemberdayaan ekonomi dan sosial.</p>'
    },
    'PKB': {
      title: 'Persekutuan Kaum Bapak (PKB)',
      content: '<p><strong>Tugas Pokok:</strong><br>Melaksanakan pelayanan dan pembinaan kepada kaum bapak/pria di jemaat.</p><p><strong>Fungsi:</strong><br>1. Menguatkan peran bapak sebagai imam dalam keluarga Kristen.<br>2. Membangun persekutuan bapak yang solider dan bertanggung jawab terhadap pelayanan gereja.<br>3. Menyelenggarakan kegiatan yang mendukung pertumbuhan iman dan tanggung jawab profesi.</p>'
    },
    'GermasaLH': {
      title: 'Komisi Gereja, Masyarakat, Agama dan Lingkungan Hidup (GermasaLH)',
      content: '<p><strong>Tugas Pokok:</strong><br>Menangani urusan hubungan gereja dengan masyarakat, antarumat beragama, serta kelestarian lingkungan hidup.</p><p><strong>Fungsi:</strong><br>1. Membangun dialog dan kerjasama oikumenis serta antariman di Banda Aceh.<br>2. Melaksanakan aksi sosial dan advokasi terhadap isu-isu kemasyarakatan.<br>3. Mengedukasi jemaat dalam upaya pelestarian lingkungan hidup.</p>'
    },
    'PG': {
      title: 'Komisi Pembangunan Gereja (PG)',
      content: '<p><strong>Tugas Pokok:</strong><br>Bertanggung jawab atas perencanaan, pelaksanaan, dan pengawasan pembangunan serta pemeliharaan sarana prasarana gereja.</p><p><strong>Fungsi:</strong><br>1. Menyusun rencana induk pembangunan fisik gereja.<br>2. Mengelola proses renovasi dan perawatan gedung serta aset gereja.<br>3. Memastikan ketersediaan fasilitas yang representatif untuk ibadah dan pelayanan.</p>'
    },
    'Inforkom-Litbang': {
      title: 'Komisi Informasi, Organisasi, Komunikasi, Penelitian dan Pengembangan (Inforkom-Litbang)',
      content: '<p><strong>Tugas Pokok:</strong><br>Mengelola sistem informasi, komunikasi publik, tata organisasi, serta melakukan penelitian dan pengembangan jemaat.</p><p><strong>Fungsi:</strong><br>1. Mengelola media komunikasi gereja (website, media sosial, warta jemaat).<br>2. Melakukan pendataan dan pengolahan data umat secara digital.<br>3. Melakukan kajian dan evaluasi program kerja untuk pengembangan kualitas jemaat ke depan.</p>'
    }
  },
  umat: [],
  proposals: []
};

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Beranda')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return authService.isAuthenticated()
  })
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  const [siteContent, setSiteContent] = useState<FullContent>(() => {
    const saved = localStorage.getItem('gpibSiteContent')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...DEFAULT_CONTENT,
          ...parsed,
          pages: { ...DEFAULT_CONTENT.pages, ...parsed.pages },
          proposals: parsed.proposals || []
        }
      } catch (e) {
        return DEFAULT_CONTENT
      }
    }
    return DEFAULT_CONTENT
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [supabaseProposals, setSupabaseProposals] = useState<SupabaseProposal[]>([])
  
  // Editor states
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [editSiteTitle, setEditSiteTitle] = useState('')
  const [editBerandaPdf, setEditBerandaPdf] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showPdfReader, setShowPdfReader] = useState(false)

  // Data Umat States
  const [userSearch, setUserSearch] = useState('')
  const [adminSearch, setAdminSearch] = useState('')
  const [umatForm, setUmatForm] = useState<Omit<UmatRecord, 'id' | 'isPending'>>({
    nama: '', status: 'Jemaat', nik: '', alamat: '', noHp: '', photo: '', kk: ''
  })

  // New States for Non-Admin Data Umat Flow
  const [userSearchResult, setUserSearchResult] = useState<UmatRecord | null>(null)
  const [hasUserSearched, setHasUserSearched] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [userUmatForm, setUserUmatForm] = useState<Omit<UmatRecord, 'id' | 'isPending'>>({
    nama: '', status: 'Jemaat', nik: '', alamat: '', noHp: '', photo: '', kk: ''
  })
  const [userSubmitMessage, setUserSubmitMessage] = useState<string | null>(null)
  const [isSubmittingUserForm, setIsSubmittingUserForm] = useState(false)

  // Tutup menu otomatis setiap kali tab berubah
  useEffect(() => {
    setIsMobileMenuOpen(false)
    setIsDropdownOpen(false)
  }, [activeTab])

  // Refactor fetchData to be reusable for polling
  const fetchData = async (isSilent = false) => {
    if (!isSilent) console.log("Memulai pengambilan data dari Google Drive...");
    try {
      const response = await fetch(`${SCRIPT_URL}?t=${Date.now()}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json()
      if (!isSilent) console.log("Data berhasil diambil dari Drive:", data);
      
      if (data && (data.settings || data.pages)) {
        const migratedPages = { ...data.pages };
        Object.keys(migratedPages).forEach(key => {
          const page = migratedPages[key];
          if (page && !page.content && page.blocks) {
            page.content = page.blocks.map((b: any) => {
              if (b.type === 'text') return `<p>${b.value.replace(/\n/g, '<br>')}</p>`;
              if (b.type === 'image') return `<div class="content-image-wrapper"><img src="${b.value}" class="content-image" /></div>`;
              return '';
            }).join('');
          }
        });

        // SAFETY: Only update if the incoming data actually contains records
        // This prevents overwriting with empty arrays if the script fails to fetch records
        const mergedContent = {
          ...siteContent, // Start with current content
          settings: data.settings ? { ...DEFAULT_CONTENT.settings, ...data.settings } : siteContent.settings,
          pages: data.pages ? { ...DEFAULT_CONTENT.pages, ...migratedPages } : siteContent.pages,
          umat: (data.umat && data.umat.length > 0) ? data.umat : siteContent.umat
        }
        
        setSiteContent(prev => {
          const isSameUmat = JSON.stringify(prev.umat) === JSON.stringify(mergedContent.umat);
          const isSamePages = JSON.stringify(prev.pages) === JSON.stringify(mergedContent.pages);
          const isSameSettings = JSON.stringify(prev.settings) === JSON.stringify(mergedContent.settings);
          
          if (!isSameUmat || !isSamePages || !isSameSettings) {
            if (!isSilent) console.log("Mendapatkan data baru, memperbarui state...");
            localStorage.setItem('gpibSiteContent', JSON.stringify(mergedContent));
            return mergedContent;
          }
          return prev;
        });
      }
    } catch (error) {
      if (!isSilent) console.error("Gagal mengambil data dari Google Drive:", error)
    } finally {
      if (!isSilent) setIsLoading(false)
    }
  }

  // Fetch data on mount and setup polling
  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 15000) // Increased interval slightly
    return () => clearInterval(interval)
  }, [])

  const fetchSupabaseProposals = async () => {
    console.log('Memulai fetch proposal dari Supabase...');
    try {
      const { data, error } = await supabase
        .from('riwayat_download')
        .select('*')
        .order('no_urut', { ascending: false });
      
      if (error) {
        console.error('Error Supabase fetch:', error.message);
        // If it's a 404 or table not found, we should probably warn the user
        if (error.code === 'PGRST116' || error.message.includes('not found')) {
          console.error('PENTING: Tabel riwayat_download belum dibuat di Supabase!');
        }
      } else if (data) {
        console.log('Berhasil fetch Supabase:', data.length, 'data ditemukan');
        setSupabaseProposals(data);
      }
    } catch (err) {
      console.error('Exception saat fetch Supabase:', err);
    }
  };

  useEffect(() => {
    console.log('Setting up Supabase real-time channel...');
    fetchSupabaseProposals();

    const channel = supabase
      .channel('public:riwayat_download')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_download' }, (payload) => {
        console.log('Real-time change detected!', payload);
        fetchSupabaseProposals();
      })
      .subscribe((status) => {
        console.log('Supabase subscription status:', status);
      });

    return () => {
      console.log('Cleaning up Supabase channel');
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      setEditSiteTitle(siteContent.settings.title || '')
      setEditLogo(siteContent.settings.logo || '')
      setEditBerandaPdf(siteContent.settings.berandaPdf || '')
      if (siteContent.pages[activeTab]) {
        setEditTitle(siteContent.pages[activeTab].title || '')
        setEditContent(siteContent.pages[activeTab].content || '')
      }
    }
  }, [isLoggedIn, activeTab, siteContent])

  const handleLogout = () => {
    authService.logout()
    setIsLoggedIn(false)
    setActiveTab('Beranda')
  }

  const saveChanges = async (updatedData?: any) => {
    setIsSaving(true)
    
    const finalTitle = updatedData?.title || editTitle
    const finalContent = updatedData?.content || editContent
    const finalSiteTitle = updatedData?.siteTitle || editSiteTitle
    const finalLogo = updatedData?.siteLogo || editLogo
    const finalBerandaPdf = updatedData?.berandaPdf || editBerandaPdf
    
    const newContent = {
      ...siteContent,
      settings: { logo: finalLogo, title: finalSiteTitle, berandaPdf: finalBerandaPdf },
      pages: {
        ...siteContent.pages,
        [activeTab]: { title: finalTitle, content: finalContent }
      }
    }
    
    setSiteContent(newContent)
    localStorage.setItem('gpibSiteContent', JSON.stringify(newContent))

    try {
      const payload = JSON.stringify({ action: 'updateContent', data: newContent });
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload,
      })
      if (updatedData) {
        alert('Perubahan telah dikirim! \n\nCatatan: Mohon tunggu 5 detik sebelum merefresh halaman.');
      }
    } catch (error) {
      console.error("Gagal menyimpan ke Google Drive:", error)
      alert('Gagal sinkron ke Google Drive.');
    } finally {
      setIsSaving(false)
    }
  }

  // Data Umat Handlers
  const handleSaveUmat = async () => {
    if (!umatForm.nama) {
      alert('Nama Umat harus diisi.')
      return
    }

    // Filter out any pending version of this person if admin is saving it officially
    const newUmatList = siteContent.umat.filter(u => u.nama.toLowerCase() !== umatForm.nama.toLowerCase());
    newUmatList.push({ ...umatForm, id: Date.now().toString(), isPending: false });

    const newContent = { ...siteContent, umat: newUmatList }
    setSiteContent(newContent)
    localStorage.setItem('gpibSiteContent', JSON.stringify(newContent))

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateUmat', data: newContent.umat }),
      })
      alert('Data Umat Berhasil Disimpan!')
    } catch (error) {
      console.error("Gagal sinkron data umat:", error)
    }

    setUmatForm({ nama: '', status: 'Jemaat', nik: '', alamat: '', noHp: '', photo: '', kk: '' })
    setAdminSearch('')
  }

  const handleDeleteUmat = async (targetNama?: string) => {
    const namaToSearch = targetNama || umatForm.nama
    if (!namaToSearch) return

    if (window.confirm(`Apakah Anda yakin ingin menghapus data umat: ${namaToSearch}?`)) {
      const newUmatList = siteContent.umat.filter(u => u.nama.toLowerCase() !== namaToSearch.toLowerCase())
      const newContent = { ...siteContent, umat: newUmatList }
      setSiteContent(newContent)
      localStorage.setItem('gpibSiteContent', JSON.stringify(newContent))

      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateUmat', data: newContent.umat }),
        })
        alert('Data Umat Berhasil Dihapus!')
      } catch (error) {
        console.error("Gagal menghapus data umat:", error)
      }

      if (!targetNama || targetNama.toLowerCase() === umatForm.nama.toLowerCase()) {
        setUmatForm({ nama: '', status: 'Jemaat', nik: '', alamat: '', noHp: '', photo: '', kk: '' })
        setAdminSearch('')
      }
    }
  }

  const handleApproveUmat = async (umat: UmatRecord) => {
    // 1. Remove any existing entries (both pending and official) with same name
    const cleanList = siteContent.umat.filter(u => u.nama.toLowerCase() !== umat.nama.toLowerCase());
    
    // 2. Add as official (isPending: false)
    const officialUmat = { ...umat, isPending: false, id: Date.now().toString() };
    const newUmatList = [...cleanList, officialUmat];

    const newContent = { ...siteContent, umat: newUmatList };
    setSiteContent(newContent);
    localStorage.setItem('gpibSiteContent', JSON.stringify(newContent));

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'updateUmat', data: newContent.umat }),
      });
      alert('Data Umat Berhasil Disimpan & Diverifikasi!');
    } catch (error) {
      console.error("Gagal verifikasi data umat:", error);
    }
  }

  const handleRejectUmat = async (umatId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus pengajuan revisi mandiri ini?')) {
      const newUmatList = siteContent.umat.filter(u => u.id !== umatId);
      const newContent = { ...siteContent, umat: newUmatList };
      
      setSiteContent(newContent);
      localStorage.setItem('gpibSiteContent', JSON.stringify(newContent));

      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'updateUmat', data: newContent.umat }),
        });
        alert('Pengajuan Berhasil Dihapus!');
      } catch (error) {
        console.error("Gagal menghapus pengajuan:", error);
      }
    }
  }

  const onEditUmat = (u: UmatRecord) => {
    setUmatForm({
      nama: u.nama,
      status: u.status,
      nik: u.nik,
      alamat: u.alamat,
      noHp: u.noHp,
      photo: u.photo,
      kk: u.kk
    })
    setAdminSearch(u.nama)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onAdminSearch = (name: string) => {
    setAdminSearch(name)
    // Only search official umat
    const found = siteContent.umat.find(u => !u.isPending && u.nama.toLowerCase() === name.toLowerCase())
    if (found) {
      setUmatForm({
        nama: found.nama,
        status: found.status,
        nik: found.nik,
        alamat: found.alamat,
        noHp: found.noHp,
        photo: found.photo,
        kk: found.kk
      })
    }
  }

  const handleUmatFile = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'kk') => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File terlalu besar! Maksimal ukuran file adalah 5 MB.')
        e.target.value = ''
        return
      }
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string
        const compressed = await compressImage(base64, 800, 0.6)
        setUmatForm({ ...umatForm, [field]: compressed })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUserSearch = () => {
    if (!userSearch.trim()) return;
    // Search only official umat
    const officialUmat = siteContent.umat.filter(u => !u.isPending);
    const found = officialUmat.find(u => u.nama.toLowerCase().includes(userSearch.toLowerCase()));
    setUserSearchResult(found || null);
    setHasUserSearched(true);
    setShowUserForm(false);
    setUserSubmitMessage(null);
  }

  const handleUserFormSubmit = async () => {
    if (!userUmatForm.nama) {
      alert('Nama Umat wajib diisi.');
      return;
    }

    setIsSubmittingUserForm(true);
    try {
      const verificationRecord: UmatRecord = { 
        ...userUmatForm, 
        id: 'verify_' + Date.now(),
        isPending: true // MARK AS PENDING
      };
      
      // Push to the main UMAT list but with isPending=true
      const newUmatList = [...siteContent.umat, verificationRecord];
      const newContent = { ...siteContent, umat: newUmatList };
      
      setSiteContent(newContent);
      localStorage.setItem('gpibSiteContent', JSON.stringify(newContent));

      // Persist everything to Google Drive
      const payload = JSON.stringify({ action: 'updateUmat', data: newContent.umat });
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });
      
      setUserSubmitMessage('Data berhasil dikirim untuk di verifikasi admin GPIB');
      setShowUserForm(false);
      setUserUmatForm({ nama: '', status: 'Jemaat', nik: '', alamat: '', noHp: '', photo: '', kk: '' });
    } catch (error) {
      console.error("Gagal mengirim data verifikasi:", error);
      alert('Gagal mengirim data.');
    } finally {
      setIsSubmittingUserForm(false);
    }
  }

  const renderDataUmat = () => {
    const officialUmat = siteContent.umat.filter(u => !u.isPending);
    const pendingUmat = siteContent.umat.filter(u => u.isPending);

    return (
      <div className="page-card">
        {isLoggedIn ? <h2>Data Umat & Statistik</h2> : <h2>Data Umat</h2>}
        
        {isLoggedIn ? (
          <div className="admin-data-section">
            <div className="admin-data-form">
              <h3>Form Input Data Umat</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nama Umat:</label>
                  <input type="text" value={umatForm.nama} onChange={e => setUmatForm({...umatForm, nama: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Status:</label>
                  <select value={umatForm.status} onChange={e => setUmatForm({...umatForm, status: e.target.value})}>
                    <option value="Jemaat">Jemaat</option>
                    <option value="Simpatisan">Simpatisan</option>
                    <option value="Majelis">Majelis</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>NIK:</label>
                  <input type="text" value={umatForm.nik} onChange={e => setUmatForm({...umatForm, nik: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>No. HP:</label>
                  <input type="text" value={umatForm.noHp} onChange={e => setUmatForm({...umatForm, noHp: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label>Alamat:</label>
                  <textarea value={umatForm.alamat} onChange={e => setUmatForm({...umatForm, alamat: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Upload Photo (Maksimal 5 MB):</label>
                  <input type="file" accept="image/*" onChange={e => handleUmatFile(e, 'photo')} />
                </div>
                <div className="form-group">
                  <label>Upload KK (Kartu Keluarga - Maksimal 5 MB):</label>
                  <input type="file" accept="image/*" onChange={e => handleUmatFile(e, 'kk')} />
                </div>
              </div>

              <div className="photo-previews">
                {umatForm.photo && (
                  <div className="photo-preview-item">
                    <img src={umatForm.photo} alt="Umat" />
                    <span>Photo</span>
                  </div>
                )}
                {umatForm.kk && (
                  <div className="photo-preview-item">
                    <img src={umatForm.kk} alt="KK" />
                    <span>KK</span>
                  </div>
                )}
              </div>

              <div className="search-box" style={{marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '15px'}}>
                <input 
                  type="text" 
                  placeholder="Cari Nama untuk Edit Data..." 
                  value={adminSearch}
                  onChange={e => onAdminSearch(e.target.value)}
                />
              </div>
              <div className="admin-action-buttons">
                <button className="btn-save" onClick={handleSaveUmat}>SIMPAN / PERBAHARUI DATA UMAT</button>
                {officialUmat.some(u => u.nama.toLowerCase() === (umatForm.nama || '').toLowerCase()) && (
                  <button className="btn-delete" onClick={() => handleDeleteUmat()}>HAPUS DATA</button>
                )}
              </div>
            </div>

            <div className="admin-umat-list" style={{marginTop: '40px'}}>
              <h3>Daftar Seluruh Data Umat</h3>
              <div className="table-responsive">
                <table className="umat-table admin-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Umat</th>
                      <th>Status</th>
                      <th>NIK</th>
                      <th>No. HP</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialUmat.length > 0 ? officialUmat.map((u, idx) => (
                      <tr key={u.id}>
                        <td>{idx + 1}</td>
                        <td>{u.nama}</td>
                        <td>{u.status}</td>
                        <td>{u.nik || '-'}</td>
                        <td>{u.noHp || '-'}</td>
                        <td>
                          <div className="table-actions">
                            <button className="btn-edit-small" onClick={() => onEditUmat(u)}>Edit</button>
                            <button className="btn-delete-small" onClick={() => handleDeleteUmat(u.nama)}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} style={{textAlign: 'center'}}>Belum ada data umat.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-verification-list" style={{marginTop: '50px', borderTop: '2px solid var(--secondary-color)', paddingTop: '30px'}}>
              <h3 style={{ color: 'var(--primary-color)' }}>Antrean Revisi / Update Mandiri</h3>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '15px' }}>
                Berikut adalah data yang diisi secara mandiri oleh umat dan memerlukan verifikasi Admin.
              </p>
              <div className="table-responsive">
                <table className="umat-table admin-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Nama Umat</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUmat.length > 0 ? pendingUmat.map((u, idx) => (
                      <tr key={u.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: '600' }}>{u.nama}</td>
                        <td>{u.status}</td>
                        <td>
                          <div className="table-actions">
                            <button 
                              className="btn-save" 
                              style={{ padding: '6px 15px', fontSize: '0.8rem' }}
                              onClick={() => handleApproveUmat(u)}
                            >
                              Simpan
                            </button>
                            <button 
                              className="btn-delete" 
                              style={{ padding: '6px 15px', fontSize: '0.8rem', marginLeft: '8px' }}
                              onClick={() => handleRejectUmat(u.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{textAlign: 'center', padding: '30px', color: '#888'}}>
                          Tidak ada antrean revisi mandiri saat ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="user-data-section">
            <div className="user-search-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Cari Nama Umat..." 
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <button className="btn-save" onClick={handleUserSearch} style={{ padding: '0 30px' }}>CARI</button>
            </div>

            {hasUserSearched && (
              <div className="search-results-section">
                <div className="table-responsive">
                  <table className="umat-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>NAMA UMAT</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userSearchResult ? (
                        <tr>
                          <td>1</td>
                          <td>
                            {userSearchResult.nama}
                            <div style={{ marginTop: '8px' }}>
                              <button 
                                className="btn-edit-small" 
                                onClick={() => {
                                  setUserUmatForm({ ...userSearchResult });
                                  setShowUserForm(true);
                                  setUserSubmitMessage(null);
                                }}
                              >
                                revisi
                              </button>
                            </div>
                          </td>
                          <td>{userSearchResult.status}</td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
                            Data Tidak Ditemukan
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!userSearchResult && (
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button 
                      className="btn-save" 
                      onClick={() => {
                        setUserUmatForm({ nama: '', status: 'Jemaat', nik: '', alamat: '', noHp: '', photo: '', kk: '' });
                        setShowUserForm(true);
                        setUserSubmitMessage(null);
                      }}
                    >
                      Isi secara mandiri
                    </button>
                  </div>
                )}
              </div>
            )}

            {showUserForm && (
              <div className="user-input-form" style={{ marginTop: '40px', padding: '25px', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--nav-bg)' }}>Lengkapi Data Umat</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nama Umat <span style={{ color: 'red' }}>*</span>:</label>
                    <input 
                      type="text" 
                      value={userUmatForm.nama} 
                      onChange={e => setUserUmatForm({...userUmatForm, nama: e.target.value})} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Status:</label>
                    <select value={userUmatForm.status} onChange={e => setUserUmatForm({...userUmatForm, status: e.target.value})}>
                      <option value="Jemaat">Jemaat</option>
                      <option value="Simpatisan">Simpatisan</option>
                      <option value="Majelis">Majelis</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>NIK:</label>
                    <input type="text" value={userUmatForm.nik} onChange={e => setUserUmatForm({...userUmatForm, nik: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>No. HP:</label>
                    <input type="text" value={userUmatForm.noHp} onChange={e => setUserUmatForm({...userUmatForm, noHp: e.target.value})} />
                  </div>
                  <div className="form-group full-width">
                    <label>Alamat:</label>
                    <textarea value={userUmatForm.alamat} onChange={e => setUserUmatForm({...userUmatForm, alamat: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Upload Photo (Maksimal 5 MB):</label>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File terlalu besar! Maksimal ukuran file adalah 5 MB.');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          const compressed = await compressImage(base64, 800, 0.6);
                          setUserUmatForm({ ...userUmatForm, photo: compressed });
                        }
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                  <div className="form-group">
                    <label>Upload KK (Kartu Keluarga - Maksimal 5 MB):</label>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          alert('File terlalu besar! Maksimal ukuran file adalah 5 MB.');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          const compressed = await compressImage(base64, 800, 0.6);
                          setUserUmatForm({ ...userUmatForm, kk: compressed });
                        }
                        reader.readAsDataURL(file);
                      }
                    }} />
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <button 
                    className="btn-save" 
                    onClick={handleUserFormSubmit}
                    disabled={isSubmittingUserForm}
                  >
                    {isSubmittingUserForm ? 'Mengirim...' : 'KIRIM'}
                  </button>
                </div>
              </div>
            )}

            {userSubmitMessage && (
              <div style={{ 
                marginTop: '25px', 
                padding: '15px', 
                backgroundColor: '#e8f5e9', 
                color: '#2e7d32', 
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '600',
                border: '1px solid #c8e6c9'
              }}>
                {userSubmitMessage}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const handleAddProposalSupabase = async (pemohon: string, tujuanSurat: string) => {
    const { data, error } = await supabase.rpc('create_proposal', {
      pemohon_name: pemohon,
      tujuan: tujuanSurat
    });
    if (error) {
      console.error('Error adding proposal:', error);
      throw error;
    }
    return data;
  };

  const handleEditProposalSupabase = async (id: number, updates: Partial<SupabaseProposal>) => {
    const { error } = await supabase
      .from('riwayat_download')
      .update(updates)
      .eq('id', id);
    if (error) {
      console.error('Error updating proposal:', error);
      throw error;
    }
  };

  const handleDeleteProposalSupabase = async (id: number) => {
    const { error } = await supabase
      .from('riwayat_download')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Error deleting proposal:', error);
      throw error;
    }
  };

  const renderPage = () => {
    if (activeTab === 'Login' && !isLoggedIn) {
      return (
        <LoginForm onLoginSuccess={() => {
          setIsLoggedIn(true);
          setActiveTab('Beranda');
        }} />
      )
    }

    if (activeTab === 'Data Umat') {
      return renderDataUmat()
    }

    if (activeTab === 'Download') {
      return (
        <DownloadProposal 
          isLoggedIn={isLoggedIn} 
          proposals={supabaseProposals}
          onAddProposal={handleAddProposalSupabase}
          onEditProposal={handleEditProposalSupabase}
          onDeleteProposal={handleDeleteProposalSupabase}
        />
      )
    }

    const currentPage = siteContent.pages[activeTab]
    if (!currentPage) return null

    if (activeTab === 'Beranda') {
      return (
        <div className="page-content">
          {!isLoggedIn ? (
            <div className="page-card">
              <h2>{currentPage.title}</h2>
              <div 
                className="content-body" 
                dangerouslySetInnerHTML={{ __html: currentPage.content || '' }} 
              />
              
              {siteContent.settings.berandaPdf && (
                <div className="pdf-viewer-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                  {!showPdfReader ? (
                    <button className="btn-save" onClick={() => setShowPdfReader(true)}>Read More (Buka PDF)</button>
                  ) : (
                    <div className="pdf-reader-container">
                      <button className="btn-delete" onClick={() => setShowPdfReader(false)} style={{ marginBottom: '10px' }}>Tutup PDF</button>
                      <iframe 
                        src={`${siteContent.settings.berandaPdf}#toolbar=0`} 
                        width="100%" 
                        height="600px" 
                        style={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        title="PDF Viewer"
                      ></iframe>
                      <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
                        Catatan: Download dinonaktifkan untuk pengunjung umum.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <AdminDashboard 
              initialTitle={editTitle || ''}
              initialContent={editContent || ''}
              initialSiteTitle={editSiteTitle || ''}
              initialSiteLogo={editLogo || ''}
              initialBerandaPdf={editBerandaPdf || ''}
              onSave={(data: any) => {
                setEditTitle(data.title || '');
                setEditContent(data.content || '');
                setEditSiteTitle(data.siteTitle || '');
                setEditLogo(data.siteLogo || '');
                setEditBerandaPdf(data.berandaPdf || '');
              }}
              onPublish={(data: any) => saveChanges(data)}
              isSaving={isSaving}
            />
          )}
        </div>
      )
    }

    return (
      <div className="page-content">
        {!isLoggedIn ? (
          <div className="page-card">
            <h2>{currentPage.title}</h2>
            <div 
              className="content-body" 
              dangerouslySetInnerHTML={{ __html: currentPage.content || '' }} 
            />
          </div>
        ) : (
          <AdminDashboard 
            initialTitle={editTitle || ''}
            initialContent={editContent || ''}
            initialSiteTitle={editSiteTitle || ''}
            initialSiteLogo={editLogo || ''}
            initialBerandaPdf={editBerandaPdf || ''}
            onSave={(data: any) => {
              setEditTitle(data.title || '');
              setEditContent(data.content || '');
              setEditSiteTitle(data.siteTitle || '');
              setEditLogo(data.siteLogo || '');
              setEditBerandaPdf(data.berandaPdf || '');
            }}
            onPublish={(data: any) => saveChanges(data)}
            isSaving={isSaving}
          />
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo-container">
          <img src={siteContent?.settings?.logo || "/LOGO_GPIB.jpg"} alt="Logo GPIB" />
        </div>
        <p>Membuka situs GPIB Banda Aceh...</p>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <img src={siteContent.settings.logo} alt="Logo GPIB" />
        </div>
        <h1>{siteContent.settings.title}</h1>
      </header>

      <nav className="navbar">
        <div className="mobile-menu-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? '✕' : '☰'} Menu
        </div>
        <ul className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <li 
            className={activeTab === 'Beranda' ? 'active' : ''}
            onClick={() => { setActiveTab('Beranda'); setIsMobileMenuOpen(false); }}
          >
            Beranda
          </li>
          <li 
            className={activeTab === 'Jadwal Ibadah' ? 'active' : ''}
            onClick={() => { setActiveTab('Jadwal Ibadah'); setIsMobileMenuOpen(false); }}
          >
            Jadwal Ibadah
          </li>
          
          <li className={`dropdown ${['Organisasi Gereja', 'PA', 'PT', 'GP', 'PKB', 'PKP', 'GermasaLH', 'PG', 'Inforkom-Litbang'].includes(activeTab) ? 'active' : ''} ${isDropdownOpen ? 'dropdown-open' : ''}`}>
            <span onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              Organisasi Gereja {isDropdownOpen ? '▴' : '▾'}
            </span>
            <ul className="dropdown-menu">
              <li onClick={() => { setActiveTab('Organisasi Gereja'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Struktur Organisasi</li>
              <li className="dropdown-submenu">
                <span>Pelayanan Kategorial (PELKAT) ▸</span>
                <ul className="submenu-list">
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('PA'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Pelayanan Anak (PA)</li>
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('PT'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Pelayanan Taruna (PT)</li>
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('GP'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Gerakan Pemuda (GP)</li>
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('PKB'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Persekutuan Kaum Bapak (PKB)</li>
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('PKP'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Persekutuan Kaum Perempuan (PKP)</li>
                </ul>
              </li>
              <li className="dropdown-submenu">
                <span>KOMISI ▸</span>
                <ul className="submenu-list">
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('GermasaLH'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>GermasaLH (Gereja, Masyarakat, Agama, Lingkungan Hidup)</li>
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('PG'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>PG (Pembangunan Gereja)</li>
                  <li onClick={(e) => { e.stopPropagation(); setActiveTab('Inforkom-Litbang'); setIsMobileMenuOpen(false); setIsDropdownOpen(false); }}>Inforkom-Litbang (Info, Orga, Kom, Litbang)</li>
                </ul>
              </li>
            </ul>
          </li>

          <li 
            className={activeTab === 'Data Umat' ? 'active' : ''}
            onClick={() => { setActiveTab('Data Umat'); setIsMobileMenuOpen(false); }}
          >
            Data Umat
          </li>

          {isLoggedIn ? (
            <li onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>Logout (Admin)</li>
          ) : (
            <li 
              className={activeTab === 'Login' ? 'active' : ''} 
              onClick={() => { setActiveTab('Login'); setIsMobileMenuOpen(false); }}
            >
              Login
            </li>
          )}

          <li 
            className={activeTab === 'Download' ? 'active' : ''}
            onClick={() => { setActiveTab('Download'); setIsMobileMenuOpen(false); }}
          >
            Download
          </li>
        </ul>
      </nav>

      <main className="main-content">
        {renderPage()}
      </main>

      <footer className="footer">
        &copy; 2026 GPIB BANDA ACEH. All Rights Reserved.
      </footer>
    </div>
  )
}

export default App
