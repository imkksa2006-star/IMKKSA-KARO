import React from 'react';

interface HeaderAksiProps {
  onPublish: () => void;
  onPreview: () => void;
  isSaving: boolean;
}

const HeaderAksi: React.FC<HeaderAksiProps> = ({ onPublish, onPreview, isSaving }) => {
  return (
    <div className="editor-header-aksi">
      <div className="editor-status">
        {isSaving ? 'Menyimpan...' : 'Tersimpan'}
      </div>
      <div className="editor-actions-btns">
        <button className="btn-preview" onClick={onPreview}>Simpan Pratinjau</button>
        <button className="btn-publish" onClick={onPublish}>Publikasikan</button>
      </div>
    </div>
  );
};

export default HeaderAksi;
