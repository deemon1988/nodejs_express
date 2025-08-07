function getFileType(mimeType) {
  const types = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-excel': 'XLS',
    'text/plain': 'TXT',
    'application/zip': 'ZIP',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF'
  };

  return types[mimeType] || 'Файл';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatContentType(contentType) {
   const types = {
    'free': '🎁 Бесплатно',
    'paid': '💎 Премиум',
    'subscription': '📚 По подписке',
  };

  return types[contentType] || '🎁 Бесплатно';
}


module.exports = {getFileType, formatFileSize, formatContentType}