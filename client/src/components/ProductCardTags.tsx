/** 商品卡標籤：全部以 ✦ 前綴排成一行，超出寬度時可左右滑動 */
export default function ProductCardTags({ product, className = "" }: { product: { tags: string[] }; className?: string }) {
  const tags = product.tags.map((tag) => tag.trim()).filter(Boolean);
  if (tags.length === 0) return null;

  return (
    <div
      className={`scrollbar-hide mb-1.5 flex max-w-full items-center gap-x-2.5 overflow-x-auto text-[0.62rem] tracking-[0.1em] text-sf-accent ${className}`}
      // 卡片本身是連結，讓橫向滑動不會被當成點擊
      onClick={(event) => event.stopPropagation()}
    >
      {tags.map((tag) => (
        <span key={tag} className="shrink-0 whitespace-nowrap">
          <span className="mr-1 text-brand-peach" aria-hidden="true">✦</span>
          {tag}
        </span>
      ))}
    </div>
  );
}
