import { useState } from 'react';
import { Printer, QrCode } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function QRCodeManager() {
  const merchant = JSON.parse(localStorage.getItem('merchant') || '{}');
  const baseUrl = `https://zapgarcom.com.br/${merchant.slug}`;
  const [tableCount, setTableCount] = useState<number>(10);

  const printQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      useToastStore.getState().addToast("Por favor, permita pop-ups para imprimir.", 'error');
      return;
    }

    const cardsHtml = Array.from({ length: tableCount }).map((_, i) => {
      const tableNumber = i + 1;
      const url = `${baseUrl}?mesa=${tableNumber}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      return `
        <div class="card">
          <div class="header">MESA ${tableNumber}</div>
          <img src="${qrUrl}" alt="QR Code Mesa ${tableNumber}" />
          <div class="footer">Aponte a câmera para pedir</div>
        </div>
      `;
    }).join('');

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; text-align: center; background: white; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; justify-items: center; }
            .card { border: 2px solid #000; border-radius: 12px; padding: 15px; width: 180px; text-align: center; display: flex; flex-direction: column; align-items: center; break-inside: avoid; margin-bottom: 20px; }
            .header { font-weight: bold; font-size: 24px; margin-bottom: 15px; }
            img { width: 150px; height: 150px; }
            .footer { font-size: 12px; margin-top: 15px; font-weight: bold; }
            @media print {
              body { padding: 0; }
              .card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h2>QR Codes - ${merchant.name || 'Loja'}</h2>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            // Aguarda imagens carregarem antes de imprimir
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 1500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2 p-8 font-inter">
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-black dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black">
            <QrCode size={32} />
          </div>
          <div>
            <h2 className="font-podium text-3xl uppercase tracking-widest text-black dark:text-white">QR Codes de Mesa</h2>
            <p className="text-sm text-black/60 dark:text-white/60">Gere e imprima QR Codes únicos para cada mesa do seu estabelecimento.</p>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-8 rounded-[2rem] shadow-xl flex flex-col items-center justify-center text-center">
          <label className="block text-sm font-bold uppercase tracking-widest text-black/70 dark:text-white/70 mb-6">Quantas mesas você possui no salão?</label>
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setTableCount(Math.max(1, tableCount - 1))} className="w-12 h-12 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white font-bold text-xl">-</button>
            <input 
              type="number" 
              value={tableCount} 
              onChange={e => setTableCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 text-center bg-white dark:bg-black border border-black/10 dark:border-white/10 p-3 rounded-2xl font-podium text-2xl text-black dark:text-white focus:outline-none"
            />
            <button onClick={() => setTableCount(tableCount + 1)} className="w-12 h-12 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white font-bold text-xl">+</button>
          </div>

          <button 
            onClick={printQRCodes}
            className="bg-black dark:bg-white text-white dark:text-black font-bold text-sm uppercase tracking-widest py-4 px-12 rounded-xl flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl"
          >
            <Printer size={20} />
            Gerar e Imprimir ({tableCount} Mesas)
          </button>
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 opacity-50 pointer-events-none">
          {Array.from({ length: Math.min(tableCount, 5) }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-black border border-black/10 dark:border-white/10 p-4 rounded-xl flex flex-col items-center shadow-md">
              <span className="font-bold text-xs uppercase tracking-widest text-black dark:text-white mb-2">Mesa {i + 1}</span>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(baseUrl + '?mesa=' + (i+1))}`} alt="QR" className="w-16 h-16 rounded" />
            </div>
          ))}
          {tableCount > 5 && (
             <div className="bg-white/30 dark:bg-black/30 border border-black/5 dark:border-white/5 p-4 rounded-xl flex flex-col items-center justify-center">
               <span className="font-bold text-xs uppercase tracking-widest text-black/50 dark:text-white/50">+ {tableCount - 5}</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
