// 日日好日 — Cart Drawer
// Design: Vacanza-inspired minimal slide-in cart
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Link } from "wouter";
import { toast } from "sonner"; // still used for remove toast

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, totalItems, totalPrice, clearCart } = useCart();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[oklch(0.93_0_0)]">
          <div>
            <p className="eyebrow">SHOPPING BAG</p>
            <h3 className="text-lg font-medium text-[oklch(0.1_0_0)] mt-0.5" style={{fontFamily: "'Noto Sans TC', 'Helvetica Neue', Helvetica, Arial, sans-serif"}}>
              購物袋 {totalItems > 0 && <span className="text-sm text-[oklch(0.55_0_0)]">({totalItems})</span>}
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-[oklch(0.4_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
              <ShoppingBag className="w-12 h-12 text-[oklch(0.85_0_0)]" strokeWidth={1} />
              <p className="text-sm font-body font-light text-[oklch(0.55_0_0)] text-center">
                你的購物袋是空的
              </p>
              <Link href="/products">
                <button
                  className="btn-primary text-xs"
                  onClick={() => setIsOpen(false)}
                >
                  開始選購
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[oklch(0.95_0_0)]">
              {items.map(({ id, product, quantity, unitPrice, wristSize, claspType, fitPreference }) => (
                <div key={id} className="flex gap-4 px-6 py-5">
                  {/* Image */}
                  <div className="w-20 h-24 bg-[oklch(0.97_0_0)] shrink-0 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body font-medium text-[oklch(0.1_0_0)] leading-snug mb-1">
                      {product.name}
                    </p>
                    <p className="text-[0.65rem] font-body text-[oklch(0.55_0_0)] mb-3">
                      {product.categoryLabel}
                    </p>
                    {(wristSize || claspType || fitPreference) && (
                      <p className="text-[0.65rem] font-body text-[oklch(0.45_0_0)] mb-2">
                        {wristSize ? `手圍 ${wristSize} cm` : ""}
                        {wristSize && claspType ? " · " : ""}
                        {claspType === "elastic" ? "彈力繩" : claspType === "lobster" ? "龍蝦扣" : claspType === "magnetic" ? "磁扣" : ""}
                        {(wristSize || claspType) && fitPreference ? " · " : ""}
                        {fitPreference === "just-right" ? "剛好" : fitPreference === "loose" ? "微鬆" : ""}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {/* Qty */}
                      <div className="flex items-center border border-[oklch(0.9_0_0)]">
                        <button
                          onClick={() => updateQuantity(id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-[oklch(0.4_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
                          aria-label="減少"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-body">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(id, quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-[oklch(0.4_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
                          aria-label="增加"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs font-body font-medium text-[oklch(0.1_0_0)]">
                        NT$ {(unitPrice * quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => {
                      removeFromCart(id);
                      toast.success("已從購物袋移除");
                    }}
                    className="self-start p-1 text-[oklch(0.7_0_0)] hover:text-[oklch(0.1_0_0)] transition-colors"
                    aria-label="移除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[oklch(0.93_0_0)] px-6 py-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-body text-[oklch(0.55_0_0)] tracking-wide">小計</p>
              <p className="text-sm font-body font-medium text-[oklch(0.1_0_0)]">
                NT$ {totalPrice.toLocaleString()}
              </p>
            </div>
            <p className="text-[0.6rem] font-body text-[oklch(0.65_0_0)] mb-5">
              滿 NT$1,500 享免運費 · 運費 NT$80
            </p>
            <Link href="/checkout">
              <button
                onClick={() => setIsOpen(false)}
                className="btn-primary w-full justify-center"
              >
                前往結帳
              </button>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="btn-ghost w-full justify-center mt-3"
            >
              繼續購物
            </button>
          </div>
        )}
      </div>
    </>
  );
}
