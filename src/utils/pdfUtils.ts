import { PDFDocument } from 'pdf-lib';

export interface ProposalData {
  nomorSurat: string;
  tujuanSurat: string;
  tanggalSurat: string;
}

export const generateProposalPDF = async (data: ProposalData): Promise<Uint8Array> => {
  console.log('Memulai generateProposalPDF dengan data:', data);
  try {
    // 1. Load cover.pdf and isi.pdf from public folder
    const coverUrl = '/COVER.pdf';
    const isiUrl = '/ISI.pdf';

    console.log('Fetching PDF files...');
    const [coverRes, isiRes] = await Promise.all([
      fetch(coverUrl),
      fetch(isiUrl)
    ]);

    if (!coverRes.ok) throw new Error(`Gagal mengambil COVER.pdf: ${coverRes.status} ${coverRes.statusText}`);
    if (!isiRes.ok) throw new Error(`Gagal mengambil ISI.pdf: ${isiRes.status} ${isiRes.statusText}`);

    const [coverBytes, isiBytes] = await Promise.all([
      coverRes.arrayBuffer(),
      isiRes.arrayBuffer()
    ]);
    console.log('File PDF berhasil dimuat ke memori.');

    // 2. Load the cover PDF document
    const coverDoc = await PDFDocument.load(coverBytes);
    console.log('Cover PDF berhasil di-load oleh pdf-lib.');
    
    // 3. Get the form from the document
    const form = coverDoc.getForm();
    
    // DEBUG: Lihat semua nama field yang tersedia di PDF untuk memastikan kecocokan
    const fields = form.getFields();
    const fieldNames = fields.map(f => f.getName());
    console.log('Daftar field yang terdeteksi di PDF Nitro Pro:', fieldNames);

    // 4. Fill the fields by their names (tanggal_surat, nomor_surat, tujuan_surat)
    const fillField = (name: string, value: string) => {
      try {
        // Cek apakah field ada sebelum mencoba mengisi
        const exists = fieldNames.includes(name);
        if (exists) {
          const field = form.getTextField(name);
          field.setText(value);
          console.log(`[SUCCESS] Field "${name}" berhasil diisi.`);
        } else {
          console.warn(`[MISSING] Field "${name}" tidak ditemukan di PDF. Nama yang tersedia: ${fieldNames.join(', ')}`);
        }
      } catch (e) {
        console.error(`[ERROR] Gagal memproses field "${name}":`, e);
      }
    };

    fillField('tanggal_surat', data.tanggalSurat);
    fillField('nomor_surat', data.nomorSurat);
    fillField('tujuan_surat', data.tujuanSurat);

    // Update tampilan field (penting untuk beberapa generator PDF agar teks muncul)
    try {
      form.updateFieldAppearances();
    } catch (e) {
      console.warn('Gagal updateFieldAppearances, melanjutkan...', e);
    }
    
    // 5. Flatten the form
    form.flatten();

    // 6. Load the ISI PDF document
    const isiDoc = await PDFDocument.load(isiBytes);

    // 7. Merge documents
    // We add all pages from isiDoc to coverDoc
    const isiPages = await coverDoc.copyPages(isiDoc, isiDoc.getPageIndices());
    isiPages.forEach((page) => coverDoc.addPage(page));

    // 8. Save the document
    const pdfBytes = await coverDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
