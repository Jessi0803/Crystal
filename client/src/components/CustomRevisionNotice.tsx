import { CUSTOM_REVISION_NOTICE } from "@/lib/customOrderingContent";

/**
 * 初版設計與修改注意事項；目前用於四份客製表單的開頭說明。
 *
 * 文案集中在 CUSTOM_REVISION_NOTICE，改文案只要改那裡。
 * 商品詳細頁的「注意事項」分欄不走這裡——那邊顯示的是後台各商品自填的
 * product.disclaimer。
 */
export default function CustomRevisionNotice() {
  const { title, lead, leadNote, groups, warning, footer } = CUSTOM_REVISION_NOTICE;

  return (
    <div className="space-y-4 text-[0.8125rem] font-body font-light leading-[1.8] tracking-wide text-sf-text">
      <p className="font-medium text-sf-ink">{title}</p>

      <div>
        <p className="font-medium text-sf-ink">{lead}</p>
        <p className="mt-1">{leadNote}</p>
      </div>

      {groups.map((group) => (
        <div key={group.heading}>
          <p className="mb-1 font-medium text-sf-text">{group.heading}</p>
          <ul className="ml-0.5 list-outside space-y-1 pl-4">
            {group.items.map((item) => (
              <li key={item} className="relative pl-3 before:absolute before:left-0 before:text-brand-peach before:content-['・']">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="border-l-2 border-brand-peach pl-3 text-xs leading-relaxed">{warning}</p>

      <p>{footer}</p>
    </div>
  );
}
