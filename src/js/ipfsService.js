class IPFSService {
  constructor(cfg={}) {
    this.gateway = cfg.gateway || 'https://gateway.pinata.cloud/ipfs/';
    this.apiUrl = cfg.apiUrl || 'http://localhost:4000/api';
    this.useProxy = cfg.useProxy !== undefined ? cfg.useProxy : true;
  }
  async uploadFile(file){
    this.#checkFile(file);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${this.apiUrl}/ipfs/pinFile`, { method:'POST', body: fd });
    const data = await r.json();
    if(!r.ok || data.error) throw new Error(data.error || 'File pin failed');
    return { cid: data.cid, url: this.getFileUrl(data.cid) };
  }
  async uploadMetadata(meta){
    const r = await fetch(`${this.apiUrl}/ipfs/pinJSON`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(meta)
    });
    const data = await r.json();
    if(!r.ok || data.error) throw new Error(data.error || 'Metadata pin failed');
    return { cid: data.cid, url: this.getFileUrl(data.cid) };
  }
  getFileUrl(cid){ return `${this.gateway}${cid}`; }
  #checkFile(f){
    const types=['image/png','image/jpeg','image/jpg','image/webp'];
    if(!types.includes(f.type)) throw new Error('Invalid image type');
    if(f.size > 5*1024*1024) throw new Error('Max 5MB');
  }
}
if(typeof window!=='undefined') window.IPFSService = IPFSService;