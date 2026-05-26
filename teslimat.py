#!/usr/bin/env python3
"""
TylerShop — Otomatik Teslimat Scripti
Ödeme onaylandı → bu script ile ürün paketlenir ve e-postaya hazır hale gelir.
"""

import zipfile
import os
import shutil
from pathlib import Path
from datetime import datetime

BASE = Path(__file__).parent
DELIVERY = BASE / "deliveries"
DELIVERY.mkdir(exist_ok=True)


def package_prompt_pack(ref_code: str) -> Path:
    """Prompt pack'leri zip'le"""
    zip_path = DELIVERY / f"{ref_code}_prompt_pack.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, name in enumerate([
            "1_eticaret", "2_freelancer", "3_ogrenci", "4_kobi", "5_sosyalmedya"
        ], 1):
            src = BASE / "prompts" / f"{name}.md"
            zf.write(src, f"Prompt_Pack/{i:02d}_{name}.md")
        zf.writestr("Prompt_Pack/00_BASLA_BURADAN.txt", """🎉 TylerShop AI Prompt Pack — Hoş Geldiniz!

Bu pakette 5 sektör için toplam 250 adet test edilmiş Türkçe AI prompt'u bulacaksınız.

📁 Dosyalar:
  01_eticaret.md — E-Ticaret Satıcıları (50 prompt)
  02_freelancer.md — Freelancerlar (50 prompt)
  03_ogrenci.md — Öğrenci & Akademisyen (50 prompt)
  04_kobi.md — KOBİ İşletme (50 prompt)
  05_sosyalmedya.md — Sosyal Medya Yöneticileri (50 prompt)

🚀 Nasıl Kullanılır:
  1. Dosyayı açın, ihtiyacınız olan kategoriyi seçin
  2. Prompt'u kopyalayın
  3. ChatGPT / DeepSeek / Claude'a yapıştırın
  4. Sonucu alın!

📝 Her prompt şunları içerir:
  • Prompt metni (kopyala-yapıştır)
  • Kullanım amacı
  • Örnek çıktı (ne bekleyeceğinizi görün)
  • İpucu (nasıl daha iyi sonuç alırsınız)

🔄 Güncellemeler: AI modelleri geliştikçe prompt'lar güncellenir.
   Güncellemelerden haberdar olmak için bizi takip edin!

❓ Sorunuz varsa e-posta ile iletişime geçin.

TylerShop 🐺
""")
    return zip_path


def package_sozlesme_pack(ref_code: str) -> Path:
    """Sözleşme şablonlarını zip'le"""
    zip_path = DELIVERY / f"{ref_code}_sozlesme_pack.zip"
    sozlesmeler = BASE / "sozlesmeler"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(sozlesmeler.glob("*.md")):
            zf.write(f, f"Sozlesme_Sablonlari/{f.name}")
        zf.writestr("Sozlesme_Sablonlari/00_ONCE_BUNU_OKU.txt", """⚖️ TylerShop Sözleşme & Dilekçe Şablon Paketi

⚠️ ÖNEMLİ UYARI: Bu şablonlar bilgilendirme amaçlıdır, hukuki tavsiye yerine geçmez.
   Kullanmadan önce bir avukata danışmanız önerilir.

📁 30 adet doldurulabilir şablon:
  • İş & Freelance Sözleşmeleri (10 adet)
  • Kira & Gayrimenkul (5 adet)
  • Dilekçe & İhtarname (10 adet)
  • Diğer Hukuki Metinler (5 adet)

📝 Nasıl Kullanılır:
  1. İhtiyacınız olan şablonu açın
  2. [Köşeli parantez] içindeki yerleri kendi bilgilerinizle doldurun
  3. Yazdırın veya PDF olarak kaydedin

📚 Her şablonda:
  • İlgili kanun maddeleri
  • Kullanım kılavuzu
  • Doldurulabilir alanlar

TylerShop 🐺
""")
    return zip_path


def package_all(ref_code: str, product_id: str) -> Path:
    """Ürün ID'sine göre paketle"""
    if product_id == "prompt-pack":
        return package_prompt_pack(ref_code)
    elif product_id == "sozlesme-pack":
        return package_sozlesme_pack(ref_code)
    else:
        raise ValueError(f"Bilinmeyen ürün: {product_id}")


def list_deliveries():
    """Teslim edilen paketleri listele"""
    for f in sorted(DELIVERY.glob("*.zip"), key=os.path.getmtime, reverse=True):
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name} ({size_kb:.0f}KB)")


def clean_delivery(ref_code: str):
    """Teslimat dosyasını temizle"""
    for f in DELIVERY.glob(f"{ref_code}_*"):
        f.unlink()
        print(f"  Silindi: {f.name}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("TylerShop Teslimat Sistemi 🐺\n")
        print("Kullanım:")
        print("  python3 teslimat.py pack <ref_kodu> <urun_id>")
        print("    urun_id: prompt-pack | sozlesme-pack")
        print("  python3 teslimat.py list")
        print("  python3 teslimat.py clean <ref_kodu>")
        print()
        list_deliveries()
    elif sys.argv[1] == "pack":
        ref, pid = sys.argv[2], sys.argv[3]
        path = package_all(ref, pid)
        print(f"✅ Paket hazır: {path}")
    elif sys.argv[1] == "list":
        list_deliveries()
    elif sys.argv[1] == "clean":
        clean_delivery(sys.argv[2])
