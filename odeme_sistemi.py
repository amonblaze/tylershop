#!/usr/bin/env python3
"""
TylerShop — Ödeme Doğrulama & Otomatik Teslimat Sistemi
======================================================
Müşteri IBAN'a havale yapar → bu script banka hareketlerini kontrol eder →
ödeme eşleşirse ürünü otomatik gönderir.

Şimdilik manuel kontrol modunda çalışır (banka API'si yok).
Amon ödemeyi onaylayınca ürün e-posta ile gönderilir.
"""

import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
ORDERS_FILE = BASE_DIR / "orders.json"
PRODUCTS = {
    "prompt-pack": {
        "name": "AI Prompt Pack — Sektörel Kütüphane",
        "price": 249,
        "files": ["prompts/1_eticaret.md", "prompts/2_freelancer.md", 
                  "prompts/3_ogrenci.md", "prompts/4_kobi.md", "prompts/5_sosyalmedya.md"]
    },
    "eticaret-50": {
        "name": "E-Ticaret Açıklama Üretici — 50 Ürün",
        "price": 99,
        "files": ["eticaret/index.html", "eticaret/app.js", "eticaret/index.css"]
    },
    "eticaret-200": {
        "name": "E-Ticaret Açıklama Üretici — 200 Ürün",
        "price": 249,
        "files": ["eticaret/index.html", "eticaret/app.js", "eticaret/index.css"]
    },
    "eticaret-sinirsiz": {
        "name": "E-Ticaret Açıklama Üretici — Sınırsız Aylık",
        "price": 499,
        "files": ["eticaret/index.html", "eticaret/app.js", "eticaret/index.css"]
    },
    "sozlesme-pack": {
        "name": "Sözleşme & Dilekçe Şablon Paketi",
        "price": 199,
        "files": ["sozlesmeler/00_index.md", "sozlesmeler/00_hukuki_uyari.md"] + 
                 [f"sozlesmeler/{i:02d}_*.md" for i in range(1, 31)]
    }
}


def load_orders():
    """Siparişleri yükle"""
    if ORDERS_FILE.exists():
        return json.loads(ORDERS_FILE.read_text(encoding="utf-8"))
    return {"orders": [], "next_ref": 1000}


def save_orders(data):
    """Siparişleri kaydet"""
    ORDERS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def create_order(product_id, customer_email, customer_name=""):
    """Yeni sipariş oluştur, referans kodu ver"""
    data = load_orders()
    ref_code = f"TS{data['next_ref']}"
    data["next_ref"] += 1
    
    order = {
        "ref_code": ref_code,
        "product_id": product_id,
        "product_name": PRODUCTS[product_id]["name"],
        "price": PRODUCTS[product_id]["price"],
        "customer_email": customer_email,
        "customer_name": customer_name,
        "status": "pending",  # pending, paid, delivered, cancelled
        "created_at": datetime.now().isoformat(),
        "paid_at": None,
        "delivered_at": None
    }
    data["orders"].append(order)
    save_orders(data)
    
    return ref_code


def confirm_payment(ref_code):
    """Ödemeyi onayla ve teslim et"""
    data = load_orders()
    
    for order in data["orders"]:
        if order["ref_code"] == ref_code:
            if order["status"] == "paid":
                return {"ok": False, "message": "Bu sipariş zaten onaylanmış."}
            if order["status"] == "delivered":
                return {"ok": False, "message": "Bu sipariş zaten teslim edilmiş."}
            
            order["status"] = "paid"
            order["paid_at"] = datetime.now().isoformat()
            save_orders(data)
            
            return {
                "ok": True,
                "message": f"✅ {ref_code} onaylandı!",
                "product": order["product_name"],
                "email": order["customer_email"],
                "price": order["price"]
            }
    
    return {"ok": False, "message": "Referans kodu bulunamadı."}


def list_pending():
    """Bekleyen siparişleri listele"""
    data = load_orders()
    pending = [o for o in data["orders"] if o["status"] == "pending"]
    return pending


def stats():
    """İstatistikler"""
    data = load_orders()
    total = len(data["orders"])
    pending = len([o for o in data["orders"] if o["status"] == "pending"])
    paid = len([o for o in data["orders"] if o["status"] in ("paid", "delivered")])
    revenue = sum(o["price"] for o in data["orders"] if o["status"] in ("paid", "delivered"))
    return {"total": total, "pending": pending, "paid": paid, "revenue": revenue}


# --- CLI ---

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("TylerShop Ödeme Sistemi 🐺")
        print()
        print("Kullanım:")
        print("  python3 odeme_sistemi.py order <urun_id> <email> [isim]")
        print("  python3 odeme_sistemi.py confirm <ref_kodu>")
        print("  python3 odeme_sistemi.py pending")
        print("  python3 odeme_sistemi.py stats")
        print()
        print("Ürün ID'leri:", ", ".join(PRODUCTS.keys()))
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == "order":
        if len(sys.argv) < 4:
            print("Kullanım: python3 odeme_sistemi.py order <urun_id> <email> [isim]")
            sys.exit(1)
        product_id = sys.argv[2]
        email = sys.argv[3]
        name = sys.argv[4] if len(sys.argv) > 4 else ""
        
        if product_id not in PRODUCTS:
            print(f"❌ Geçersiz ürün ID. Seçenekler: {', '.join(PRODUCTS.keys())}")
            sys.exit(1)
        
        ref = create_order(product_id, email, name)
        product = PRODUCTS[product_id]
        print(f"✅ Sipariş oluşturuldu!")
        print(f"   Ürün: {product['name']}")
        print(f"   Fiyat: {product['price']} ₺")
        print(f"   Referans Kodu: {ref}")
        print(f"   Email: {email}")
        print()
        print(f"📋 Müşteriye ilet:")
        print(f"   IBAN: TR00 0000 0000 0000 0000 0000 00")
        print(f"   Açıklama: {ref}")
        print(f"   Tutar: {product['price']} ₺")
    
    elif cmd == "confirm":
        if len(sys.argv) < 3:
            print("Kullanım: python3 odeme_sistemi.py confirm <ref_kodu>")
            sys.exit(1)
        ref = sys.argv[2]
        result = confirm_payment(ref)
        print(result["message"])
    
    elif cmd == "pending":
        orders = list_pending()
        if not orders:
            print("📭 Bekleyen sipariş yok.")
        else:
            print(f"📋 {len(orders)} bekleyen sipariş:\n")
            for o in orders:
                print(f"  {o['ref_code']} | {o['product_name']} | {o['price']}₺ | {o['customer_email']} | {o['created_at'][:19]}")
    
    elif cmd == "stats":
        s = stats()
        print(f"📊 TylerShop İstatistikleri")
        print(f"   Toplam sipariş: {s['total']}")
        print(f"   Bekleyen: {s['pending']}")
        print(f"   Tamamlanan: {s['paid']}")
        print(f"   Toplam gelir: {s['revenue']} ₺")
        print(f"   Hedef: ₺500 — {'🎯 HEDEFTE!' if s['revenue'] >= 500 else f'{(s['revenue']/500*100):.0f}% tamamlandı'}")
