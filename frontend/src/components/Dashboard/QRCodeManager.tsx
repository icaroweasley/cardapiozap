import { useState } from 'react';
import { Printer, QrCode } from 'lucide-react';
import { useToastStore } from '../../store/useToastStore';

export default function QRCodeManager() {
  const merchant = JSON.parse(localStorage.getItem('merchant') || '{}');
  const baseUrl = `https://zapgarcom.com.br/${merchant.slug}`;
  const [tableCount, setTableCount] = useState<number>(() => {
    return parseInt(localStorage.getItem(`tableCount_${merchant.id}`) || '10');
  });

  const updateTableCount = (newCount: number) => {
    setTableCount(newCount);
    localStorage.setItem(`tableCount_${merchant.id}`, newCount.toString());
  };

  const printQRCodes = (specificTable?: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      useToastStore.getState().addToast("Por favor, permita pop-ups para imprimir.", 'error');
      return;
    }

    const tablesToPrint = specificTable ? [specificTable] : Array.from({ length: tableCount }).map((_, i) => i + 1);

    const cardsHtml = tablesToPrint.map(tableNumber => {
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
          ${!specificTable ? `<h2>QR Codes - ${merchant.name || 'Loja'}</h2>` : ''}
          <div class="grid" style="${specificTable ? 'display:flex; justify-content:center;' : ''}">
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
    <div className="flex-1 flex flex-col h-full bg-white/40 dark:bg-black/40 backdrop-blur-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-up rounded-3xl lg:m-2 p-4 md:p-8 font-inter">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8 shrink-0">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-black dark:bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-white dark:text-black shrink-0">
            <QrCode className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div>
            <h2 className="font-podium text-xl md:text-3xl uppercase tracking-widest text-black dark:text-white">QR Codes de Mesa</h2>
            <p className="text-[10px] md:text-sm text-black/60 dark:text-white/60 leading-tight">Gere e imprima QR Codes únicos para cada mesa.</p>
          </div>
        </div>

        <div className="bg-white/60 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/10 p-3 md:p-5 rounded-2xl shadow-sm flex flex-row items-center justify-between gap-4 shrink-0 mb-4 md:mb-8">
          <div className="flex items-center gap-2 md:gap-4">
            <label className="text-[9px] md:text-sm font-bold uppercase tracking-widest text-black/70 dark:text-white/70 hidden sm:block">Mesas:</label>
            <div className="flex items-center gap-1 md:gap-2">
              <button onClick={() => updateTableCount(Math.max(1, tableCount - 1))} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white font-bold text-lg shrink-0">-</button>
              <input 
                type="number" 
                value={tableCount} 
                onChange={e => updateTableCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 md:w-16 text-center bg-white dark:bg-black border border-black/10 dark:border-white/10 p-1 md:p-2 rounded-lg md:rounded-xl font-podium text-sm md:text-lg text-black dark:text-white focus:outline-none"
              />
              <button onClick={() => updateTableCount(tableCount + 1)} className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-black dark:text-white font-bold text-lg shrink-0">+</button>
            </div>
          </div>

          <button 
            onClick={() => printQRCodes()}
            className="bg-black dark:bg-white text-white dark:text-black font-bold text-[9px] md:text-xs uppercase tracking-widest py-2 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-md shrink-0"
          >
            <Printer size={14} className="md:w-4 md:h-4" />
            <span className="hidden sm:inline">Imprimir Todas</span>
            <span className="sm:hidden">Imprimir ({tableCount})</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 md:pr-2 hide-scrollbar">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 pb-10">
            {Array.from({ length: tableCount }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 p-3 md:p-5 rounded-xl md:rounded-2xl flex flex-col items-center shadow-lg hover:border-black/30 dark:hover:border-white/30 transition-colors group">
                <span className="font-podium text-sm md:text-lg uppercase tracking-widest text-black dark:text-white mb-2 md:mb-4 shrink-0">Mesa {i + 1}</span>
                <div className="bg-white p-2 rounded-xl mb-3 md:mb-4 shadow-sm border border-black/5 aspect-square flex items-center justify-center w-full max-w-[120px] shrink-0">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(baseUrl + '?mesa=' + (i+1))}`} alt={`QR Mesa ${i+1}`} className="w-full h-full object-contain aspect-square" />
                </div>
                <button 
                  onClick={() => printQRCodes(i + 1)}
                  className="w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black dark:text-white rounded-lg font-inter text-[9px] md:text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2 transition-colors"
                >
                  <Printer size={12} className="md:w-[14px] md:h-[14px]" /> <span>Imprimir</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
