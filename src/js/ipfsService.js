class IPFSService {
  constructor(cfg={}) {
    this.gateway = cfg.gateway || 'https://gateway.pinata.cloud/ipfs/';
    // Use Vercel serverless functions
    this.apiUrl = cfg.apiUrl || (window.location.origin + '/api');
    this.useProxy = cfg.useProxy !== undefined ? cfg.useProxy : true;
  }

  async uploadFile(file){
    this.#checkFile(file);
    
    // Convert file to base64 for serverless function
    const base64 = await this.#fileToBase64(file);
    
    const r = await fetch(`${this.apiUrl}/ipfs/pinFile`, { 
      method:'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ file: base64, fileName: file.name })
    });
    
    const data = await r.json();
    if(!r.ok || data.error) throw new Error(data.error || 'File pin failed');
    return { cid: data.cid, url: data.url || this.getFileUrl(data.cid) };
  }

  async uploadMetadata(meta){
    const r = await fetch(`${this.apiUrl}/ipfs/pinJSON`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(meta)
    });
    
    const data = await r.json();
    if(!r.ok || data.error) throw new Error(data.error || 'Metadata pin failed');
    return { cid: data.cid, url: data.url || this.getFileUrl(data.cid) };
  }

  getFileUrl(cid){ return `${this.gateway}${cid}`; }

  #checkFile(f){
    const types=['image/png','image/jpeg','image/jpg','image/webp'];
    if(!types.includes(f.type)) throw new Error('Invalid image type');
    if(f.size > 5*1024*1024) throw new Error('Max 5MB');
  }

  #fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }
}

if(typeof window!=='undefined') window.IPFSService = IPFSService;