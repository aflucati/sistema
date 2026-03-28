import React, { useRef } from 'react';
import axios from 'axios';

interface UploadCSVProps {
  onUploadSuccess: (data: any) => void;
}

const UploadCSV: React.FC<UploadCSVProps> = ({ onUploadSuccess }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUploadSuccess(response.data);
    } catch (error) {
      alert('Erro ao enviar o arquivo.');
    }
  };

  return (
    <div style={{ margin: '24px 0' }}>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default UploadCSV;
